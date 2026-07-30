"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";

const schema = z.object({
  title: z.string().trim().min(3).max(160),
  message: z.string().trim().min(3).max(5000),
  recipientType: z.enum(["ALL", "CLASS", "COMMUNITY", "CATECHISTS"]),
  classId: z.string().optional(),
  communityId: z.string().optional(),
  channel: z.enum(["WHATSAPP", "INTERNAL"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
});

export async function createAnnouncement(formData: FormData) {
  const session = await requireSession();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/comunicados?erro=dados-invalidos");
  const data = parsed.data;

  if (session.role === "CATECHIST") {
    if (
      data.recipientType !== "CLASS" ||
      !data.classId ||
      !(await canAccessClass(session, data.classId))
    ) {
      redirect("/comunicados?erro=sem-permissao");
    }
  }

  let recipientId: string | null = null;
  if (data.recipientType === "CLASS") {
    if (!data.classId || !(await canAccessClass(session, data.classId))) {
      redirect("/comunicados?erro=destinatario");
    }
    recipientId = data.classId;
  }
  if (data.recipientType === "COMMUNITY") {
    if (session.role === "CATECHIST" || !data.communityId) {
      redirect("/comunicados?erro=destinatario");
    }
    const community = await prisma.community.findFirst({
      where: { id: data.communityId, deletedAt: null },
      select: { id: true },
    });
    if (!community) redirect("/comunicados?erro=destinatario");
    recipientId = community.id;
  }

  await prisma.$transaction(async tx => {
    const announcement = await tx.announcement.create({
      data: {
        title: data.title,
        message: data.message,
        recipientType: data.recipientType,
        recipientId,
        channel: data.channel,
        priority: data.priority,
        sendAt: new Date(),
        status: data.channel === "INTERNAL" ? "SENT" : "PENDING",
      },
    });

    if (data.channel === "INTERNAL") {
      const users = await tx.user.findMany({
        where: {
          active: true,
          deletedAt: null,
          ...(data.recipientType === "CATECHISTS"
            ? { role: "CATECHIST" as const }
            : data.recipientType === "CLASS"
              ? { catechist: { classes: { some: { classId: recipientId! } } } }
              : data.recipientType === "COMMUNITY"
                ? {
                    catechist: {
                      classes: {
                        some: { class: { communityId: recipientId! } },
                      },
                    },
                  }
                : {}),
        },
        select: { id: true },
      });
      if (users.length) {
        await tx.notification.createMany({
          data: users.map(user => ({
            userId: user.id,
            title: data.title,
            message: data.message,
            type: data.priority,
          })),
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE",
        entity: "Announcement",
        entityId: announcement.id,
        after: {
          title: announcement.title,
          recipientType: announcement.recipientType,
          recipientId: announcement.recipientId,
          channel: announcement.channel,
          status: announcement.status,
        },
      },
    });
  });

  revalidatePath("/comunicados");
  revalidatePath("/notificacoes");
  redirect("/comunicados?sucesso=criado");
}
