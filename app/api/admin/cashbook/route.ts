import { jsonResponse } from "@/lib/api-response";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function GET() {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  try { const entries = await db.cashbookEntry.findMany({ where: { source: "manual", archivedAt: null }, orderBy: { entryDate: "desc" }, take: 200 }); const [cashIn, cashOut] = await Promise.all([db.cashbookEntry.aggregate({ where: { source: "manual", archivedAt: null, direction: "income" }, _sum: { amount: true } }), db.cashbookEntry.aggregate({ where: { source: "manual", archivedAt: null, direction: "expense" }, _sum: { amount: true } })]); return jsonResponse({ entries, cashIn: Number(cashIn._sum.amount ?? 0), cashOut: Number(cashOut._sum.amount ?? 0) }); }
  catch { return jsonResponse({ error: "Buku kas belum dapat dimuat." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const body = await request.json() as { entryDate?: string; direction?: string; category?: string; paymentMethod?: string; amount?: number|string; reference?: string; note?: string };
  const amount=Number(body.amount);
  if (!body.entryDate||Number.isNaN(Date.parse(body.entryDate))||!["income", "expense"].includes(body.direction ?? "") || !body.category?.trim()||body.category.length>100 || !Number.isSafeInteger(amount) || amount <= 0|| (body.reference?.length??0)>120||(body.note?.length??0)>1000) return jsonResponse({ error: "Tanggal, arah transaksi, kategori, dan nominal harus diisi dengan benar." }, { status: 422 });
  try { const entry = await db.cashbookEntry.create({ data: { entryDate: new Date(body.entryDate), direction: body.direction!, category: body.category!.trim(), source: "manual", paymentMethod: body.paymentMethod ?? null, amount, reference: body.reference?.trim() || `KAS-${Date.now()}-${randomBytes(2).toString("hex").toUpperCase()}`, note: body.note ?? null } }); return jsonResponse({ entry }, { status: 201 }); }
  catch { return jsonResponse({ error: "Transaksi kas gagal disimpan. Referensi harus unik." }, { status: 422 }); }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const body = await request.json() as { id?: string; entryDate?: string; direction?: string; category?: string; paymentMethod?: string; amount?: number|string; reference?: string; note?: string; action?: string };
  if (!body.id) return jsonResponse({ error: "ID transaksi wajib diisi." }, { status: 422 });
  const amount=body.amount===undefined?undefined:Number(body.amount);
  if(amount!==undefined&&(!Number.isSafeInteger(amount)||amount<1)||body.direction&&!['income','expense'].includes(body.direction)||body.category!==undefined&&!body.category.trim()||body.reference!==undefined&&body.reference.length>120||body.note!==undefined&&body.note.length>1000)return jsonResponse({error:"Data transaksi kas tidak valid."},{status:422});
  try { const entry = await db.cashbookEntry.update({ where: { id: BigInt(body.id), source: "manual" }, data: body.action === "archive" ? { archivedAt: new Date() } : { ...(body.entryDate ? { entryDate: new Date(body.entryDate) } : {}), ...(body.direction ? { direction: body.direction } : {}), ...(body.category ? { category: body.category } : {}), ...(body.paymentMethod !== undefined ? { paymentMethod: body.paymentMethod } : {}), ...(amount !== undefined ? { amount } : {}), ...(body.reference ? { reference: body.reference } : {}), ...(body.note !== undefined ? { note: body.note } : {}) } }); return jsonResponse({ entry }); }
  catch { return jsonResponse({ error: "Transaksi kas tidak dapat diperbarui." }, { status: 422 }); }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id"); if (!id) return jsonResponse({ error: "ID transaksi wajib diisi." }, { status: 422 });
  try { const entry = await db.cashbookEntry.update({ where: { id: BigInt(id), source: "manual" }, data: { archivedAt: new Date() } }); return jsonResponse({ entry }); }
  catch { return jsonResponse({ error: "Transaksi kas tidak dapat diarsipkan." }, { status: 422 }); }
}
