import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function POST(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const body = await request.json() as { name?: string; email?: string; password?: string; role?: string };
  if (!body.name?.trim() || !body.email?.includes("@") || (body.password?.length ?? 0) < 8 || !["owner","admin","production","finance"].includes(body.role ?? "admin")) return NextResponse.json({ error: "Nama, email, role, dan kata sandi minimal 8 karakter wajib valid." }, { status: 422 });
  try { const user = await db.user.create({ data: { name: body.name.trim(), email: body.email.trim().toLowerCase(), password: await hash(body.password!, 12), isAdmin: true, role: body.role ?? "admin", isActive: true } }); return NextResponse.json({ id: user.id.toString(), name: user.name, email: user.email }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Akun admin gagal dibuat. Email mungkin sudah digunakan." }, { status: 422 }); }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const body = await request.json() as { id?: string; name?: string; email?: string; role?: string; isActive?: boolean; password?: string };
  if (!body.id) return NextResponse.json({ error: "ID admin wajib diisi." }, { status: 422 });
  if (body.id === auth.userId && body.isActive === false) return NextResponse.json({ error: "Akun yang sedang digunakan tidak dapat dinonaktifkan." }, { status: 422 });
  if (body.role && !["owner","admin","production","finance"].includes(body.role)) return NextResponse.json({ error: "Role admin tidak valid." }, { status: 422 });
  if(body.name!==undefined&&(!body.name.trim()||body.name.length>255)||body.email!==undefined&&(!body.email.includes("@")||body.email.length>255)||body.password!==undefined&&body.password.length<8)return NextResponse.json({error:"Nama, email, atau kata sandi tidak valid."},{status:422});
  try { const user = await db.user.update({ where: { id: BigInt(body.id), isAdmin: true }, data: { ...(body.name ? { name: body.name.trim() } : {}), ...(body.email ? { email: body.email.trim().toLowerCase() } : {}), ...(body.role ? { role: body.role } : {}), ...(body.isActive !== undefined ? { isActive: body.isActive } : {}), ...(body.password ? { password: await hash(body.password, 12) } : {}) }, select: { id: true, name: true, email: true, role: true, isActive: true } }); return NextResponse.json({ user }); }
  catch { return NextResponse.json({ error: "Admin tidak dapat diperbarui." }, { status: 422 }); }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID admin wajib diisi." }, { status: 422 });
  if (id === auth.userId) return NextResponse.json({ error: "Akun yang sedang digunakan tidak dapat dihapus." }, { status: 422 });
  try { const user = await db.user.update({ where: { id: BigInt(id), isAdmin: true }, data: { isActive: false }, select: { id: true, email: true, isActive: true } }); return NextResponse.json({ user }); }
  catch { return NextResponse.json({ error: "Admin tidak dapat dihapus." }, { status: 422 }); }
}
