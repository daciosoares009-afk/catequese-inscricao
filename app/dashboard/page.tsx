import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  Plus,
  QrCode,
  ShieldCheck,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react";
import AppShell from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import {
  catechistClassFilter,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/format";
import { frequencySummary } from "@/utils/frequency";
import { StatCard } from "@/components/ui/stat-card";

export const dynamic = "force-dynamic";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});
const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Fortaleza",
});

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const currentYear = new Date().getFullYear();
  const requestedYear = Number(query.year || currentYear);
  const year = Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= currentYear + 2 ? requestedYear : currentYear;
  const classFilter = catechistClassFilter(session);
  const classScope = { ...classFilter, year };
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const todayStart = new Date(`${localDate}T00:00:00.000Z`);
  const [
    students,
    classes,
    attendance,
    upcoming,
    classRows,
    enrollments,
    classYears,
  ] = await Promise.all([
    prisma.catechumen.count({
      where: { deletedAt: null, status: "ACTIVE", enrollments: { some: { status: "ACTIVE", class: classScope } } },
    }),
    prisma.class.count({
      where: { deletedAt: null, status: "ACTIVE", ...classScope },
    }),
    prisma.attendance.findMany({
      where: { class: classScope, meeting: { status: "CLOSED", deletedAt: null } },
      select: { catechumenId: true, classId: true, status: true, meeting: { select: { date: true } } },
    }),
    prisma.meeting.findMany({
      where: {
        deletedAt: null,
        date: { gte: todayStart },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        class: classScope,
      },
      include: { class: true },
      orderBy: { date: "asc" },
      take: 4,
    }),
    prisma.class.findMany({
      where: { deletedAt: null, status: "ACTIVE", ...classScope },
      include: {
        _count: {
          select: {
            attendances: true,
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 4,
    }),
    prisma.enrollment.findMany({
      where: { status: "ACTIVE", class: classScope },
      select: { catechumenId: true, classId: true, catechumen: { select: { fullName: true } }, class: { select: { name: true } } },
    }),
    prisma.class.findMany({ where: { deletedAt: null, ...classFilter }, distinct: ["year"], select: { year: true }, orderBy: { year: "desc" } }),
  ]);

  const { rate } = frequencySummary(attendance.map((item) => item.status));
  const attendanceByEnrollment = new Map<string, typeof attendance>();
  for (const record of attendance) {
    const key = `${record.catechumenId}:${record.classId}`;
    attendanceByEnrollment.set(key, [...(attendanceByEnrollment.get(key) || []), record]);
  }
  const atRiskRows = enrollments.flatMap(enrollment => {
    const own = attendanceByEnrollment.get(`${enrollment.catechumenId}:${enrollment.classId}`) || [];
    const summary = frequencySummary(own.map(item => item.status));
    return summary.total > 0 && summary.rate < 75 ? [{ ...enrollment, rate: summary.rate }] : [];
  }).sort((a, b) => a.rate - b.rate);
  const atRisk = atRiskRows.length;

  const stats = [
    {
      label: "Catequizandos ativos",
      value: students,
      trend: "Vínculos ativos",
      icon: UserRoundCheck,
      tone: "sage",
    },
    {
      label: "Turmas em andamento",
      value: classes,
      trend: `Ano pastoral ${year}`,
      icon: BookOpen,
      tone: "amber",
    },
    {
      label: "Frequência média",
      value: `${rate}%`,
      trend: rate >= 75 ? "Dentro da meta" : "Requer atenção",
      icon: CalendarDays,
      tone: "blue",
    },
    {
      label: "Alertas de frequência",
      value: atRisk,
      trend: "Abaixo de 75%",
      icon: TriangleAlert,
      tone: "rose",
    },
  ];

  const currentMonth = new Date(todayStart);
  const chartMonths = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(
      currentMonth.getUTCFullYear(),
      currentMonth.getUTCMonth() - (6 - index),
      1,
    ));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      label: monthFormatter.format(date).replace(".", ""),
    };
  });
  const chartValues = chartMonths.map(({ year, month }) => {
    const own = attendance.filter(item =>
      item.meeting.date.getUTCFullYear() === year &&
      item.meeting.date.getUTCMonth() === month
    );
    return frequencySummary(own.map(item => item.status)).rate;
  });
  const chartLabels = chartMonths.map(item => item.label);
  const today = weekdayFormatter.format(new Date());

  return (
    <AppShell current="/dashboard">
      <div className="dashboard-commandbar">
        <div><span>Ano pastoral</span><strong>{year}</strong></div>
        <form><label htmlFor="dashboard-year">Período</label><select id="dashboard-year" name="year" defaultValue={String(year)}>{classYears.map(item => <option key={item.year} value={item.year}>{item.year}</option>)}</select><button className="btn btn-secondary">Atualizar</button></form>
      </div>
      <section className="faith-welcome">
        <div className="faith-welcome-photo" />
        <div className="faith-welcome-overlay" />
        <div className="faith-welcome-content">
          <p className="faith-eyebrow">{today}</p>
          <h1>Paz e bem!</h1>
          <p>
            Acompanhe a caminhada das turmas, organize os próximos encontros e
            cuide de cada catequizando.
          </p>
          <span className="faith-role-badge">
            <ShieldCheck size={14} />
            {roleLabel[session.role]}
          </span>
        </div>
        {session.role !== "CATECHIST" && (
          <Link className="faith-primary-button" href="/catequizandos/novo">
            <Plus size={18} />
            Novo catequizando
          </Link>
        )}
      </section>

      <section className="metrics-grid dashboard-metrics" aria-label="Indicadores principais">
        {stats.map(({ label, value, trend, icon, tone }) => <StatCard key={label} label={label} value={value} context={trend} icon={icon} tone={tone === "sage" ? "green" : tone === "amber" ? "gold" : tone === "blue" ? "blue" : "rose"} />)}
      </section>

      <div className="dashboard-support-grid">
        <section className="quick-actions-panel">
          <div className="section-heading"><div><span>Atalhos</span><h2>Ações rápidas</h2></div></div>
          <div className="quick-actions-grid">
            {session.role !== "CATECHIST" && <Link href="/catequizandos/novo"><span><Plus size={18} /></span><div><strong>Novo catequizando</strong><small>Cadastrar e gerar QR Code</small></div><ArrowUpRight size={15} /></Link>}
            <Link href="/encontros?novo=1"><span><CalendarDays size={18} /></span><div><strong>Novo encontro</strong><small>Planejar conteúdo e chamada</small></div><ArrowUpRight size={15} /></Link>
            <Link href="/encontros"><span><QrCode size={18} /></span><div><strong>Abrir chamada</strong><small>Ler QR Code ou registrar manualmente</small></div><ArrowUpRight size={15} /></Link>
            {session.role !== "CATECHIST" && <Link href="/relatorios"><span><FileText size={18} /></span><div><strong>Ver relatórios</strong><small>Acompanhar frequência das turmas</small></div><ArrowUpRight size={15} /></Link>}
          </div>
        </section>
        <section className="risk-panel">
          <div className="section-heading"><div><span>Acompanhamento</span><h2>Alertas de frequência</h2></div><Link href="/relatorios">Ver relatório</Link></div>
          <div className="risk-list">
            {atRiskRows.slice(0, 4).map(item => <article key={`${item.catechumenId}:${item.classId}`}><span><TriangleAlert size={15} /></span><div><strong>{item.catechumen.fullName}</strong><small>{item.class.name}</small></div><b>{item.rate}%</b></article>)}
            {!atRiskRows.length && <div className="risk-empty"><ClipboardCheck size={20} /><span>Nenhum alerta neste período.</span></div>}
          </div>
        </section>
      </div>

      <div className="faith-dashboard-grid">
        <section className="faith-panel faith-frequency-panel">
          <div className="faith-panel-header">
            <div>
              <p>Participação</p>
              <h2>Frequência mensal</h2>
            </div>
            <div className="faith-chart-legend" aria-label="Legenda do gráfico">
              <span><i /> Presenças</span>
              <span><i /> Faltas</span>
            </div>
          </div>
          <div
            className="faith-chart"
            role="img"
            aria-label="Comparativo de presenças e faltas de maio até o período atual"
          >
            {chartValues.map((value, index) => (
              <div className="faith-bar-group" key={chartLabels[index]}>
                <div className="faith-bar-area">
                  <i
                    className="faith-bar-present"
                    style={{ height: `${Math.max(value, 4)}%` }}
                  />
                  <i
                    className="faith-bar-absent"
                    style={{ height: `${Math.max(100 - value, 4)}%` }}
                  />
                </div>
                {index === chartValues.length - 1 && (
                  <strong>{value}%</strong>
                )}
                <span>{chartLabels[index]}</span>
              </div>
            ))}
          </div>
          <p className="faith-chart-note">
            Dados reais dos encontros encerrados nos últimos sete meses.
          </p>
        </section>

        <section className="faith-panel faith-meetings-panel">
          <div className="faith-panel-header">
            <div>
              <p>Agenda pastoral</p>
              <h2>Próximos encontros</h2>
            </div>
            <Link href="/encontros">Ver agenda</Link>
          </div>
          <div className="faith-meeting-list">
            {upcoming.map((meeting) => (
              <article className="faith-meeting-item" key={meeting.id}>
                <div className="faith-date">
                  <strong>
                    {String(meeting.date.getUTCDate()).padStart(2, "0")}
                  </strong>
                  <span>{monthFormatter.format(meeting.date)}</span>
                </div>
                <div>
                  <h3>{meeting.theme}</h3>
                  <p>{meeting.class.name}</p>
                  <span className="faith-time">
                    <Clock3 size={12} /> {meeting.startTime}
                  </span>
                </div>
                <span className="faith-status">Agendado</span>
              </article>
            ))}
            {!upcoming.length && (
              <div className="faith-empty">Nenhum encontro futuro.</div>
            )}
          </div>
        </section>
      </div>

      <div className="faith-dashboard-grid">
        <section className="faith-panel faith-classes-panel">
          <div className="faith-panel-header">
            <div>
              <p>Visão das equipes</p>
              <h2>Acompanhamento das turmas</h2>
            </div>
            <Link href="/turmas">Ver turmas</Link>
          </div>
          <div className="faith-class-list">
            {classRows.map((classItem, index) => (
              <article className="faith-class-item" key={classItem.id}>
                <span className={`faith-class-mark tone-${(index % 4) + 1}`}>
                  {classItem.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="faith-class-copy">
                  <h3>{classItem.name}</h3>
                  <p><MapPin size={12} /> {classItem.location}</p>
                </div>
                <div className="faith-class-number">
                  <strong>{classItem._count.enrollments}</strong>
                  <span>alunos</span>
                </div>
                <div className="faith-class-number">
                  <strong>{classItem._count.attendances}</strong>
                  <span>presenças</span>
                </div>
              </article>
            ))}
            {!classRows.length && (
              <div className="faith-empty">Nenhuma turma ativa.</div>
            )}
          </div>
        </section>

      </div>
    </AppShell>
  );
}
