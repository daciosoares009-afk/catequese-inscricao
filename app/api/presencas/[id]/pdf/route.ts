import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getSession } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { prisma } from "@/lib/prisma";

function attendanceLabel(status: string | undefined) {
  switch (status) {
    case "PRESENT": return "Presente";
    case "LATE": return "Atrasado";
    case "ABSENT": return "Falta";
    case "JUSTIFIED": return "Justificado";
    case "LEFT_EARLY": return "Saiu antes";
    default: return "Pendente";
  }
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const meeting = await prisma.meeting.findFirst({
    where: { id, deletedAt: null },
    include: {
      class: {
        include: {
          enrollments: {
            where: { status: "ACTIVE", deletedAt: null },
            include: { catechumen: { select: { fullName: true } } },
            orderBy: { catechumen: { fullName: "asc" } },
          },
        },
      },
      attendances: {
        select: { catechumenId: true, status: true, justification: true },
      },
    },
  });
  if (!meeting || !(await canAccessClass(session, meeting.classId))) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const records = new Map(meeting.attendances.map(record => [record.catechumenId, record]));
  const rows = meeting.class.enrollments.map(enrollment => ({
    name: enrollment.catechumen.fullName,
    status: attendanceLabel(records.get(enrollment.catechumenId)?.status),
    justification: records.get(enrollment.catechumenId)?.justification || "—",
  }));
  const present = meeting.attendances.filter(record => ["PRESENT", "LATE"].includes(record.status)).length;
  const absent = meeting.attendances.filter(record => record.status === "ABSENT").length;
  const justified = meeting.attendances.filter(record => record.status === "JUSTIFIED").length;
  const pending = Math.max(rows.length - meeting.attendances.length, 0);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const columns = [
    { label: "Catequizando", width: 72 },
    { label: "Situação", width: 38 },
    { label: "Justificativa", width: 74 },
  ];
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);

  const drawHeader = (pageNumber: number) => {
    pdf.setTextColor(143, 38, 56);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.text("Frequência do encontro", margin, 17);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(75, 84, 78);
    pdf.text(meeting.theme, margin, 24);
    pdf.text(`${meeting.class.name} · ${meeting.date.toLocaleDateString("pt-BR", { timeZone: "UTC" })} · ${meeting.startTime}`, margin, 30);
    pdf.text(
      `${rows.length} catequizando(s) · ${present} presente(s) · ${absent} falta(s) · ${justified} justificado(s) · ${pending} pendente(s)`,
      margin,
      36,
    );
    if (pageNumber > 1) {
      pdf.setFontSize(8);
      pdf.text(`Página ${pageNumber}`, pageWidth - margin, 17, { align: "right" });
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
  drawHeader(pageNumber);
  let y = drawTableHeader(42);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const values = [row.name, row.status, row.justification];
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
      drawHeader(pageNumber);
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
    pdf.text("Esta turma não possui catequizandos ativos.", margin, y + 10);
  }
  pdf.setFontSize(8);
  pdf.setTextColor(110, 123, 115);
  pdf.text(`Paróquia São João Batista · ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: "right" });

  const bytes = new Uint8Array(pdf.output("arraybuffer"));
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="frequencia-encontro.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
