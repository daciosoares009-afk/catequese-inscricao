import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Megaphone,
  Plus,
  ShieldCheck,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react";
import AppShell from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import {
  catechistCatechumenFilter,
  catechistClassFilter,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/format";
import { frequencySummary } from "@/utils/frequency";

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

export default async function DashboardPage() {
  const session = await requireSession();
  const classFilter = catechistClassFilter(session);
  const catechumenFilter = catechistCatechumenFilter(session);
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const todayStart = new Date(`${localDate}T00:00:00.000Z`);
  const accessibleClassIds =
    session.role === "CATECHIST"
      ? (
          await prisma.class.findMany({
            where: { deletedAt: null, ...classFilter },
            select: { id: true },
          })
        ).map(item => item.id)
      : [];

  const [
    students,
    classes,
    attendance,
    upcoming,
    classRows,
    announcements,
    enrollments,
  ] = await Promise.all([
    prisma.catechumen.count({
      where: { deletedAt: null, status: "ACTIVE", ...catechumenFilter },
    }),
    prisma.class.count({
      where: { deletedAt: null, status: "ACTIVE", ...classFilter },
    }),
    prisma.attendance.findMany({
      where: { class: classFilter, meeting: { status: "CLOSED", deletedAt: null } },
      select: { catechumenId: true, classId: true, status: true, meeting: { select: { date: true } } },
    }),
    prisma.meeting.findMany({
      where: {
        deletedAt: null,
        date: { gte: todayStart },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        class: classFilter,
      },
      include: { class: true },
      orderBy: { date: "asc" },
      take: 4,
    }),
    prisma.class.findMany({
      where: { deletedAt: null, status: "ACTIVE", ...classFilter },
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
    prisma.announcement.findMany({
      where: {
        deletedAt: null,
        ...(session.role === "CATECHIST"
          ? {
              OR: [
                { recipientType: "ALL" },
                { recipientType: "CATECHISTS" },
                { recipientType: "CLASS", recipientId: { in: accessibleClassIds } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.enrollment.findMany({
      where: { status: "ACTIVE", class: classFilter },
      select: { catechumenId: true, classId: true },
    }),
  ]);

  const { rate } = frequencySummary(attendance.map((item) => item.status));
  const atRisk = enrollments.filter((enrollment) => {
    const own = attendance.filter(
      (item) =>
        item.catechumenId === enrollment.catechumenId &&
        item.classId === enrollment.classId,
    );
    return (
      own.length > 0 &&
      frequencySummary(own.map((item) => item.status)).rate < 75
    );
  }).length;

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
      trend: "Ano pastoral 2026",
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

      <section className="faith-stats" aria-label="Indicadores principais">
        {stats.map(({ label, value, trend, icon: Icon, tone }) => (
          <article className={`faith-stat faith-stat-${tone}`} key={label}>
            <div className="faith-stat-top">
              <span className="faith-stat-icon">
                <Icon size={18} />
              </span>
              <ArrowUpRight size={15} />
            </div>
            <span className="faith-stat-value">{value}</span>
            <h2>{label}</h2>
            <p>{trend}</p>
          </article>
        ))}
      </section>

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

        <section className="faith-panel faith-announcements-panel">
          <div className="faith-panel-header">
            <div>
              <p>Mural</p>
              <h2>Comunicados recentes</h2>
            </div>
            <Link href="/comunicados">Ver todos</Link>
          </div>
          <div className="faith-announcement-list">
            {announcements.map((announcement) => (
              <article
                className="faith-announcement-item"
                key={announcement.id}
              >
                <span className="faith-announcement-icon">
                  <Megaphone size={15} />
                </span>
                <div>
                  <div className="faith-announcement-title">
                    <h3>{announcement.title}</h3>
                    <span
                      className={
                        announcement.priority === "URGENT" ? "urgent" : ""
                      }
                    >
                      {announcement.priority === "URGENT"
                        ? "Urgente"
                        : "Normal"}
                    </span>
                  </div>
                  <p>{announcement.message.slice(0, 105)}</p>
                  <small>
                    <Check size={11} />
                    Para:{" "}
                    {announcement.recipientType === "CATECHISTS"
                      ? "Catequistas"
                      : announcement.recipientType === "CLASS"
                        ? "Turma"
                        : announcement.recipientType === "COMMUNITY"
                          ? "Comunidade"
                          : "Todos"}
                  </small>
                </div>
              </article>
            ))}
            {!announcements.length && (
              <div className="faith-empty">Nenhum comunicado recente.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
