"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { meetingSchema } from "@/validations/schemas";

export async function createMeeting(formData: FormData) {
  const session = await requireSession();
  const parsed = meetingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/encontros?novo=1&erro=dados-invalidos");
  const data = parsed.data;
  if (!(await canAccessClass(session, data.classId))) redirect("/encontros?erro=sem-permissao");
  const meeting = await prisma.$transaction(async tx => {
    const created = await tx.meeting.create({ data: { ...data, endTime: data.endTime || null, content: data.content || null, notes: data.notes || null, responsibleId: session.userId } });
    await tx.auditLog.create({ data: { userId: session.userId, action: "CREATE", entity: "Meeting", entityId: created.id, after: { classId: created.classId, theme: created.theme, date: created.date.toISOString() } } });
    return created;
  });
  redirect(`/presencas/${meeting.id}`);
}

export async function closeMeeting(id: string) {
  const session = await requireSession();
  const meeting = await prisma.meeting.findFirst({ where: { id, deletedAt: null }, select: { id: true, classId: true, status: true } });
  if (!meeting || !(await canAccessClass(session, meeting.classId))) redirect("/encontros?erro=sem-permissao");
  if (meeting.status === "CANCELLED") redirect(`/presencas/${id}?erro=cancelado`);
  await prisma.$transaction(async tx => {
    const enrollments = await tx.enrollment.findMany({
      where: { classId: meeting.classId, status: "ACTIVE", deletedAt: null },
      select: { catechumenId: true },
    });
    const registered = await tx.attendance.findMany({
      where: { meetingId: id },
      select: { catechumenId: true },
    });
    const registeredIds = new Set(registered.map(item => item.catechumenId));
    const missing = enrollments.filter(item => !registeredIds.has(item.catechumenId));

    if (missing.length) {
      await tx.attendance.createMany({
        data: missing.map(item => ({
          catechumenId: item.catechumenId,
          classId: meeting.classId,
          meetingId: id,
          status: "ABSENT" as const,
          method: "GROUP" as const,
          recordedById: session.userId,
        })),
        skipDuplicates: true,
      });
    }

    await tx.meeting.update({ where: { id }, data: { status: "CLOSED" } });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "CLOSE",
        entity: "Meeting",
        entityId: id,
        before: { status: meeting.status },
        after: { status: "CLOSED", automaticAbsences: missing.length },
      },
    });
  });
  revalidatePath("/encontros"); revalidatePath(`/presencas/${id}`);
}

export async function cancelMeeting(id: string) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const meeting = await prisma.meeting.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, classId: true, status: true },
  });
  if (!meeting || !(await canAccessClass(session, meeting.classId))) {
    redirect("/encontros?erro=sem-permissao");
  }
  if (meeting.status === "CLOSED") redirect("/encontros?erro=encerrado");
  await prisma.$transaction([
    prisma.meeting.update({ where: { id }, data: { status: "CANCELLED" } }),
    prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CANCEL",
        entity: "Meeting",
        entityId: id,
        before: { status: meeting.status },
        after: { status: "CANCELLED" },
      },
    }),
  ]);
  revalidatePath("/encontros");
  redirect("/encontros?sucesso=cancelado");
}

export async function reopenMeeting(id: string) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const meeting = await prisma.meeting.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, classId: true, status: true },
  });
  if (!meeting || !(await canAccessClass(session, meeting.classId))) {
    redirect("/encontros?erro=sem-permissao");
  }
  if (!["CLOSED", "CANCELLED"].includes(meeting.status)) {
    redirect("/encontros?erro=situacao");
  }
  await prisma.$transaction([
    prisma.meeting.update({ where: { id }, data: { status: "IN_PROGRESS" } }),
    prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "REOPEN",
        entity: "Meeting",
        entityId: id,
        before: { status: meeting.status },
        after: { status: "IN_PROGRESS" },
      },
    }),
  ]);
  revalidatePath("/encontros");
  redirect(`/presencas/${id}`);
}
