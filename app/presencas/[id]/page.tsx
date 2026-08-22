import { notFound } from "next/navigation";
import { AlertCircle, CheckCircle2, ClipboardCheck, Users } from "lucide-react";
import AppShell from "@/components/app-shell";
import { AttendanceSearch } from "@/components/attendance-search";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { closeMeeting } from "@/app/encontros/actions";
import { markAllPresent, recordAttendance } from "../actions";
import { QrCameraReader } from "@/components/qr-camera-reader";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const meeting = await prisma.meeting.findFirst({ where: { id, deletedAt: null }, include: { class: { include: { enrollments: { where: { status: "ACTIVE", deletedAt: null }, include: { catechumen: { include: { attendances: { where: { meetingId: id } } } } }, orderBy: { catechumen: { fullName: "asc" } } } } }, attendances: true } });
  if (!meeting || !(await canAccessClass(session, meeting.classId))) notFound();

  const present = meeting.attendances.filter(record => ["PRESENT", "LATE"].includes(record.status)).length;
  const justified = meeting.attendances.filter(record => record.status === "JUSTIFIED").length;
  const total = meeting.class.enrollments.length;
  const pending = Math.max(total - meeting.attendances.length, 0);
  const percentage = total ? Math.round(present / total * 100) : 0;
  const locked = meeting.status === "CANCELLED" || (meeting.status === "CLOSED" && session.role === "CATECHIST");
  const errors: Record<string, string> = { "qr-invalido": "QR Code inválido, expirado ou desativado.", "nao-matriculado": "Catequizando não está matriculado nesta turma.", encerrado: "O encontro está encerrado para alterações.", permissao: "Operação não permitida.", "dados-invalidos": "Status ou justificativa inválidos.", "justificativa-obrigatoria": "Informe uma justificativa para corrigir o registro.", cancelado: "Encontros cancelados não podem ser alterados." };

  return <AppShell current="/presencas">
    <PageHeader eyebrow="Frequência" title="Chamada do encontro" description={`${meeting.theme} · ${meeting.class.name} · ${formatDate(meeting.date)} às ${meeting.startTime}`} action={meeting.status === "CANCELLED" ? <StatusBadge status="CANCELLED" /> : meeting.status !== "CLOSED" ? <form action={closeMeeting.bind(null, id)}><ConfirmSubmitButton message={pending ? `Ainda existem ${pending} registro(s) pendente(s). Ao encerrar, serão marcados como falta. Deseja continuar?` : "Finalizar a chamada deste encontro?"} pendingLabel="Encerrando...">Encerrar chamada</ConfirmSubmitButton></form> : <StatusBadge status="CLOSED" />} />
    {query.sucesso && <div className="alert success attendance-feedback" role="status"><CheckCircle2 size={17} />{query.sucesso === "turma" ? "Todos os catequizandos foram marcados como presentes." : <>QR code lido com sucesso. Presença de {query.sucesso} confirmada.</>}</div>}
    {query.erro && <div className="alert error" role="alert"><AlertCircle size={17} />{errors[query.erro] || "Não foi possível concluir a operação."}</div>}

    <section className="attendance-summary card">
      <div className="attendance-summary-copy"><span>Progresso da chamada</span><strong>{meeting.attendances.length} de {total} registros</strong><div className="attendance-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={meeting.attendances.length}><i style={{ width: `${total ? meeting.attendances.length / total * 100 : 0}%` }} /></div></div>
      <div className="attendance-mini-stats"><div><strong>{present}</strong><span>Compareceram</span></div><div><strong>{justified}</strong><span>Justificados</span></div><div className={pending ? "attention" : ""}><strong>{pending}</strong><span>Pendentes</span></div><div><strong>{percentage}%</strong><span>Frequência</span></div></div>
    </section>

    {!locked && <div className="attendance-tools"><AttendanceSearch /><form action={markAllPresent.bind(null, id)}><ConfirmSubmitButton className="btn btn-primary" message="Marcar todos os catequizandos desta turma como presentes?" pendingLabel="Registrando..."><Users size={16} /> Marcar todos presentes</ConfirmSubmitButton></form></div>}
    {!locked && <QrCameraReader meetingId={id} />}

    <section className="card attendance-roster"><div className="card-head"><div><h2>Lista da turma</h2><small>{pending ? `${pending} registro(s) ainda pendente(s)` : "Chamada completa"}</small></div><span className={`badge ${pending ? "warn" : ""}`}>{total} catequizandos</span></div>
      <div className="attendance-list">
        {meeting.class.enrollments.map(enrollment => {
          const current = enrollment.catechumen.attendances[0];
          const normalizedName = enrollment.catechumen.fullName.toLocaleLowerCase("pt-BR");
          return <article className={`attendance-row${current ? " recorded" : " pending"}`} key={enrollment.id} data-attendee={normalizedName}>
            <div className="attendance-person"><UserAvatar name={enrollment.catechumen.fullName} /><div><strong>{enrollment.catechumen.fullName}</strong><span>{current ? <StatusBadge status={current.status} /> : <em>Registro pendente</em>}</span></div></div>
            {locked ? <span className="text-muted">{meeting.status === "CANCELLED" ? "Encontro cancelado" : "Encontro encerrado"}</span> : <form action={recordAttendance.bind(null, id, enrollment.catechumenId)} className="attendance-form"><input type="hidden" name="method" value="MANUAL" /><label><span className="sr-only">Status de {enrollment.catechumen.fullName}</span><select name="status" defaultValue={current?.status || "PRESENT"}><option value="PRESENT">Presente</option><option value="LATE">Atrasado</option><option value="ABSENT">Falta</option><option value="JUSTIFIED">Justificado</option><option value="LEFT_EARLY">Saiu antes</option></select></label><label className="attendance-justification"><span className="sr-only">Justificativa de {enrollment.catechumen.fullName}</span><input name="justification" placeholder="Justificativa, quando necessária" /></label><SubmitButton className="btn btn-secondary" pendingLabel="Salvando...">Salvar</SubmitButton></form>}
          </article>;
        })}
        {!total && <EmptyState icon={ClipboardCheck} title="Turma sem catequizandos" description="Adicione catequizandos à turma antes de iniciar a chamada." />}
      </div>
    </section>
  </AppShell>;
}
