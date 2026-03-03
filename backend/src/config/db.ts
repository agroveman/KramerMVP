import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Check backend/.env");
}

const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });

