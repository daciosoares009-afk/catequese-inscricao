import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canAccessCatechumen } from "@/lib/access";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await canAccessCatechumen(session, id))) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  const item = await prisma.catechumen.findFirst({
    where: { id, deletedAt: null },
    select: { fullName: true, qrCode: { select: { token: true } } },
  });
  if (!item?.qrCode) {
    return NextResponse.json({ error: "QR Code não disponível" }, { status: 404 });
  }

  const qrDataUrl = await QRCode.toDataURL(item.qrCode.token, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#12395fff", light: "#ffffffff" },
  });
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [105, 148],
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setTextColor(18, 57, 95);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  const nameLines = pdf.splitTextToSize(item.fullName, 85);
  const nameHeight = nameLines.length * 7;
  pdf.text(nameLines, pageWidth / 2, 25, { align: "center" });
  pdf.addImage(qrDataUrl, "PNG", (pageWidth - 62) / 2, 38 + nameHeight, 62, 62);

  const fileName =
    item.fullName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "catequizando";
  const bytes = new Uint8Array(pdf.output("arraybuffer"));

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="qr-code-${fileName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
