import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/session";

export async function requireAdmin() {
  const userId = await currentAdmin();
  if (!userId) return { userId: null, error: NextResponse.json({ error: "Sesi admin tidak valid." }, { status: 401 }) };
  return { userId, error: null };
}
