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
  const item = await prisma.$transaction(async tx => {
    const targetClass = await tx.class.findFirst({
      where: {
        id: data.classId,
        sacramentId: data.sacramentId,
        deletedAt: null,
        status: { in: ["ACTIVE", "PLANNED"] },
      },
      include: {
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    });
    if (!targetClass) throw new Error("INVALID_CLASS");
    if (targetClass._count.enrollments >= targetClass.capacity) {
      throw new Error("CLASS_FULL");
    }
    const created = await tx.catechumen.create({
      data: {
        fullName: data.fullName,
        status: "ACTIVE",
        parishId: targetClass.parishId,
        communityId: targetClass.communityId,
        qrCode: { create: { token: randomBytes(32).toString("base64url") } },
      },
    });
    await tx.enrollment.create({
      data: { catechumenId: created.id, classId: targetClass.id },
    });
    await tx.auditLog.create({ data: { userId: session.userId, action: "CREATE", entity: "Catechumen", entityId: created.id, after: { fullName: created.fullName, status: created.status, classId: targetClass.id, sacramentId: data.sacramentId, communityId: created.communityId } } });
    return created;
  }).catch(error => {
    const code = error instanceof Error ? error.message : "INVALID_CLASS";
    redirect(`/catequizandos/novo?erro=${code === "CLASS_FULL" ? "turma-lotada" : "vinculos-invalidos"}`);
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
  redirect("/catequizandos?sucesso=arquivado");
}

export async function updateCatechumenName(id: string, formData: FormData) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const parsed = catechumenSchema.pick({ fullName: true }).safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) redirect(`/catequizandos/${id}?erro=nome-invalido`);
  const before = await prisma.catechumen.findFirst({
    where: { id, deletedAt: null },
    select: { fullName: true },
  });
  if (!before) redirect("/catequizandos?erro=nao-encontrado");
  await prisma.$transaction([
    prisma.catechumen.update({
      where: { id },
      data: { fullName: parsed.data.fullName },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE",
        entity: "Catechumen",
        entityId: id,
        before,
        after: { fullName: parsed.data.fullName },
      },
    }),
  ]);
  revalidatePath(`/catequizandos/${id}`);
  revalidatePath("/catequizandos");
  redirect(`/catequizandos/${id}?sucesso=atualizado`);
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
