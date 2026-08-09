"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { attendanceSchema } from "@/validations/schemas";

export async function recordAttendance(meetingId: string, catechumenId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = attendanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/presencas/${meetingId}?erro=dados-invalidos`);
  const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, deletedAt: null }, select: { id: true, classId: true, status: true } });
  if (!meeting || !(await canAccessClass(session, meeting.classId))) redirect(`/presencas/${meetingId}?erro=permissao`);
  if (meeting.status === "CANCELLED") redirect(`/presencas/${meetingId}?erro=cancelado`);
  if (meeting.status === "CLOSED" && session.role === "CATECHIST") redirect(`/presencas/${meetingId}?erro=encerrado`);
  const enrollment = await prisma.enrollment.findFirst({ where: { catechumenId, classId: meeting.classId, status: "ACTIVE", deletedAt: null }, select: { id: true } });
  if (!enrollment) redirect(`/presencas/${meetingId}?erro=nao-matriculado`);
  const old = await prisma.attendance.findUnique({ where: { catechumenId_meetingId: { catechumenId, meetingId } } });
  if (old && session.role !== "CATECHIST" && old.status !== parsed.data.status && !parsed.data.justification) redirect(`/presencas/${meetingId}?erro=justificativa-obrigatoria`);
  const method = old && session.role !== "CATECHIST" ? "CORRECTION" : parsed.data.method;
  const data = { classId: meeting.classId, ...parsed.data, method, justification: parsed.data.justification || null, notes: parsed.data.notes || null, recordedById: session.userId, recordedAt: new Date() };
  await prisma.$transaction(async tx => {
    const attendance = await tx.attendance.upsert({ where: { catechumenId_meetingId: { catechumenId, meetingId } }, create: { catechumenId, meetingId, ...data }, update: data });
    await tx.auditLog.create({ data: { userId: session.userId, action: old ? "UPDATE_ATTENDANCE" : "CREATE_ATTENDANCE", entity: "Attendance", entityId: attendance.id, before: old ? { status: old.status, method: old.method } : undefined, after: { status: attendance.status, method: attendance.method, justification: attendance.justification } } });
  });
  revalidatePath(`/presencas/${meetingId}`);
}

export async function registerByToken(meetingId: string, formData: FormData) {
  await requireSession();
  const token = String(formData.get("token") || "").trim();
  if (token.length < 32 || token.length > 128) redirect(`/presencas/${meetingId}?erro=qr-invalido`);
  const qr = await prisma.qRCodeToken.findFirst({ where: { token, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, include: { catechumen: true } });
  if (!qr) redirect(`/presencas/${meetingId}?erro=qr-invalido`);
  const next = new FormData(); next.set("status", "PRESENT"); next.set("method", "QR_CODE");
  await recordAttendance(meetingId, qr.catechumenId, next);
  redirect(`/presencas/${meetingId}?sucesso=${encodeURIComponent(qr.catechumen.fullName)}`);
}

export async function markAllPresent(meetingId: string) {
  const session = await requireSession();
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, deletedAt: null },
    select: { id: true, classId: true, status: true, class: { select: { enrollments: { where: { status: "ACTIVE", deletedAt: null }, select: { catechumenId: true } } } } },
  });
  if (!meeting || !(await canAccessClass(session, meeting.classId))) redirect(`/presencas/${meetingId}?erro=permissao`);
  if (meeting.status === "CANCELLED" || (meeting.status === "CLOSED" && session.role === "CATECHIST")) redirect(`/presencas/${meetingId}?erro=encerrado`);

  await prisma.$transaction(async tx => {
    for (const enrollment of meeting.class.enrollments) {
      await tx.attendance.upsert({
        where: { catechumenId_meetingId: { catechumenId: enrollment.catechumenId, meetingId } },
        create: { catechumenId: enrollment.catechumenId, meetingId, classId: meeting.classId, status: "PRESENT", method: "GROUP", recordedById: session.userId },
        update: { status: "PRESENT", method: "GROUP", recordedById: session.userId, recordedAt: new Date(), justification: null },
      });
    }
    await tx.auditLog.create({ data: { userId: session.userId, action: "MARK_ALL_PRESENT", entity: "Meeting", entityId: meetingId, after: { total: meeting.class.enrollments.length } } });
  });
  revalidatePath(`/presencas/${meetingId}`);
  redirect(`/presencas/${meetingId}?sucesso=turma`);
}
