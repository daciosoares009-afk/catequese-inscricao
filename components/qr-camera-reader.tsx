"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  Camera,
  CameraOff,
  Keyboard,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { registerByToken } from "@/app/presencas/actions";

type ScannerStatus =
  | "idle"
  | "requesting"
  | "scanning"
  | "submitting"
  | "denied"
  | "error";

export function QrCameraReader({ meetingId }: { meetingId: string }) {
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scannedRef = useRef(false);
  const action = registerByToken.bind(null, meetingId);

  function stopCamera(nextStatus: ScannerStatus = "idle") {
    controlsRef.current?.stop();
    controlsRef.current = null;

    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    if (nextStatus !== "submitting") scannedRef.current = false;
    setStatus(nextStatus);
  }

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  async function openCamera() {
    setMessage("");
    scannedRef.current = false;

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setStatus("error");
      setMessage("A câmera exige uma conexão segura (HTTPS).");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Este navegador não oferece acesso à câmera.");
      return;
    }

    setStatus("requesting");
    try {
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current ?? undefined,
        (result, _error, activeControls) => {
          if (!result || scannedRef.current) return;

          const token = result.getText().trim();
          if (token.length < 32 || token.length > 128) {
            setMessage("Este QR Code não pertence ao sistema.");
            return;
          }

          scannedRef.current = true;
          activeControls.stop();
          if (tokenRef.current && formRef.current) {
            tokenRef.current.value = token;
            setStatus("submitting");
            setMessage("Código reconhecido. Registrando presença…");
            formRef.current.requestSubmit();
          }
        },
      );

      controlsRef.current = controls;
      setStatus("scanning");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setStatus("denied");
        setMessage(
          "Acesso à câmera negado. Autorize a câmera nas permissões do navegador e tente novamente.",
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setStatus("error");
        setMessage("Nenhuma câmera foi encontrada neste aparelho.");
      } else {
        setStatus("error");
        setMessage("Não foi possível abrir a câmera. Tente novamente.");
      }
    }
  }

  const cameraOpen =
    status === "requesting" ||
    status === "scanning" ||
    status === "submitting";

  return (
    <section className="card qr-reader-card">
      <div className="qr-reader-intro">
        <span className="qr-reader-icon">
          <ScanLine size={22} />
        </span>
        <div>
          <strong>Leitura por QR Code</strong>
          <small>
            Abra a câmera do celular e aponte para a carteirinha do
            catequizando.
          </small>
        </div>
        {!cameraOpen ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCamera}
          >
            <Camera size={17} />
            Abrir câmera
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => stopCamera()}
            disabled={status === "submitting"}
          >
            <CameraOff size={17} />
            Fechar câmera
          </button>
        )}
      </div>

      <form ref={formRef} action={action} className="qr-camera-form">
        <input ref={tokenRef} type="hidden" name="token" />
      </form>

      {cameraOpen && (
        <div className="qr-camera-stage" aria-live="polite">
          <video
            ref={videoRef}
            className="qr-camera-video"
            muted
            playsInline
            aria-label="Imagem da câmera para leitura do QR Code"
          />
          <div className="qr-camera-mask" aria-hidden="true">
            <span />
          </div>
          <div className="qr-camera-status">
            {status === "requesting" && (
              <>
                <LoaderCircle className="spin" size={16} />
                Autorize o acesso à câmera no aviso do navegador.
              </>
            )}
            {status === "scanning" && (
              <>
                <ScanLine size={16} />
                Posicione o QR Code dentro do quadrado.
              </>
            )}
            {status === "submitting" && (
              <>
                <LoaderCircle className="spin" size={16} />
                Registrando presença…
              </>
            )}
          </div>
        </div>
      )}

      {message && (
        <div
          className={`qr-reader-message ${
            status === "denied" || status === "error" ? "error" : ""
          }`}
          role="status"
        >
          {status === "submitting" ? (
            <ShieldCheck size={15} />
          ) : (
            <CameraOff size={15} />
          )}
          {message}
        </div>
      )}

      <details className="qr-manual">
        <summary>
          <Keyboard size={15} />
          Digitar ou usar leitor externo
        </summary>
        <form action={action}>
          <input
            name="token"
            placeholder="Token seguro do QR Code"
            minLength={32}
            maxLength={128}
            required
          />
          <button className="btn btn-secondary">Confirmar</button>
        </form>
      </details>
    </section>
  );
}
