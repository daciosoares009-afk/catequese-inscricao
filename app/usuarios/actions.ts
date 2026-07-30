"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidateSessionUser, requireSession } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.email().transform(value => value.toLowerCase()),
  password: z.string().min(12).max(128),
  role: z.enum(["ADMIN", "COORDINATOR", "CATECHIST"]),
  phone: z.string().trim().max(30).optional(),
});

export async function createUser(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/usuarios?novo=1&erro=dados-invalidos");
  const data = parsed.data;
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) redirect("/usuarios?novo=1&erro=email-existente");

  await prisma.$transaction(async tx => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 12),
        role: data.role,
        catechist:
          data.role === "CATECHIST"
            ? { create: { phone: data.phone || null } }
            : undefined,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE",
        entity: "User",
        entityId: user.id,
        after: { name: user.name, email: user.email, role: user.role },
      },
    });
  });
  redirect("/usuarios?sucesso=criado");
}

export async function toggleUserActive(id: string) {
  const session = await requireSession(["ADMIN"]);
  if (id === session.userId) redirect("/usuarios?erro=proprio-usuario");
  const target = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, active: true, role: true },
  });
  if (!target) redirect("/usuarios?erro=nao-encontrado");
  if (target.active && target.role === "ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", active: true, deletedAt: null },
    });
    if (activeAdmins <= 1) redirect("/usuarios?erro=ultimo-admin");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { active: !target.active } }),
    prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: target.active ? "BLOCK" : "UNBLOCK",
        entity: "User",
        entityId: id,
        before: { active: target.active },
        after: { active: !target.active },
      },
    }),
  ]);
  invalidateSessionUser(id);
  redirect("/usuarios?sucesso=status");
}

export async function resetUserPassword(id: string, formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = z.object({ password: z.string().min(12).max(128) }).safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) redirect("/usuarios?erro=senha-invalida");
  const target = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!target) redirect("/usuarios?erro=nao-encontrado");
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "RESET_PASSWORD",
        entity: "User",
        entityId: id,
      },
    }),
  ]);
  redirect("/usuarios?sucesso=senha");
}
