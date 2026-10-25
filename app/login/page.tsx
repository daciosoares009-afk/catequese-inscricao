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
    <main className="login-page login-signin-page">
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
            <span>Paróquia São João Batista<small>Pastoral da Crisma</small></span>
          </div>
          <div className="login-showcase-copy">
            <span className="login-showcase-kicker">Sistema de gestão da catequese</span>
            <h2>Uma caminhada de fé, vivida em comunidade.</h2>
            <p>Gestão da catequese e acompanhamento das turmas da Crisma.</p>
          </div>
          <p className="login-showcase-footer">Paróquia São João Batista</p>
        </aside>

        <div className="login-panel">
          <div className="login-panel-heading">
            <span className="login-eyebrow">Acesso da equipe</span>
            <h1 id="login-title">Entrar</h1>
            <p className="login-description">Use seu e-mail e senha cadastrados.</p>
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
              <input id="email" name="email" type="email" placeholder="voce@exemplo.com" autoComplete="username" autoCapitalize="none" required />
            </div>
            <label htmlFor="password">Senha</label>
            <div className="login-input-wrap">
              <input id="password" name="password" type="password" placeholder="Digite sua senha" autoComplete="current-password" required />
            </div>
            <button type="submit" className="login-submit">
              Entrar no sistema
            </button>
          </form>
          <p className="login-footnote">O acesso às contas novas depende da aprovação de um administrador.</p>
          <p className="login-install-link"><Link href="/instalar">Instalar no celular</Link></p>
          <p className="login-switch">Ainda não tem acesso? <Link href="/cadastro">Solicitar cadastro</Link></p>
          <p className="login-secure">Ambiente restrito à equipe pastoral</p>
        </div>
      </section>
    </main>
  );
}
