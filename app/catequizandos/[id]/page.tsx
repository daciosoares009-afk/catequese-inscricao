/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CalendarDays, MapPin, Phone, RefreshCw } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { requireSession } from "@/lib/auth";
import { catechistCatechumenFilter } from "@/lib/access";
import { regenerateQr } from "../actions";

export const dynamic = "force-dynamic";
export default async function CatechumenProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const item = await prisma.catechumen.findFirst({
    where: { id, deletedAt: null, ...catechistCatechumenFilter(session) },
    include: {
      community: true, parish: true, qrCode: true,
      guardians: { include: { guardian: true } },
      enrollments: { include: { class: { include: { sacrament: true, stage: true } } }, orderBy: { createdAt: "desc" } },
      attendances: { include: { meeting: true }, orderBy: { recordedAt: "desc" }, take: 8 },
      sacramentalHistory: { include: { sacrament: true, stage: true }, orderBy: { occurredAt: "desc" } },
    },
  });
  if (!item) notFound();
  const qr = item.qrCode ? await QRCode.toDataURL(item.qrCode.token, { width: 220, margin: 1, color: { dark: "#12395fff", light: "#ffffffff" } }) : "";
  const enrollment = item.enrollments.find(e => e.status === "ACTIVE");
  return <AppShell current="/catequizandos">
    <PageHeader title={item.fullName} description="Perfil completo e histórico pastoral" action={<PrintButton />} />
    <div className="profile-grid">
      <aside className="card profile-card">
        <div className="profile-photo">{item.fullName.split(" ").slice(0, 2).map(x => x[0]).join("")}</div>
        <h2 style={{ font: "700 21px Georgia,serif", margin: "0 0 8px" }}>{item.fullName}</h2><StatusBadge status={item.status} />
        <div className="list" style={{ textAlign: "left", marginTop: 20 }}>
          <div className="list-row"><CalendarDays size={16} /><div><small>Nascimento</small><strong>{formatDate(item.birthDate)}</strong></div></div>
          <div className="list-row"><Phone size={16} /><div><small>Telefone</small><strong>{item.phone || "Não informado"}</strong></div></div>
          <div className="list-row"><MapPin size={16} /><div><small>Comunidade</small><strong>{item.community?.name || "Não definida"}</strong></div></div>
        </div>
        {qr && <><div className="qr-box"><img src={qr} alt={`QR Code de ${item.fullName}`} width={145} height={145} /></div><small style={{ display: "block", color: "#778595", marginTop: 8 }}>Código protegido, sem dados pessoais</small>{session.role !== "CATECHIST" && <form action={regenerateQr.bind(null, item.id)}><button className="btn btn-secondary no-print" style={{ marginTop: 12 }}><RefreshCw size={14} />Regenerar QR</button></form>}</>}
      </aside>
      <section className="card"><div className="tabs"><span className="tab active">Visão geral</span><span className="tab">Histórico</span><span className="tab">Documentos</span><span className="tab">Frequência</span></div><div className="card-body">
        <div className="form-grid"><div><div className="eyebrow">Turma atual</div><h3>{enrollment?.class.name || "Sem turma"}</h3><p style={{ color: "#708094", fontSize: 13 }}>{enrollment ? `${enrollment.class.sacrament.name} • ${enrollment.class.stage.name}` : "Aguardando matrícula"}</p></div><div><div className="eyebrow">Responsável principal</div><h3>{item.guardians.find(x => x.isPrimary)?.guardian.fullName || item.guardians[0]?.guardian.fullName || "Não cadastrado"}</h3><p style={{ color: "#708094", fontSize: 13 }}>{item.guardians[0]?.guardian.phone || "Cadastre um responsável"}</p></div></div>
        <div className="form-section" style={{ marginTop: 22 }}><h2>Presenças recentes</h2><div className="list">{item.attendances.map(a => <div className="list-row" key={a.id}><div className="grow"><strong>{a.meeting.theme}</strong><small>{formatDate(a.meeting.date)} • {a.method}</small></div><StatusBadge status={a.status} /></div>)}{!item.attendances.length && <div className="empty">Nenhuma presença registrada.</div>}</div></div>
        <h2 style={{ font: "700 17px Georgia,serif", color: "#1a4069" }}>Linha do tempo pastoral</h2><div className="list">{item.enrollments.map(e => <div className="list-row" key={e.id}><div className="stat-icon">✦</div><div><strong>Matrícula em {e.class.name}</strong><small>{formatDate(e.enrolledAt)} • {e.status}</small></div></div>)}{item.sacramentalHistory.map(h => <div className="list-row" key={h.id}><div className="stat-icon">✝</div><div><strong>{h.sacrament.name}</strong><small>{formatDate(h.occurredAt)} {h.stage ? `• ${h.stage.name}` : ""}</small></div></div>)}</div>
      </div></section>
    </div>
  </AppShell>;
}
