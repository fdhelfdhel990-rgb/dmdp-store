import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentAdmin, sessionCookieName } from "@/lib/session";

export async function GET() {
  const userId = await currentAdmin();
  if (!userId) return NextResponse.json({ error: "Sesi admin tidak valid." }, { status: 401 });
  try {
    const user = await db.user.findUnique({ where: { id: BigInt(userId) }, select: { id: true, name: true, email: true, isAdmin: true, isActive: true } });
    if (!user?.isAdmin || !user.isActive) return NextResponse.json({ error: "Akses admin tidak aktif." }, { status: 403 });
    return NextResponse.json({ id: user.id.toString(), name: user.name, email: user.email });
  } catch { return NextResponse.json({ error: "Basis data belum dikonfigurasi." }, { status: 503 }); }
}

export async function POST() {
  await (await cookies()).delete(sessionCookieName);
  return NextResponse.redirect(new URL("/admin", process.env.APP_URL ?? "http://localhost:3000"), 303);
}
