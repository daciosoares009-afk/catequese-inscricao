"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const schema = z.object({ name: z.string().trim().min(3).max(120), email: z.email().transform(x => x.toLowerCase()), password: z.string().min(10).max(128), role: z.enum(["ADMIN", "COORDINATOR", "CATECHIST"]), phone: z.string().trim().max(30).optional() });
export async function createUser(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/usuarios?novo=1&erro=dados-invalidos");
  const data = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) redirect("/usuarios?novo=1&erro=email-existente");
  await prisma.$transaction(async tx => {
    const user = await tx.user.create({ data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), role: data.role, catechist: data.role === "CATECHIST" ? { create: { phone: data.phone || null } } : undefined } });
    await tx.auditLog.create({ data: { userId: session.userId, action: "CREATE", entity: "User", entityId: user.id, after: { name: user.name, email: user.email, role: user.role } } });
  });
  revalidatePath("/usuarios");
}
