"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, type AttendanceMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { attendanceSchema } from "@/validations/schemas";
import { isQrCodeTokenFormatValid } from "@/lib/qr-code";

type AttendanceInput = {
  status: "PRESENT" | "ABSENT" | "JUSTIFIED" | "LATE" | "LEFT_EARLY";
  method: "MANUAL" | "QR_CODE";
  justification?: string;
  notes?: string;
};

async function saveAttendance(
  meetingId: string,
  catechumenId: string,
  session: Awaited<ReturnType<typeof requireSession>>,
  input: AttendanceInput,
  rejectExisting: boolean,
) {
  const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, deletedAt: null }, select: { id: true, classId: true, status: true } });
  if (!meeting || !(await canAccessClass(session, meeting.classId))) redirect(`/presencas/${meetingId}?erro=permissao`);
  if (meeting.status === "CANCELLED") redirect(`/presencas/${meetingId}?erro=cancelado`);
  if (meeting.status === "CLOSED" && session.role === "CATECHIST") redirect(`/presencas/${meetingId}?erro=encerrado`);
  const enrollment = await prisma.enrollment.findFirst({ where: { catechumenId, classId: meeting.classId, status: "ACTIVE", deletedAt: null }, select: { id: true } });
  if (!enrollment) redirect(`/presencas/${meetingId}?erro=nao-matriculado`);
  const old = await prisma.attendance.findUnique({ where: { catechumenId_meetingId: { catechumenId, meetingId } } });
  if (rejectExisting && old) redirect(`/presencas/${meetingId}?erro=qr-ja-registrado`);
  if (old && session.role !== "CATECHIST" && old.status !== input.status && !input.justification) redirect(`/presencas/${meetingId}?erro=justificativa-obrigatoria`);
  const method: AttendanceMethod = old && session.role !== "CATECHIST" ? "CORRECTION" : input.method;
  const data = { classId: meeting.classId, status: input.status, method, justification: input.justification || null, notes: input.notes || null, recordedById: session.userId, recordedAt: new Date() };
  try {
    await prisma.$transaction(async tx => {
      const attendance = rejectExisting
        ? await tx.attendance.create({ data: { catechumenId, meetingId, ...data } })
        : await tx.attendance.upsert({ where: { catechumenId_meetingId: { catechumenId, meetingId } }, create: { catechumenId, meetingId, ...data }, update: data });
    await tx.auditLog.create({ data: { userId: session.userId, action: old ? "UPDATE_ATTENDANCE" : "CREATE_ATTENDANCE", entity: "Attendance", entityId: attendance.id, before: old ? { status: old.status, method: old.method } : undefined, after: { status: attendance.status, method: attendance.method, justification: attendance.justification } } });
    });
  } catch (error) {
    if (rejectExisting && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/presencas/${meetingId}?erro=qr-ja-registrado`);
    }
    throw error;
  }
  revalidatePath(`/presencas/${meetingId}`);
}

export async function recordAttendance(meetingId: string, catechumenId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = attendanceSchema.safeParse({ ...Object.fromEntries(formData), method: "MANUAL" });
  if (!parsed.success) redirect(`/presencas/${meetingId}?erro=dados-invalidos`);
  await saveAttendance(meetingId, catechumenId, session, { ...parsed.data, method: "MANUAL" }, false);
}

export async function registerByToken(meetingId: string, formData: FormData) {
  const session = await requireSession();
  const token = String(formData.get("token") || "").trim();
  if (!isQrCodeTokenFormatValid(token)) redirect(`/presencas/${meetingId}?erro=qr-invalido`);
  const qr = await prisma.qRCodeToken.findFirst({ where: { token, active: true, expiresAt: { gt: new Date() }, catechumen: { is: { deletedAt: null, status: { not: "INACTIVE" } } } }, include: { catechumen: { select: { id: true, fullName: true } } } });
  if (!qr) redirect(`/presencas/${meetingId}?erro=qr-invalido`);
  await saveAttendance(meetingId, qr.catechumenId, session, { status: "PRESENT", method: "QR_CODE" }, true);
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
