import test from "node:test";
import assert from "node:assert/strict";
import { attendanceSchema, classSchema, meetingSchema } from "@/validations/schemas";
import { frequencySummary } from "@/utils/frequency";

test("frequência considera presente e atrasado como comparecimento", () => {
  assert.deepEqual(frequencySummary(["PRESENT", "LATE", "ABSENT", "JUSTIFIED"]), { total: 4, present: 2, absent: 2, rate: 50 });
  assert.deepEqual(frequencySummary([]), { total: 0, present: 0, absent: 0, rate: 0 });
});

test("falta justificada exige justificativa", () => {
  assert.equal(attendanceSchema.safeParse({ status: "JUSTIFIED", method: "MANUAL" }).success, false);
  assert.equal(attendanceSchema.safeParse({ status: "JUSTIFIED", method: "MANUAL", justification: "Atestado médico" }).success, true);
});

test("status e método arbitrários são rejeitados", () => {
  assert.equal(attendanceSchema.safeParse({ status: "QUALQUER", method: "MANUAL" }).success, false);
  assert.equal(attendanceSchema.safeParse({ status: "PRESENT", method: "INVENTADO" }).success, false);
});

test("turma valida capacidade, dia e horário", () => {
  const base = { name: "Eucaristia I", year: 2026, parishId: "p", communityId: "c", sacramentId: "s", stageId: "e", weekday: 6, startTime: "09:00", location: "Sala 1", startsAt: "2026-02-01", expectedEndAt: "", capacity: 25, status: "ACTIVE" };
  assert.equal(classSchema.safeParse(base).success, true);
  assert.equal(classSchema.safeParse({ ...base, capacity: 0 }).success, false);
  assert.equal(classSchema.safeParse({ ...base, weekday: 8 }).success, false);
});

test("encontro rejeita datas e horários inválidos", () => {
  const base = { classId: "c", date: "2026-02-01", startTime: "09:00", endTime: "10:30", theme: "A Palavra", status: "SCHEDULED" };
  assert.equal(meetingSchema.safeParse(base).success, true);
  assert.equal(meetingSchema.safeParse({ ...base, startTime: "29:99" }).success, false);
});
