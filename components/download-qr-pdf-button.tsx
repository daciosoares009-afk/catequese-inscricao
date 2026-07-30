import { Download } from "lucide-react";

type DownloadQrPdfButtonProps = {
  fullName: string;
  href: string;
};

export function DownloadQrPdfButton({
  fullName,
  href,
}: DownloadQrPdfButtonProps) {
  return (
    <a
      className="btn btn-primary no-print"
      href={href}
      download
      aria-label={`Baixar QR Code de ${fullName} em PDF`}
    >
      <Download size={15} />
      Baixar QR Code em PDF
    </a>
  );
}
