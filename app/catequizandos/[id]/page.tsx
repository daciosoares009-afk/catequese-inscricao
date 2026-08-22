import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CalendarCheck, QrCode, RefreshCw, UserRound } from "lucide-react";
import AppShell from "@/components/app-shell";
import { DownloadQrPdfButton } from "@/components/download-qr-pdf-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistCatechumenFilter } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { frequencySummary } from "@/utils/frequency";
import { archiveCatechumen, regenerateQr, updateCatechumenName } from "../actions";

export const dynamic = "force-dynamic";

export default async function CatechumenProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const session = await requireSession();
  const item = await prisma.catechumen.findFirst({
    where: { id, deletedAt: null, ...catechistCatechumenFilter(session) },
    select: {
      id: true, fullName: true, status: true, joinedAt: true, notes: true,
      qrCode: { select: { token: true, active: true, generatedAt: true } },
      guardians: { where: { guardian: { deletedAt: null } }, include: { guardian: true } },
      enrollments: { where: { deletedAt: null, class: { deletedAt: null } }, orderBy: { enrolledAt: "desc" }, include: { class: { include: { sacrament: true, stage: true } } } },
      attendances: { where: { meeting: { deletedAt: null }, class: { deletedAt: null } }, orderBy: { recordedAt: "desc" }, take: 12, include: { meeting: true, class: true } },
    },
  });
  if (!item) notFound();
  const qrDataUrl = item.qrCode?.active ? await QRCode.toDataURL(item.qrCode.token, { width: 520, margin: 2, errorCorrectionLevel: "H", color: { dark: "#173d2eff", light: "#ffffffff" } }) : "";
  const activeEnrollment = item.enrollments.find(enrollment => enrollment.status === "ACTIVE");
  const attendance = frequencySummary(item.attendances.map(record => record.status));

  return <AppShell current="/catequizandos">
    <PageHeader eyebrow="Perfil do catequizando" title={item.fullName} description={`Cadastro desde ${formatDate(item.joinedAt)}`} />
    {query.erro && <div className="alert error" role="alert">Informe um nome válido.</div>}
    {query.sucesso && <div className="alert success" role="status">Dados atualizados com sucesso.</div>}

    <div className="student-profile-layout">
      <aside className="card student-identity-card"><UserAvatar name={item.fullName} size="lg" /><h2>{item.fullName}</h2><StatusBadge status={item.status} /><dl><div><dt>Turma atual</dt><dd>{activeEnrollment?.class.name || "Sem turma"}</dd></div><div><dt>Sacramento</dt><dd>{activeEnrollment?.class.sacrament.name || "Não definido"}</dd></div><div><dt>Frequência recente</dt><dd>{attendance.rate}%</dd></div></dl>{session.role !== "CATECHIST" && <form action={updateCatechumenName.bind(null, item.id)} className="profile-name-form"><label htmlFor="profile-name">Nome completo</label><input id="profile-name" name="fullName" defaultValue={item.fullName} minLength={3} maxLength={160} required /><SubmitButton className="btn btn-secondary" pendingLabel="Atualizando...">Atualizar nome</SubmitButton></form>}</aside>

      <div className="student-profile-content">
        <section className="card qr-profile-card"><div className="card-head"><div><h2>QR Code individual</h2><small>Baixe o código para impressão ou use na chamada pelo celular</small></div><span className="stat-icon"><QrCode size={18} /></span></div><div className="qr-profile-body">{qrDataUrl ? <><div className="qr-download-image"><QrCode size={64} aria-label="QR Code gerado" /></div><div className="qr-profile-actions"><DownloadQrPdfButton fullName={item.fullName} href={`/api/catequizandos/${item.id}/qr-pdf`} />{session.role !== "CATECHIST" && <form action={regenerateQr.bind(null, item.id)}><SubmitButton className="btn btn-secondary" pendingLabel="Gerando..."><RefreshCw size={14} /> Gerar novo código</SubmitButton></form>}<small>Gerado em {item.qrCode ? formatDate(item.qrCode.generatedAt) : "—"}</small></div></> : <EmptyState icon={QrCode} title="QR Code ainda não gerado" description="Gere o código individual para registrar presença." action={session.role !== "CATECHIST" ? <form action={regenerateQr.bind(null, item.id)}><SubmitButton>Gerar QR Code</SubmitButton></form> : undefined} />}</div></section>

        <div className="student-info-grid"><section className="card"><div className="card-head"><div><h2>Histórico de turmas</h2><small>Vínculos preservados</small></div></div><div className="card-body list">{item.enrollments.map(enrollment => <div className="list-row" key={enrollment.id}><span className="stat-icon"><UserRound size={15} /></span><div className="grow"><strong>{enrollment.class.name}</strong><small>{enrollment.class.sacrament.name} · {enrollment.class.stage.name} · desde {formatDate(enrollment.enrolledAt)}</small></div><StatusBadge status={enrollment.status} /></div>)}{!item.enrollments.length && <EmptyState icon={UserRound} title="Sem histórico de turma" />}</div></section>
          <section className="card"><div className="card-head"><div><h2>Frequência recente</h2><small>{attendance.present} comparecimentos em {attendance.total} registros</small></div></div><div className="card-body list">{item.attendances.slice(0, 6).map(record => <div className="list-row" key={record.id}><span className="stat-icon"><CalendarCheck size={15} /></span><div className="grow"><strong>{record.meeting.theme}</strong><small>{record.class.name} · {formatDate(record.meeting.date)}</small></div><StatusBadge status={record.status} /></div>)}{!item.attendances.length && <EmptyState icon={CalendarCheck} title="Sem registros de frequência" />}</div></section></div>

        {item.guardians.length > 0 && <section className="card guardian-summary"><div className="card-head"><div><h2>Responsáveis vinculados</h2><small>Contatos autorizados no cadastro</small></div></div><div className="card-body list">{item.guardians.map(link => <div className="list-row" key={link.guardianId}><UserAvatar name={link.guardian.fullName} size="sm" /><div className="grow"><strong>{link.guardian.fullName}</strong><small>{link.relationship} · {link.guardian.phone}</small></div>{link.guardian.allowMessages ? <span className="badge">Mensagens autorizadas</span> : <span className="badge warn">Sem autorização</span>}</div>)}</div></section>}

        {session.role !== "CATECHIST" && <details className="danger-zone"><summary>Arquivar catequizando</summary><div><p>O cadastro sairá das listas, a matrícula ativa será encerrada e o QR Code será desativado.</p><form action={archiveCatechumen.bind(null, item.id)}><ConfirmSubmitButton className="btn btn-danger" message={`Arquivar o cadastro de ${item.fullName}? Esta ação desativará o QR Code.`} pendingLabel="Arquivando...">Confirmar arquivamento</ConfirmSubmitButton></form></div></details>}
      </div>
    </div>
  </AppShell>;
}
