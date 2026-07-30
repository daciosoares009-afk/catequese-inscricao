"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function createParish(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = z.object({
    name: z.string().trim().min(3).max(160),
    city: z.string().trim().min(2).max(120),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/configuracoes?erro=paroquia");
  const existing = await prisma.parish.findFirst({
    where: { name: parsed.data.name, city: parsed.data.city, deletedAt: null },
    select: { id: true },
  });
  if (existing) redirect("/configuracoes?erro=paroquia-existente");
  await prisma.$transaction(async tx => {
    const item = await tx.parish.create({ data: parsed.data });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE",
        entity: "Parish",
        entityId: item.id,
        after: parsed.data,
      },
    });
  });
  redirect("/configuracoes?sucesso=paroquia");
}

export async function createCommunity(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = z.object({
    name: z.string().trim().min(3).max(160),
    parishId: z.string().min(1),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/configuracoes?erro=comunidade");
  const parish = await prisma.parish.findFirst({
    where: { id: parsed.data.parishId, deletedAt: null },
    select: { id: true },
  });
  if (!parish) redirect("/configuracoes?erro=comunidade");
  const existing = await prisma.community.findFirst({
    where: {
      name: parsed.data.name,
      parishId: parsed.data.parishId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (existing) redirect("/configuracoes?erro=comunidade-existente");
  await prisma.$transaction(async tx => {
    const item = await tx.community.create({ data: parsed.data });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE",
        entity: "Community",
        entityId: item.id,
        after: parsed.data,
      },
    });
  });
  redirect("/configuracoes?sucesso=comunidade");
}

export async function changeOwnPassword(formData: FormData) {
  const session = await requireSession();
  const parsed = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12).max(128),
    confirmation: z.string().min(12).max(128),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.newPassword !== parsed.data.confirmation) {
    redirect("/configuracoes?erro=senha");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    redirect("/configuracoes?erro=senha-atual");
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CHANGE_PASSWORD",
        entity: "User",
        entityId: session.userId,
      },
    }),
  ]);
  redirect("/configuracoes?sucesso=senha");
}
