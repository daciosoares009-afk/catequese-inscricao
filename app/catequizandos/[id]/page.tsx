/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { RefreshCw } from "lucide-react";
import AppShell from "@/components/app-shell";
import { DownloadQrPdfButton } from "@/components/download-qr-pdf-button";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistCatechumenFilter } from "@/lib/access";
import {
  archiveCatechumen,
  regenerateQr,
  updateCatechumenName,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function CatechumenProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await requireSession();
  const item = await prisma.catechumen.findFirst({
    where: { id, deletedAt: null, ...catechistCatechumenFilter(session) },
    select: {
      id: true,
      fullName: true,
      qrCode: { select: { token: true } },
    },
  });

  if (!item) notFound();

  const qrDataUrl = item.qrCode
    ? await QRCode.toDataURL(item.qrCode.token, {
        width: 640,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#12395fff", light: "#ffffffff" },
      })
    : "";

  return (
    <AppShell current="/catequizandos">
      <PageHeader
        title={item.fullName}
        description="QR Code individual do catequizando"
      />
      {query.erro && <div className="alert error">Informe um nome válido.</div>}
      {query.sucesso && <div className="alert success">Dados atualizados com sucesso.</div>}
      <section className="card qr-download-card">
        <h2>{item.fullName}</h2>
        {qrDataUrl ? (
          <>
            <div className="qr-download-image">
              <img
                src={qrDataUrl}
                alt={`QR Code de ${item.fullName}`}
                width={300}
                height={300}
              />
            </div>
            <DownloadQrPdfButton
              fullName={item.fullName}
              href={`/api/catequizandos/${item.id}/qr-pdf`}
            />
            {session.role !== "CATECHIST" && (
              <form action={regenerateQr.bind(null, item.id)}>
                <button className="btn btn-secondary no-print">
                  <RefreshCw size={14} />
                  Gerar um novo QR Code
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <div className="empty">QR Code ainda não gerado.</div>
            {session.role !== "CATECHIST" && (
              <form action={regenerateQr.bind(null, item.id)}>
                <button className="btn btn-primary">Gerar QR Code</button>
              </form>
            )}
          </>
        )}
        {session.role !== "CATECHIST" && (
          <div className="qr-management no-print">
            <form action={updateCatechumenName.bind(null, item.id)} className="inline-form">
              <input
                name="fullName"
                defaultValue={item.fullName}
                minLength={3}
                maxLength={160}
                required
                aria-label="Nome completo"
              />
              <button className="btn btn-secondary">Atualizar nome</button>
            </form>
            <details>
              <summary>Arquivar catequizando</summary>
              <p>O cadastro sairá das listas e o QR Code será desativado.</p>
              <form action={archiveCatechumen.bind(null, item.id)}>
                <button className="btn btn-danger">Confirmar arquivamento</button>
              </form>
            </details>
          </div>
        )}
      </section>
    </AppShell>
  );
}
