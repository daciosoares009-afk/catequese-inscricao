import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.class.findFirst({
    where: { id, deletedAt: null, ...catechistClassFilter(session) },
    select: {
      name: true,
      enrollments: {
        where: {
          status: "ACTIVE",
          deletedAt: null,
          catechumen: { is: { deletedAt: null, status: { not: "INACTIVE" } } },
        },
        orderBy: { catechumen: { fullName: "asc" } },
        select: {
          catechumen: {
            select: {
              fullName: true,
              qrCode: { select: { token: true, active: true, expiresAt: true } },
            },
          },
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
  }
  if (!item.enrollments.length) {
    return NextResponse.json(
      { error: "A turma não possui alunos matriculados." },
      { status: 404 },
    );
  }

  const now = new Date();
  const qrStudents = item.enrollments.flatMap(({ catechumen }) =>
    catechumen.qrCode?.active && catechumen.qrCode.expiresAt > now
      ? [{ fullName: catechumen.fullName, token: catechumen.qrCode.token }]
      : [],
  );
  const missingQrCodes = item.enrollments
    .filter(({ catechumen }) =>
      !catechumen.qrCode?.active || catechumen.qrCode.expiresAt <= now,
    )
    .map(({ catechumen }) => catechumen.fullName);

  if (missingQrCodes.length) {
    return NextResponse.json(
      {
        error: "Há alunos sem QR Code ativo e válido.",
        students: missingQrCodes,
      },
      { status: 409 },
    );
  }

  const qrImages = await Promise.all(
    qrStudents.map(({ token }) =>
      QRCode.toDataURL(token, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#12395fff", light: "#ffffffff" },
      }),
    ),
  );

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const columns = 2;
  const rowsPerPage = 3;
  const cardWidth = 92;
  const cardHeight = 96;
  const columnGap = 6;
  const rowGap = 5;
  const leftMargin = 10;
  const topMargin = 8;

  qrStudents.forEach(({ fullName }, index) => {
    const indexOnPage = index % (columns * rowsPerPage);
    if (index > 0 && indexOnPage === 0) pdf.addPage();

    const column = indexOnPage % columns;
    const row = Math.floor(indexOnPage / columns);
    const x = leftMargin + column * (cardWidth + columnGap);
    const y = topMargin + row * (cardHeight + rowGap);
    const nameLines = pdf.splitTextToSize(fullName, cardWidth - 10);
    const qrSize = 38;
    const qrY = y + 18 + nameLines.length * 5;

    pdf.setDrawColor(197, 211, 225);
    pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2);
    pdf.setTextColor(18, 57, 95);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(nameLines, x + cardWidth / 2, y + 9, {
      align: "center",
      lineHeightFactor: 1.15,
    });
    pdf.addImage(
      qrImages[index],
      "PNG",
      x + (cardWidth - qrSize) / 2,
      qrY,
      qrSize,
      qrSize,
    );

    const footerY = qrY + qrSize + 4;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.text("PSJB - CRISMA 2026", x + cardWidth / 2, footerY, {
      align: "center",
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.2);
    const footerVerseLines = pdf.splitTextToSize(
      "Ide por todo o mundo e pregai o evangelho a toda criatura. (Mc 16:15)",
      cardWidth - 8,
    );
    pdf.text(footerVerseLines, x + cardWidth / 2, footerY + 5, {
      align: "center",
      lineHeightFactor: 1.1,
    });
  });

  const fileName =
    item.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "turma";
  const bytes = new Uint8Array(pdf.output("arraybuffer"));

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="qr-codes-${fileName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
