import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: migrationUrl(),
  },
});

function migrationUrl() {
  const value = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!value) throw new Error("DATABASE_URL atau DIRECT_URL belum diatur. Isi variabel database di file .env.");
  return value;
}
