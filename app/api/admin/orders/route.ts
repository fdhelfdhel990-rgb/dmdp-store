import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function GET(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  try {
    const orders = await db.order.findMany({ where: { ...(params.get("archived") === "true" ? { archivedAt: { not: null } } : { archivedAt: null }), ...(params.get("status") ? { status: params.get("status")! } : {}) }, include: { customer: true, items: true, payments: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ orders });
  } catch { return NextResponse.json({ error: "Data pesanan belum dapat dimuat." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const { orderNumber, action, finalTotal, shippingCost = 0, note } = await request.json() as { orderNumber?: string; action?: string; finalTotal?: number; shippingCost?: number; note?: string };
  if (!orderNumber) return NextResponse.json({ error: "Kode pesanan wajib diisi." }, { status: 422 });
  if((note?.length??0)>2000)return NextResponse.json({error:"Catatan terlalu panjang."},{status:422});
  try {
    const includeArchived = new URL(request.url).searchParams.get("archived") === "true";
    const order = await db.order.findUnique({ where: { orderNumber }, include: { items: true } });
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    if (action === "price" && !["cancelled","completed"].includes(order.status) && Number.isSafeInteger(finalTotal) && Number(finalTotal) > 0 && Number.isSafeInteger(shippingCost) && shippingCost >= 0) {
      const price = finalTotal!;
      const itemSubtotal = Math.max(0, price - shippingCost);
      const estimatedSubtotal = Math.max(1, Number(order.estimatedSubtotal));
      const updated = await db.$transaction(async (tx) => { const result = await tx.order.update({ where: { id: order.id }, data: { finalTotal: price, shippingCost, estimatedTotal: Number(order.estimatedSubtotal) + shippingCost, paymentScheme: null, status: "waiting_customer_approval", finalPricedAt: new Date(), assignedAdminId: BigInt(auth.userId!), internalNote: note ?? null } }); for (const item of order.items) { const finalSubtotal = Math.round(itemSubtotal * Number(item.subtotal) / estimatedSubtotal); await tx.orderItem.update({ where: { id: item.id }, data: { unitFinalPrice: Math.ceil(finalSubtotal / Math.max(1, item.quantity)), finalSubtotal } }); } await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "waiting_customer_approval", note: "Harga final ditetapkan admin.", userId: BigInt(auth.userId!) } }); await tx.activityLog.create({ data: { subjectType: "App\\Models\\Order", subjectId: order.id, userId: BigInt(auth.userId!), event: "price.finalized", properties: { final_total: price, shipping_cost: shippingCost } } }); return result; });
      return NextResponse.json({ order: updated });
    }
    if (action === "production" && order.status === "paid") {
      if (order.amountPaid < (order.finalTotal ?? order.estimatedTotal)) return NextResponse.json({ error: "Pembayaran pesanan belum lunas." }, { status: 422 });
      await db.$transaction(async (tx) => {
        for (const item of order.items) {
          if (!item.productId || item.stockDeductedAt) continue;
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;
          const updatedProduct = await tx.product.update({ where: { id: product.id }, data: { stockOnHand: product.stockOnHand - item.quantity } });
          const reference = `order-item:${item.id}:production`;
          if (!(await tx.inventoryMovement.findUnique({ where: { reference } }))) await tx.inventoryMovement.create({ data: { product: { connect: { id: product.id } }, orderItem: { connect: { id: item.id } }, type: "production_usage", quantity: -item.quantity, balanceAfter: updatedProduct.stockOnHand, reference, note: `Pemakaian stok untuk ${order.orderNumber}` } });
          await tx.orderItem.update({ where: { id: item.id }, data: { stockDeductedAt: new Date() } });
        }
        await tx.order.update({ where: { id: order.id }, data: { status: "production", productionStartedAt: order.productionStartedAt ?? new Date(), assignedAdminId: BigInt(auth.userId!) } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "production", note: "Pesanan masuk produksi.", userId: BigInt(auth.userId!) } });
        await tx.activityLog.create({ data: { subjectType: "App\\Models\\Order", subjectId: order.id, event: "production.started", userId: BigInt(auth.userId!) } });
      });
      return NextResponse.json({ message: "Produksi dimulai." });
    }
    if (action === "status" && ["ready", "completed", "cancelled"].includes(note ?? "")) {
      const next = note!;
      if (next === "ready" && order.status !== "production") return NextResponse.json({ error: "Produksi harus dimulai sebelum pesanan siap." }, { status: 422 });
      if (next === "completed" && order.status !== "ready") return NextResponse.json({ error: "Pesanan hanya dapat diselesaikan setelah siap." }, { status: 422 });
      await db.$transaction(async (tx) => { await tx.order.update({ where: { id: order.id }, data: { status: next, ...(next === "ready" ? { readyAt: order.readyAt ?? new Date() } : {}), ...(next === "completed" ? { completedAt: order.completedAt ?? new Date() } : {}), ...(next === "cancelled" ? { cancelledAt: order.cancelledAt ?? new Date() } : {}) } }); await tx.orderStatusHistory.create({ data: { orderId: order.id, status: next, note: next === "ready" ? "Pesanan siap diserahkan." : next === "completed" ? "Pesanan selesai." : `Status diperbarui menjadi ${next}.`, userId: BigInt(auth.userId!) } }); await tx.activityLog.create({ data: { subjectType: "App\\Models\\Order", subjectId: order.id, event: `order.${next}`, userId: BigInt(auth.userId!) } }); });
      return NextResponse.json({ message: "Status pesanan diperbarui." });
    }
    if (action === "archive" || action === "restore") { if (action === "restore" && !includeArchived) return NextResponse.json({ error: "Pesanan arsip harus dibuka melalui daftar arsip." }, { status: 422 }); await db.order.update({ where: { id: order.id }, data: { archivedAt: action === "archive" ? new Date() : null, archivedBy: action === "archive" ? BigInt(auth.userId!) : null } }); return NextResponse.json({ message: "Arsip pesanan diperbarui." }); }
    return NextResponse.json({ error: "Aksi tidak sesuai dengan status pesanan." }, { status: 422 });
  } catch { return NextResponse.json({ error: "Perubahan pesanan gagal disimpan." }, { status: 503 }); }
}
