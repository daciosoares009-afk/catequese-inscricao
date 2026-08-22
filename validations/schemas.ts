import { z } from "zod";

export const loginSchema = z.object({ email: z.email("E-mail inválido"), password: z.string().min(6, "Senha inválida") });
export const catechumenSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo").max(160),
  status: z.enum(["ACTIVE", "COMPLETED", "TRANSFERRED", "DROPOUT", "WAITING", "INACTIVE"]).default("WAITING"),
  classId: z.string().min(1, "Selecione a turma"),
  sacramentId: z.string().min(1, "Selecione o sacramento"),
});
export const guardianSchema = z.object({ fullName: z.string().min(3), phone: z.string().min(8), whatsapp: z.string().optional(), email: z.union([z.email(), z.literal("")]).optional(), relationship: z.string().min(2), catechumenId: z.string().optional(), allowMessages: z.coerce.boolean().default(false), allowImageUse: z.coerce.boolean().default(false) });

export const classSchema = z.object({
  name: z.string().trim().min(3).max(120),
  year: z.coerce.number().int().min(2000).max(2100),
  parishId: z.string().min(1), communityId: z.string().min(1), sacramentId: z.string().min(1), stageId: z.string().min(1),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  location: z.string().trim().min(2).max(120),
  startsAt: z.coerce.date(), expectedEndAt: z.union([z.coerce.date(), z.literal("")]).optional(),
  capacity: z.coerce.number().int().min(1).max(500),
  status: z.enum(["ACTIVE", "PLANNED", "CLOSED", "CANCELLED"]),
});

export const meetingSchema = z.object({
  classId: z.string().min(1), date: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).optional(),
  theme: z.string().trim().min(3).max(160), content: z.string().trim().max(5000).optional(), notes: z.string().trim().max(2000).optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS"]),
}).superRefine((data, ctx) => {
  if (data.endTime && data.endTime <= data.startTime) {
    ctx.addIssue({
      code: "custom",
      path: ["endTime"],
      message: "O término deve ser posterior ao início",
    });
  }
});

export const attendanceSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "JUSTIFIED", "LATE", "LEFT_EARLY"]),
  method: z.enum(["QR_CODE", "MANUAL", "GROUP", "CORRECTION"]),
  justification: z.string().trim().max(1000).optional(), notes: z.string().trim().max(1000).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "JUSTIFIED" && !data.justification) ctx.addIssue({ code: "custom", path: ["justification"], message: "Justificativa obrigatória" });
});
