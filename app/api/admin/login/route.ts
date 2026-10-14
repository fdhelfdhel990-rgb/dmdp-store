import { jsonResponse } from "@/lib/api-response";
import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, sessionCookieName } from "@/lib/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return jsonResponse({ error: "Email dan kata sandi wajib diisi." }, { status: 422 });
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return NextResponse.redirect(new URL("/admin?error=session", request.url), 303);
  try {
    let user = await db.user.findUnique({ where: { email } });
    const envEmail = process.env.DMT_ADMIN_EMAIL?.trim().toLowerCase();
    const envPassword = process.env.DMT_ADMIN_PASSWORD;
    // Match the Laravel seeder when an explicit env-configured owner signs in.
    if (envEmail === email && envPassword && password === envPassword && (!user || !(await compare(password, user.password)) || !user.isAdmin || !user.isActive)) {
      const passwordHash = await hash(envPassword, 12);
      user = user
        ? await db.user.update({ where: { id: user.id }, data: { password: passwordHash, isAdmin: true, isActive: true, name: process.env.DMT_ADMIN_NAME?.trim() || user.name } })
        : await db.user.create({ data: { name: process.env.DMT_ADMIN_NAME?.trim() || "Owner Admin", email, password: passwordHash, isAdmin: true, role: "owner", isActive: true, emailVerifiedAt: new Date() } });
    }
    if (!user || !user.isAdmin || !user.isActive || !(await compare(password, user.password))) return NextResponse.redirect(new URL("/admin?error=credentials", request.url), 303);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const response = NextResponse.redirect(new URL("/admin/dashboard", request.url), 303);
    response.cookies.set(sessionCookieName, createSession(user.id.toString()), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/admin?error=configuration", request.url), 303);
  }
}
