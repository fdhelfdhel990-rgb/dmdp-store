import { NextResponse } from "next/server";

/** Serialize Prisma results safely; PostgreSQL BigInt IDs are returned as strings. */
export function jsonResponse(data: unknown, init?: ResponseInit) {
  const safeData = JSON.parse(JSON.stringify(data, (_key, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  )) as unknown;
  return NextResponse.json(safeData, init);
}
