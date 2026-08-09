"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { classSchema } from "@/validations/schemas";

export async function createClass(formData: FormData) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const parsed = classSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/turmas?novo=1&erro=dados-invalidos");
  const data = parsed.data;
  const [community, stage] = await Promise.all([
    prisma.community.findFirst({ where: { id: data.communityId, parishId: data.parishId, deletedAt: null }, select: { id: true } }),
    prisma.stage.findFirst({ where: { id: data.stageId, sacramentId: data.sacramentId, deletedAt: null }, select: { id: true } }),
  ]);
  if (!community || !stage) redirect("/turmas?novo=1&erro=vinculos-invalidos");
  const item = await prisma.$transaction(async tx => {
    const created = await tx.class.create({ data: { ...data, expectedEndAt: data.expectedEndAt || null } });
    await tx.auditLog.create({ data: { userId: session.userId, action: "CREATE", entity: "Class", entityId: created.id, after: { name: created.name, year: created.year } } });
    return created;
  });
  redirect(`/turmas/${item.id}`);
}

export async function enrollStudent(classId: string, formData: FormData) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const catechumenId = String(formData.get("catechumenId") || "");
  if (!classId || !catechumenId) redirect(`/turmas/${classId}?erro=dados-invalidos`);
  try {
    await prisma.$transaction(async tx => {
      const [targetClass, catechumen, previous] = await Promise.all([
        tx.class.findFirst({ where: { id: classId, deletedAt: null, status: { in: ["ACTIVE", "PLANNED"] } }, include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } } }),
        tx.catechumen.findFirst({ where: { id: catechumenId, deletedAt: null }, select: { id: true } }),
        tx.enrollment.findFirst({ where: { catechumenId, status: "ACTIVE" }, select: { id: true, classId: true } }),
      ]);
      if (!targetClass || !catechumen) throw new Error("INVALID_TARGET");
      if (previous?.classId !== classId && targetClass._count.enrollments >= targetClass.capacity) throw new Error("CLASS_FULL");
      await tx.enrollment.updateMany({ where: { catechumenId, status: "ACTIVE", classId: { not: classId } }, data: { status: "TRANSFERRED", endedAt: new Date() } });
      await tx.enrollment.upsert({ where: { catechumenId_classId: { catechumenId, classId } }, create: { catechumenId, classId }, update: { status: "ACTIVE", endedAt: null, deletedAt: null } });
      await tx.catechumen.update({ where: { id: catechumenId }, data: { status: "ACTIVE" } });
      await tx.auditLog.create({ data: { userId: session.userId, action: previous && previous.classId !== classId ? "TRANSFER" : "ENROLL", entity: "Enrollment", entityId: classId, before: previous ? { classId: previous.classId } : Prisma.JsonNull, after: { catechumenId, classId } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const code = error instanceof Error ? error.message : "erro";
    redirect(`/turmas/${classId}?erro=${code === "CLASS_FULL" ? "turma-lotada" : "matricula"}`);
  }
  revalidatePath(`/turmas/${classId}`);
}

export async function assignCatechist(classId: string, formData: FormData) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const catechistId = String(formData.get("catechistId") || "");
  if (!classId || !catechistId) redirect(`/turmas/${classId}?erro=catequista`);
  const [targetClass, catechist] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, deletedAt: null }, select: { id: true } }),
    prisma.catechist.findFirst({ where: { id: catechistId, deletedAt: null, user: { active: true, deletedAt: null } }, select: { id: true, user: { select: { name: true } } } }),
  ]);
  if (!targetClass || !catechist) redirect(`/turmas/${classId}?erro=catequista`);
  await prisma.$transaction([
    prisma.classCatechist.upsert({ where: { classId_catechistId: { classId, catechistId } }, create: { classId, catechistId }, update: {} }),
    prisma.auditLog.create({ data: { userId: session.userId, action: "ASSIGN_CATECHIST", entity: "Class", entityId: classId, after: { catechistId, name: catechist.user.name } } }),
  ]);
  revalidatePath(`/turmas/${classId}`);
  redirect(`/turmas/${classId}?sucesso=catequista`);
}
