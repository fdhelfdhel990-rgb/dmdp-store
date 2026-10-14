import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function GET() {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  try { const categories = await db.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { sortOrder: "asc" } }); return NextResponse.json({ categories }); }
  catch { return NextResponse.json({ error: "Kategori belum dapat dimuat." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const body = await request.json() as { name?: string; description?: string; sortOrder?: number|string; isActive?: boolean; isFeatured?: boolean; action?:string };
  const sortOrder=Number(body.sortOrder??0);
  if (!body.name?.trim()||body.name.length>255||!Number.isInteger(sortOrder)||sortOrder<0) return NextResponse.json({ error: "Nama kategori dan urutan wajib valid." }, { status: 422 });
  try { const category = await db.category.create({ data: { name: body.name.trim(), slug: slugify(body.name), description: body.description, sortOrder, isActive: body.isActive ?? true, isFeatured: body.isFeatured ?? false, ...(body.action==="restore"?{archivedAt:null}:{}) } }); return NextResponse.json({ category }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Kategori gagal dibuat. Periksa nama yang duplikat." }, { status: 422 }); }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const body = await request.json() as { id?: string; name?: string; description?: string; sortOrder?: number; isActive?: boolean; isFeatured?: boolean; action?: string };
  if (!body.id) return NextResponse.json({ error: "ID kategori wajib diisi." }, { status: 422 });
  if(body.name!==undefined&&(!body.name.trim()||body.name.length>255)||body.sortOrder!==undefined&&(!Number.isInteger(body.sortOrder)||body.sortOrder<0))return NextResponse.json({error:"Nama atau urutan kategori tidak valid."},{status:422});
  try { const category = await db.category.update({ where: { id: BigInt(body.id) }, data: { ...(body.name ? { name: body.name.trim(), slug: slugify(body.name) } : {}), ...(body.description !== undefined ? { description: body.description } : {}), ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}), ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}), ...(body.isActive !== undefined ? { isActive: body.isActive } : {}), ...(body.action === "archive" ? { archivedAt: new Date(), isActive: false } : {}), ...(body.action === "restore" ? { archivedAt: null, isActive: true } : {}) } }); return NextResponse.json({ category }); }
  catch { return NextResponse.json({ error: "Kategori gagal diperbarui." }, { status: 422 }); }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "ID kategori wajib diisi." }, { status: 422 });
  try { const category = await db.category.update({ where: { id: BigInt(id) }, data: { isActive: false, archivedAt: new Date() } }); return NextResponse.json({ category }); }
  catch { return NextResponse.json({ error: "Kategori tidak dapat diarsipkan." }, { status: 422 }); }
}
