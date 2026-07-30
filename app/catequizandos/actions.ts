"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechumenSchema } from "@/validations/schemas";

export async function createCatechumen(formData: FormData) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const parsed = catechumenSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/catequizandos/novo?erro=dados-invalidos");
  const data = parsed.data;
  if (data.communityId) {
    const community = await prisma.community.findFirst({ where: { id: data.communityId, parishId: data.parishId || undefined, deletedAt: null }, select: { id: true, parishId: true } });
    if (!community || (data.parishId && community.parishId !== data.parishId)) redirect("/catequizandos/novo?erro=comunidade-invalida");
  }
  const item = await prisma.$transaction(async tx => {
    const created = await tx.catechumen.create({ data: { ...data, parishId: data.parishId || null, communityId: data.communityId || null, qrCode: { create: { token: randomBytes(32).toString("base64url") } } } });
    await tx.auditLog.create({ data: { userId: session.userId, action: "CREATE", entity: "Catechumen", entityId: created.id, after: { fullName: created.fullName, status: created.status, communityId: created.communityId } } });
    return created;
  });
  redirect(`/catequizandos/${item.id}?sucesso=cadastrado`);
}

export async function archiveCatechumen(id: string) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const before = await prisma.catechumen.findFirst({ where: { id, deletedAt: null } });
  if (!before) return;
  await prisma.$transaction([
    prisma.catechumen.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } }),
    prisma.enrollment.updateMany({ where: { catechumenId: id, status: "ACTIVE" }, data: { status: "DROPOUT", endedAt: new Date() } }),
    prisma.qRCodeToken.updateMany({ where: { catechumenId: id }, data: { active: false } }),
    prisma.auditLog.create({ data: { userId: session.userId, action: "SOFT_DELETE", entity: "Catechumen", entityId: id, before: { fullName: before.fullName, status: before.status }, after: { status: "INACTIVE" } } }),
  ]);
  revalidatePath("/catequizandos");
}

export async function regenerateQr(id: string) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const catechumen = await prisma.catechumen.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!catechumen) redirect("/catequizandos?erro=nao-encontrado");
  await prisma.$transaction([
    prisma.qRCodeToken.upsert({ where: { catechumenId: id }, create: { catechumenId: id, token: randomBytes(32).toString("base64url") }, update: { token: randomBytes(32).toString("base64url"), generatedAt: new Date(), active: true, expiresAt: null } }),
    prisma.auditLog.create({ data: { userId: session.userId, action: "REGENERATE_QR", entity: "Catechumen", entityId: id } }),
  ]);
  revalidatePath(`/catequizandos/${id}`);
}
