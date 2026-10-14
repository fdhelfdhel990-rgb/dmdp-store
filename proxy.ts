import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/session";

export function proxy(request: NextRequest) {
  const session = readSession(request.cookies.get("dmt_session")?.value);
  const isAdminPage = request.nextUrl.pathname.startsWith("/admin/") && request.nextUrl.pathname !== "/admin/";
  if (isAdminPage && !session) return NextResponse.redirect(new URL("/admin", request.url));
  if (request.nextUrl.pathname === "/admin" && session) return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
