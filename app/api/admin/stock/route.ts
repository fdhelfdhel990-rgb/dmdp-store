import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function GET() {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  try { const [products, movements] = await db.$transaction([db.product.findMany({ include: { category: true }, orderBy: { name: "asc" } }), db.inventoryMovement.findMany({ include: { product: true }, orderBy: { createdAt: "desc" }, take: 30 })]); return NextResponse.json({ products, movements }); }
  catch { return NextResponse.json({ error: "Data stok belum dapat dimuat." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const { productId, quantity:rawQuantity, note } = await request.json() as { productId?: string; quantity?: number|string; note?: string };
  const quantity=Number(rawQuantity);
  if (!productId || !Number.isInteger(quantity) || quantity === 0 || Math.abs(quantity ?? 0) > 100000||(note?.length??0)>1000) return NextResponse.json({ error: "Mutasi harus berupa angka bukan nol." }, { status: 422 });
  try {
    const movement = await db.$transaction(async (tx) => { const product = await tx.product.findUnique({ where: { id: BigInt(productId) } }); if (!product) throw new Error("Produk tidak ditemukan."); const updated = await tx.product.update({ where: { id: product.id }, data: { stockOnHand: product.stockOnHand + quantity! } }); return tx.inventoryMovement.create({ data: { product: { connect: { id: product.id } }, type: quantity! > 0 ? "manual_in" : "manual_out", quantity: quantity!, balanceAfter: updated.stockOnHand, reference: `manual:${randomUUID()}`, note: note ?? null } }); });
    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Mutasi stok gagal." }, { status: 422 }); }
}
