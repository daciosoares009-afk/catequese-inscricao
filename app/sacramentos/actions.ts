"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function createSacrament(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = z.object({ name: z.string().trim().min(3).max(100), description: z.string().trim().max(1000).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sacramentos?erro=dados-invalidos");
  await prisma.$transaction(async tx => {
    const item = await tx.sacrament.create({ data: { name: parsed.data.name, description: parsed.data.description || null } });
    await tx.auditLog.create({ data: { userId: session.userId, action: "CREATE", entity: "Sacrament", entityId: item.id, after: { name: item.name } } });
  });
  revalidatePath("/sacramentos");
}

export async function createStage(formData: FormData) {
  const session = await requireSession(["ADMIN"]);
  const parsed = z.object({ name: z.string().trim().min(2).max(100), sacramentId: z.string().min(1), order: z.coerce.number().int().min(0).max(100) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sacramentos?erro=dados-invalidos");
  const sacrament = await prisma.sacrament.findFirst({ where: { id: parsed.data.sacramentId, active: true, deletedAt: null }, select: { id: true } });
  if (!sacrament) redirect("/sacramentos?erro=sacramento-invalido");
  await prisma.$transaction(async tx => {
    const item = await tx.stage.create({ data: parsed.data });
    await tx.auditLog.create({ data: { userId: session.userId, action: "CREATE", entity: "Stage", entityId: item.id, after: { name: item.name, sacramentId: item.sacramentId } } });
  });
  revalidatePath("/sacramentos");
}
