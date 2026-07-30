"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { guardianSchema } from "@/validations/schemas";

export async function createGuardian(formData: FormData) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const parsed = guardianSchema.safeParse({ ...Object.fromEntries(formData), allowMessages: formData.get("allowMessages") === "on", allowImageUse: formData.get("allowImageUse") === "on" });
  if (!parsed.success) redirect("/responsaveis?novo=1&erro=dados-invalidos");
  const data = parsed.data;
  if (data.catechumenId && !await prisma.catechumen.findFirst({ where: { id: data.catechumenId, deletedAt: null }, select: { id: true } })) redirect("/responsaveis?novo=1&erro=catequizando");
  await prisma.$transaction(async tx => {
    const guardian = await tx.guardian.create({ data: { fullName: data.fullName, phone: data.phone, whatsapp: data.whatsapp || null, email: data.email || null, allowMessages: data.allowMessages, allowImageUse: data.allowImageUse, catechumens: data.catechumenId ? { create: { catechumenId: data.catechumenId, relationship: data.relationship, isPrimary: true } } : undefined } });
    await tx.auditLog.create({ data: { userId: session.userId, action: "CREATE", entity: "Guardian", entityId: guardian.id, after: { fullName: guardian.fullName, catechumenId: data.catechumenId } } });
  });
  redirect("/responsaveis?sucesso=cadastrado");
}
