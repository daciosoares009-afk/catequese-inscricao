import { prisma } from "@/lib/prisma";

export async function audit(input: { userId?: string; action: string; entity: string; entityId?: string; before?: object; after?: object; ip?: string }) {
  await prisma.auditLog.create({ data: input });
}
