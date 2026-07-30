"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";

const schema = z.object({ title: z.string().trim().min(3).max(160), message: z.string().trim().min(3).max(5000), recipientType: z.enum(["ALL", "CLASS", "COMMUNITY", "CATECHISTS"]), recipientId: z.string().optional(), channel: z.enum(["WHATSAPP", "EMAIL", "INTERNAL"]), priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]) });
export async function createAnnouncement(formData: FormData) {
  const session = await requireSession();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/comunicados?erro=dados-invalidos");
  const data = parsed.data;
  if (session.role === "CATECHIST") {
    if (data.recipientType !== "CLASS" || !data.recipientId || !(await canAccessClass(session, data.recipientId))) redirect("/comunicados?erro=sem-permissao");
  }
  if (data.recipientType === "CLASS" && (!data.recipientId || !(await canAccessClass(session, data.recipientId)))) redirect("/comunicados?erro=destinatario");
  await prisma.$transaction(async tx => {
    const announcement = await tx.announcement.create({ data: { ...data, recipientId: data.recipientId || null, sendAt: new Date(), status: "PENDING" } });
    await tx.auditLog.create({ data: { userId: session.userId, action: "CREATE", entity: "Announcement", entityId: announcement.id, after: { title: announcement.title, recipientType: announcement.recipientType, recipientId: announcement.recipientId, channel: announcement.channel } } });
  });
  revalidatePath("/comunicados");
}
