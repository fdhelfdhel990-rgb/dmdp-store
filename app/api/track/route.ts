import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";
import { uploadFile } from "@/lib/r2";

function normalizePhone(phone: string) { const digits = phone.replace(/\D/g, ""); return digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : `62${digits}`; }

export async function POST(request: Request) {
  const form = await request.formData();
  const orderNumber = String(form.get("order_number") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  if (!orderNumber || !phone) return NextResponse.json({ error: "Masukkan kode pesanan dan nomor WhatsApp." }, { status: 422 });
  try {
    const order = await db.order.findFirst({ where: { orderNumber, customer: { phone: normalizePhone(phone) } }, select: { orderNumber: true } });
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan untuk kode dan nomor WhatsApp tersebut." }, { status: 404 });
    const response = NextResponse.redirect(new URL(`/status-pesanan/${encodeURIComponent(order.orderNumber)}`, request.url), 303);
    response.cookies.set("dmt_verified_order", order.orderNumber, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 2 });
    return response;
  } catch {
    return NextResponse.json({ error: "Basis data belum dikonfigurasi untuk pelacakan pesanan." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const jar = await cookies();
  const verified = jar.get("dmt_verified_order")?.value;
  const body = await request.formData();
  const orderNumber = String(body.get("order_number") ?? "");
  const action = String(body.get("action") ?? "");
  if (!verified || verified !== orderNumber) return NextResponse.json({ error: "Verifikasi ulang pesanan melalui kode dan nomor WhatsApp." }, { status: 403 });
  try {
    const order = await db.order.findUnique({ where: { orderNumber: verified }, include: { payments: true } });
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    if (action === "approve" && order.status === "waiting_customer_approval" && ["down_payment", "full"].includes(String(body.get("payment_scheme")))) {
      const scheme = String(body.get("payment_scheme"));
      await db.$transaction([db.order.update({ where: { id: order.id }, data: { status: "waiting_payment", paymentScheme: scheme, customerApprovedAt: new Date(), revisionRequestedAt: null } }), db.orderStatusHistory.create({ data: { orderId: order.id, status: "waiting_payment", note: "Pelanggan menyetujui harga final." } }), db.activityLog.create({ data: { subjectType: "App\\Models\\Order", subjectId: order.id, event: "customer.approved_price", properties: { payment_scheme: scheme } } })]);
      return NextResponse.json({ message: "Harga disetujui. Silakan lanjutkan pembayaran." });
    }
    if (action === "revise" && order.status === "waiting_customer_approval" && String(body.get("revision_note") ?? "").trim() && String(body.get("revision_note")).length <= 1000) {
      const note = String(body.get("revision_note")).trim();
      await db.$transaction([db.order.update({ where: { id: order.id }, data: { status: "revision_requested", revisionRequestedAt: new Date(), customerNote: `${order.customerNote ?? ""}\n\nRevisi: ${note}`.trim() } }), db.orderStatusHistory.create({ data: { orderId: order.id, status: "revision_requested", note } }), db.activityLog.create({ data: { subjectType: "App\\Models\\Order", subjectId: order.id, event: "customer.requested_revision" } })]);
      return NextResponse.json({ message: "Permintaan revisi dikirim ke admin." });
    }
    if (action === "payment" && ["waiting_payment", "paid"].includes(order.status) && order.finalTotal !== null) {
      const method = String(body.get("method") ?? "");
      const paymentType = String(body.get("payment_type") ?? "");
      const proof = body.get("proof");
      const remaining = Math.max(0, Number(order.finalTotal) - Number(order.amountPaid));
      const validMethod = ["qris", "bank_transfer", "cash"].includes(method);
      const validType = ["down_payment", "full", "settlement"].includes(paymentType);
      if (!validMethod || !validType || remaining <= 0 || !(await db.paymentMethod.findFirst({ where: { type: method, isActive: true } }))) return NextResponse.json({ error: "Metode atau jenis pembayaran tidak tersedia." }, { status: 422 });
      if (paymentType === "down_payment" && Number(order.amountPaid) === 0 && Number(order.finalTotal) > 0 && remaining < Math.ceil(Number(order.finalTotal) / 2)) return NextResponse.json({error:"Pembayaran awal minimal 50% dari total final."},{status:422});
      const amount = paymentType === "down_payment" ? Math.min(remaining, Math.ceil(Number(order.finalTotal) / 2)) : remaining;
      if (amount <= 0) return NextResponse.json({ error: "Pesanan sudah lunas." }, { status: 422 });
      let proofFields = {};
      if (proof instanceof File && proof.size > 0) {
        if (proof.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "application/pdf"].includes(proof.type)) return NextResponse.json({ error: "Bukti pembayaran harus JPG, PNG, atau PDF dengan ukuran maksimal 5 MB." }, { status: 422 });
        const path = await uploadFile(`payment-proofs/${order.publicToken}/${Date.now()}-${proof.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`, proof);
        proofFields = { proofDisk: "r2", proofPath: path, proofOriginalName: proof.name, proofMimeType: proof.type, proofSize: BigInt(proof.size) };
      }
      const payment = await db.$transaction(async (tx) => {
        const created = await tx.payment.create({ data: { orderId: order.id, method, paymentType, amount, status: "pending", ...proofFields } });
        await tx.order.update({ where: { id: order.id }, data: { status: "payment_review", paymentScheme: paymentType } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "payment_review", note: "Bukti pembayaran menunggu verifikasi." } });
        await tx.activityLog.create({ data: { subjectType: "App\\Models\\Order", subjectId: order.id, event: "payment.submitted", properties: { payment_id: created.id.toString(), amount, method } } });
        return created;
      });
      return NextResponse.json({ paymentId: payment.id.toString(), message: "Pembayaran dikirim dan menunggu verifikasi admin." }, { status: 201 });
    }
    return NextResponse.json({ error: "Aksi belum tersedia untuk status pesanan ini." }, { status: 422 });
  } catch {
    return NextResponse.json({ error: "Perubahan pesanan belum dapat disimpan." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get("order_number");
  const jar = await cookies();
  if (orderNumber && jar.get("dmt_verified_order")?.value === orderNumber) return NextResponse.json({ orderNumber, verified: true });
  const session = readSession(jar.get("dmt_session")?.value);
  return NextResponse.json({ orderNumber, session: Boolean(session) });
}
