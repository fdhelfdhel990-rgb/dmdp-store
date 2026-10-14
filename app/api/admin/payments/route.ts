import { jsonResponse } from "@/lib/api-response";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function PATCH(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const { paymentId, action, note } = await request.json() as { paymentId?: string; action?: string; note?: string };
  if (!paymentId || !["verify", "reject", "cancel-verification"].includes(action ?? "")) return jsonResponse({ error: "Aksi pembayaran tidak valid." }, { status: 422 });
  try {
    const id = BigInt(paymentId);
    const payment = await db.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) return jsonResponse({ error: "Pembayaran tidak ditemukan." }, { status: 404 });
    if (action === "reject") {
      if(payment.status==="verified") return jsonResponse({error:"Batalkan verifikasi sebelum menolak pembayaran."},{status:422});
      await db.$transaction(async(tx)=>{await tx.payment.update({where:{id},data:{status:"rejected",rejectedAt:new Date(),verifiedBy:null,verifiedAt:null,adminNote:note??null}});await tx.order.update({where:{id:payment.orderId},data:{status:"waiting_payment"}});await tx.orderStatusHistory.create({data:{orderId:payment.orderId,status:"waiting_payment",note:note||"Pembayaran ditolak admin.",userId:BigInt(auth.userId!)}});await tx.activityLog.create({data:{subjectType:"App\\Models\\Order",subjectId:payment.orderId,event:"payment.rejected",properties:{payment_id:id.toString()},userId:BigInt(auth.userId!)}});});
      return jsonResponse({message:"Bukti pembayaran ditolak."});
    }
    if (action === "cancel-verification" && payment.status === "verified") {
      await db.$transaction(async(tx)=>{const order=await tx.order.findUniqueOrThrow({where:{id:payment.orderId}});await tx.order.update({where:{id:order.id},data:{amountPaid:Math.max(0,Number(order.amountPaid)-Number(payment.amount)),status:"waiting_payment"}});await tx.payment.update({where:{id},data:{status:"pending",verifiedAt:null,verifiedBy:null,adminNote:note??null}});await tx.orderStatusHistory.create({data:{orderId:order.id,status:"waiting_payment",note:"Verifikasi pembayaran dibatalkan.",userId:BigInt(auth.userId!)}});const cashbook=await tx.cashbookEntry.findFirst({where:{paymentId:id}});if(cashbook&&!cashbook.reversedAt)await tx.cashbookEntry.update({where:{id:cashbook.id},data:{reversedAt:new Date(),reference:`${cashbook.reference}:reversed:${randomUUID()}`}});});
      return jsonResponse({message:"Verifikasi pembayaran dibatalkan."});
    }
    if (action === "verify") {
      if (payment.status !== "pending") return jsonResponse({ error: "Hanya pembayaran yang menunggu verifikasi dapat diproses." }, { status: 422 });
      await db.$transaction(async (tx) => {
        const currentPayment = await tx.payment.findUniqueOrThrow({where:{id}});
        if(currentPayment.status!=="pending")throw new Error("Pembayaran sudah diproses admin lain.");
        const currentOrder = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
        if (!["payment_review", "waiting_payment", "paid"].includes(currentOrder.status)) throw new Error("Status pesanan tidak dapat menerima pembayaran ini.");
        const updatedPaid = Number(currentOrder.amountPaid) + Number(payment.amount);
        const fullyPaid = payment.order.finalTotal !== null && updatedPaid >= Number(payment.order.finalTotal);
        await tx.payment.update({ where: { id }, data: { status: "verified", verifiedAt: new Date(), verifiedBy: BigInt(auth.userId!), adminNote: note ?? null } });
        await tx.order.update({ where: { id: payment.orderId }, data: { amountPaid: updatedPaid, status: fullyPaid ? "paid" : "waiting_payment" } });
        await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, status: fullyPaid ? "paid" : "waiting_payment", note: "Pembayaran telah diverifikasi admin.", userId: BigInt(auth.userId!) } });
        const existingEntry = await tx.cashbookEntry.findFirst({ where: { paymentId: id } });
        if (!existingEntry) await tx.cashbookEntry.create({ data: { direction: "income", category: "payment", source: "automatic", amount: payment.amount, reference: `payment:${id}`, orderId: payment.orderId, paymentId: id, note: "Pembayaran pelanggan terverifikasi.", entryDate: new Date() } });
      });
      return jsonResponse({ message: "Pembayaran diverifikasi." });
    }
    return jsonResponse({ error: "Aksi pembayaran tidak sesuai dengan status saat ini." }, { status: 422 });
  } catch { return jsonResponse({ error: "Pembayaran belum dapat diperbarui." }, { status: 503 }); }
}
