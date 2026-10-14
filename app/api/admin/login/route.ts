import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, sessionCookieName } from "@/lib/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return NextResponse.json({ error: "Email dan kata sandi wajib diisi." }, { status: 422 });
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.isAdmin || !user.isActive || !(await compare(password, user.password))) return NextResponse.json({ error: "Email atau kata sandi tidak sesuai." }, { status: 401 });
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const response = NextResponse.redirect(new URL("/admin/dashboard", request.url), 303);
    response.cookies.set(sessionCookieName, createSession(user.id.toString()), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/admin?error=database", request.url), 303);
  }
}
