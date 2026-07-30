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
  await prisma.$transaction([
    prisma.meeting.update({ where: { id }, data: { status: "CLOSED" } }),
    prisma.auditLog.create({ data: { userId: session.userId, action: "CLOSE", entity: "Meeting", entityId: id, before: { status: meeting.status }, after: { status: "CLOSED" } } }),
  ]);
  revalidatePath("/encontros"); revalidatePath(`/presencas/${id}`);
}
