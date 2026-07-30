import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function applicationDatabaseUrl() {
  const configured = process.env.DATABASE_URL;
  if (!configured) return undefined;

  const url = new URL(configured);
  if (url.searchParams.get("pgbouncer") === "true") {
    url.searchParams.set("connection_limit", process.env.DATABASE_CONNECTION_LIMIT || "5");
    url.searchParams.set("pool_timeout", process.env.DATABASE_POOL_TIMEOUT || "30");
  }
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: applicationDatabaseUrl(),
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
