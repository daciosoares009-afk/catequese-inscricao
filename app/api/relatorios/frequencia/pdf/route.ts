import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { frequencySummary } from "@/utils/frequency";

function dateFilter(value: string | null, endOfDay = false) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (session.role !== "ADMIN" && session.role !== "COORDINATOR") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const start = dateFilter(params.get("inicio"));
  const end = dateFilter(params.get("fim"), true);
  if (start === null || end === null || (start && end && start > end)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }

  const classId = params.get("classId") || undefined;
  const sacramentId = params.get("sacramentId") || undefined;
  const search = params.get("q") || undefined;
  const classScope = catechistClassFilter(session);
  const date = start || end ? { gte: start, lte: end } : undefined;
  const [enrollments, attendances, selectedClass] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        classId,
        class: { ...classScope, sacramentId },
        catechumen: {
          fullName: search ? { contains: search, mode: "insensitive" } : undefined,
        },
      },
      include: {
        catechumen: { select: { fullName: true } },
        class: { include: { sacrament: { select: { name: true } } } },
      },
      orderBy: { catechumen: { fullName: "asc" } },
    }),
    prisma.attendance.findMany({
      where: {
        classId,
        class: { ...classScope, sacramentId },
        meeting: { status: "CLOSED", deletedAt: null, date },
      },
      select: { catechumenId: true, classId: true, status: true },
    }),
    classId
      ? prisma.class.findFirst({
        where: { id: classId, deletedAt: null, ...classScope },
        select: {
          name: true,
          catechists: {
            include: {
              catechist: {
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
      })
      : null,
  ]);

  const catechistNames = selectedClass
    ? [...new Set(
      selectedClass.catechists
        .map(({ catechist }) => catechist.user.name)
        .filter(Boolean),
    )]
    : [];
  const catechistLabel = selectedClass
    ? catechistNames.length
      ? catechistNames.join(", ")
      : "não informado"
    : "todas as turmas";

  const rows = enrollments.map(enrollment => {
    const records = attendances.filter(
      attendance =>
        attendance.catechumenId === enrollment.catechumenId &&
        attendance.classId === enrollment.classId,
    );
    const summary = frequencySummary(records.map(record => record.status));
    return {
      name: enrollment.catechumen.fullName,
      className: enrollment.class.name,
      sacramentName: enrollment.class.sacrament.name,
      ...summary,
    };
  });
  const overall = frequencySummary(attendances.map(record => record.status));

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const columns = [
    { label: "Catequizando", width: 63 },
    { label: "Turma", width: 56 },
    { label: "Sacramento", width: 48 },
    { label: "Presenças", width: 27 },
    { label: "Faltas", width: 25 },
    { label: "Frequência", width: 27 },
    { label: "Situação", width: 27 },
  ];
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);

  const drawPageHeader = (pageNumber: number) => {
    pdf.setTextColor(143, 38, 56);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Relatório de frequência", margin, 17);
    pdf.setTextColor(85, 93, 88);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const period = start || end
      ? `Período: ${start ? start.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "início"} a ${end ? end.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "hoje"}`
      : "Período: todos os encontros encerrados";
    pdf.text(period, margin, 24);
    pdf.text(`Catequista: ${catechistLabel}`, margin, 30);
    pdf.text(
      `${rows.length} catequizando(s) · Frequência geral: ${overall.rate}% · ${overall.total} registro(s)`,
      margin,
      36,
    );
    if (pageNumber > 1) {
      pdf.setFontSize(8);
      pdf.text(`Continuação · página ${pageNumber}`, pageWidth - margin, 17, { align: "right" });
    }
  };

  const drawTableHeader = (y: number) => {
    pdf.setFillColor(143, 38, 56);
    pdf.rect(margin, y, tableWidth, 9, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    let x = margin;
    for (const column of columns) {
      pdf.text(column.label, x + 2, y + 6);
      x += column.width;
    }
    return y + 9;
  };

  let pageNumber = 1;
  drawPageHeader(pageNumber);
  let y = drawTableHeader(42);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const situation = row.total === 0 ? "Sem registros" : row.rate < 75 ? "Acompanhar" : "Regular";
    const values = [
      row.name,
      row.className,
      row.sacramentName,
      String(row.present),
      String(row.absent),
      `${row.rate}%`,
      situation,
    ];
    const wrapped = values.map((value, index) =>
      pdf.splitTextToSize(value, columns[index].width - 4) as string[],
    );
    const rowHeight = Math.max(8, ...wrapped.map(lines => lines.length * 3.5 + 3));
    if (y + rowHeight > pageHeight - 15) {
      pdf.setFontSize(8);
      pdf.setTextColor(110, 123, 115);
      pdf.text(`Paróquia São João Batista · ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: "right" });
      pdf.addPage();
      pageNumber += 1;
      drawPageHeader(pageNumber);
      y = drawTableHeader(42);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
    }
    if (rowIndex % 2 === 1) {
      pdf.setFillColor(250, 248, 242);
      pdf.rect(margin, y, tableWidth, rowHeight, "F");
    }
    pdf.setDrawColor(227, 227, 219);
    pdf.line(margin, y + rowHeight, margin + tableWidth, y + rowHeight);
    pdf.setTextColor(39, 48, 42);
    let x = margin;
    for (let index = 0; index < values.length; index += 1) {
      pdf.text(wrapped[index], x + 2, y + 5);
      x += columns[index].width;
    }
    y += rowHeight;
  }

  if (!rows.length) {
    pdf.setTextColor(100, 110, 103);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Nenhum catequizando encontrado para os filtros selecionados.", margin, y + 10);
  }
  pdf.setFontSize(8);
  pdf.setTextColor(110, 123, 115);
  pdf.text(`Paróquia São João Batista · ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: "right" });

  const bytes = new Uint8Array(pdf.output("arraybuffer"));
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="frequencia.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
