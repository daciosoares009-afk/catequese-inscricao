import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { closeMeeting } from "@/app/encontros/actions";
import { recordAttendance } from "../actions";
import { QrCameraReader } from "@/components/qr-camera-reader";

export const dynamic = "force-dynamic";
export default async function AttendancePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const meeting = await prisma.meeting.findFirst({ where: { id, deletedAt: null }, include: { class: { include: { enrollments: { where: { status: "ACTIVE", deletedAt: null }, include: { catechumen: { include: { attendances: { where: { meetingId: id } } } } }, orderBy: { catechumen: { fullName: "asc" } } } } }, attendances: true } });
  if (!meeting || !(await canAccessClass(session, meeting.classId))) notFound();
  const present = meeting.attendances.filter(a => ["PRESENT", "LATE"].includes(a.status)).length;
  const total = meeting.class.enrollments.length;
  const locked =
    meeting.status === "CANCELLED" ||
    (meeting.status === "CLOSED" && session.role === "CATECHIST");
  const errors: Record<string, string> = { "qr-invalido": "QR Code inválido, expirado ou desativado.", "nao-matriculado": "Catequizando não está matriculado nesta turma.", encerrado: "O encontro está encerrado para alterações por catequistas.", permissao: "Operação não permitida.", "dados-invalidos": "Status ou justificativa inválidos.", "justificativa-obrigatoria": "Informe uma justificativa para corrigir um registro existente.", cancelado: "Encontros cancelados não podem ser alterados." };
  return <AppShell current="/presencas">
    <PageHeader title="Chamada do encontro" description={`${meeting.theme} • ${meeting.class.name} • ${formatDate(meeting.date)}`} action={meeting.status === "CANCELLED" ? <StatusBadge status="CANCELLED" /> : meeting.status !== "CLOSED" ? <form action={closeMeeting.bind(null, id)}><button className="btn btn-secondary">Encerrar encontro</button></form> : <StatusBadge status="CLOSED" />} />
    {query.sucesso && <div className="alert success"><CheckCircle2 size={16} /> Presença de {query.sucesso} confirmada.</div>}{query.erro && <div className="alert error">{errors[query.erro] || "Não foi possível concluir a operação."}</div>}
    <div className="grid-stats" style={{ marginBottom: 18 }}><div className="card stat"><div className="stat-label">Presentes</div><div className="stat-value">{present}</div></div><div className="card stat"><div className="stat-label">Total da turma</div><div className="stat-value">{total}</div></div><div className="card stat"><div className="stat-label">Frequência</div><div className="stat-value">{total ? Math.round(present / total * 100) : 0}%</div></div><div className="card stat"><div className="stat-label">Sem registro</div><div className="stat-value">{total - meeting.attendances.length}</div></div></div>
    {!locked && <QrCameraReader meetingId={id} />}
    <div className="card table-wrap"><table className="table"><thead><tr><th>Catequizando</th><th>Registro atual</th><th>{locked ? "Situação" : "Marcar presença"}</th></tr></thead><tbody>{meeting.class.enrollments.map(enrollment => { const current = enrollment.catechumen.attendances[0]; return <tr key={enrollment.id}><td><div className="person"><div className="person-avatar">{enrollment.catechumen.fullName.slice(0, 2).toUpperCase()}</div><strong>{enrollment.catechumen.fullName}</strong></div></td><td>{current ? <StatusBadge status={current.status} /> : <span className="text-muted">Não registrado</span>}</td><td>{locked ? <span className="text-muted">{meeting.status === "CANCELLED" ? "Encontro cancelado" : "Encontro encerrado"}</span> : <form action={recordAttendance.bind(null, id, enrollment.catechumenId)} className="attendance-form"><input type="hidden" name="method" value="MANUAL" /><select name="status" defaultValue={current?.status || "PRESENT"}><option value="PRESENT">Presente</option><option value="ABSENT">Ausente</option><option value="JUSTIFIED">Falta justificada</option><option value="LATE">Atrasado</option><option value="LEFT_EARLY">Saiu antes</option></select><input name="justification" placeholder="Justificativa (obrigatória para falta justificada ou correção)" /><button className="btn btn-secondary">Salvar</button></form>}</td></tr>; })}</tbody></table>{!total && <div className="empty">Esta turma ainda não possui alunos.</div>}</div>
  </AppShell>;
}
