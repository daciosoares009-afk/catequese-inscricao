import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/login/actions";
import { getSession } from "@/lib/auth";

const messages: Record<string, string> = {
  "dados-invalidos": "Informe um e-mail válido e sua senha.",
  credenciais: "E-mail ou senha incorretos.",
  bloqueado: "Muitas tentativas. Aguarde um pouco antes de tentar novamente.",
  "banco-indisponivel": "Não foi possível conectar ao banco agora. Tente novamente em instantes.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; aguarde?: string; cadastro?: string }>;
}) {
  const { erro, aguarde, cadastro } = await searchParams;
  if (await getSession()) redirect("/dashboard");
  const waitSeconds = Number(aguarde);
  const errorMessage =
    erro === "bloqueado" && Number.isInteger(waitSeconds) && waitSeconds > 0
      ? `Muitas tentativas. Aguarde ${waitSeconds} segundos antes de tentar novamente.`
      : messages[erro ?? ""] ?? (erro ? "Não foi possível entrar. Tente novamente." : null);

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <aside className="login-showcase" aria-label="Paróquia São João Batista">
          <div className="login-brand">
            <Image
              src="/images/logo-sao-joao.jpg"
              alt=""
              width={52}
              height={52}
              className="login-logo"
              priority
            />
            <span>Paróquia São João Batista</span>
          </div>
          <div className="login-showcase-copy">
            <span className="login-showcase-kicker">Pastoral da Crisma</span>
            <h2>Uma comunidade que cresce na fé.</h2>
            <p>Organização e cuidado para acompanhar cada passo da caminhada de catequese.</p>
          </div>
          <div className="login-showcase-footer">
            <span className="login-cross" aria-hidden="true">✝</span>
            <span>“Permanecei no meu amor.”<small>João 15, 9</small></span>
          </div>
        </aside>

        <div className="login-panel">
          <div className="login-panel-heading">
            <span className="login-eyebrow">Área da equipe</span>
            <h1 id="login-title">Bem-vindo(a)</h1>
            <p className="login-description">Entre com seus dados para continuar.</p>
          </div>

          {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}
          {cadastro === "pendente" && (
            <p className="login-success" role="status">
              Cadastro recebido. Um administrador precisa liberar seu acesso antes do primeiro login.
            </p>
          )}

          <form action={login} className="login-form">
            <label htmlFor="email">E-mail</label>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
              <input id="email" name="email" type="email" placeholder="voce@exemplo.com" autoComplete="username" autoCapitalize="none" required />
            </div>
            <label htmlFor="password">Senha</label>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg>
              <input id="password" name="password" type="password" placeholder="Digite sua senha" autoComplete="current-password" required />
            </div>
            <button type="submit" className="login-submit">
              Entrar no sistema <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="login-footnote">O acesso às contas novas depende da aprovação de um administrador.</p>
          <p className="login-switch">Ainda não tem acesso? <Link href="/cadastro">Solicitar cadastro</Link></p>
          <div className="login-secure"><span aria-hidden="true">✓</span> Ambiente restrito à equipe pastoral</div>
        </div>
      </section>
    </main>
  );
}
