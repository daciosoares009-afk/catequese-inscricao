"use client";

import { useEffect, useState } from "react";
import { Check, Download, Info, MonitorSmartphone, Share, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return "prompt" in event && typeof event.prompt === "function";
}

export default function PwaInstallGuide() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone =
      "standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone || iosStandalone);

    const captureInstallPrompt = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setIsInstalled(true);
      setInstallPrompt(null);
    } catch (error) {
      console.error("Não foi possível iniciar a instalação do aplicativo.", error);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className="pwa-install-guide" aria-labelledby="pwa-install-title">
      <div className="pwa-install-heading">
        <span className="pwa-install-icon"><Download size={20} /></span>
        <div>
          <span className="page-kicker">Acesso rápido</span>
          <h2 id="pwa-install-title">Instale no seu celular</h2>
          <p>Adicione o PSJB-Crisma à tela inicial para abrir como um aplicativo.</p>
        </div>
      </div>

      {isInstalled ? (
        <p className="pwa-installed-status" role="status">
          <Check size={17} /> O PSJB-Crisma já está instalado neste dispositivo.
        </p>
      ) : installPrompt ? (
        <button className="btn btn-primary pwa-native-install" onClick={installApp} disabled={installing}>
          <Download size={17} />
          {installing ? "Aguardando confirmação..." : "Instalar aplicativo"}
        </button>
      ) : (
        <p className="pwa-install-hint">
          <Info size={16} />
          {`Se a opção de instalação não aparecer, use o menu do navegador indicado abaixo.`}
        </p>
      )}

      <div className="pwa-platform-grid">
        <article className="pwa-platform-card">
          <div className="pwa-platform-title"><Smartphone size={19} /><h3>Android</h3></div>
          <ol>
            <li>Abra este endereço no Chrome.</li>
            <li>Toque no menu <strong>⋮</strong> no canto superior.</li>
            <li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong> e confirme.</li>
          </ol>
        </article>

        <article className="pwa-platform-card">
          <div className="pwa-platform-title"><Share size={19} /><h3>iPhone ou iPad</h3></div>
          <ol>
            <li>Abra este endereço no Safari.</li>
            <li>Toque em <strong>Compartilhar</strong> <Share size={13} aria-label="Compartilhar" />.</li>
            <li>Role as opções e escolha <strong>Adicionar à Tela de Início</strong>; toque em <strong>Adicionar</strong>.</li>
          </ol>
          <p>No iPhone, a instalação deve ser feita pelo Safari.</p>
        </article>
      </div>

      {!installPrompt && !isInstalled && (
        <p className="pwa-desktop-hint">
          <MonitorSmartphone size={16} />
          No computador, procure <strong>Instalar página como app</strong> no menu do Chrome ou Edge.
        </p>
      )}
    </section>
  );
}
