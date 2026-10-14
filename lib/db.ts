import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!databaseUrl) throw new Error("DATABASE_URL atau DIRECT_URL belum diatur. Isi variabel database di file .env.");

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
