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
        <Image
          src="/images/logo-sao-joao.jpg"
          alt="Paróquia São João Batista"
          width={72}
          height={72}
          className="login-logo"
          priority
        />
        <span className="login-eyebrow">Paróquia São João Batista</span>
        <h1 id="login-title">PSJB-Crisma</h1>
        <p className="login-description">
          Entre com seu e-mail e senha para acessar o sistema.
        </p>

        {errorMessage && (
          <p className="login-error" role="alert">
            {errorMessage}
          </p>
        )}
        {cadastro === "pendente" && (
          <p className="login-success" role="status">
            Cadastro recebido. Um administrador precisa liberar seu acesso antes do primeiro login.
          </p>
        )}

        <form action={login} className="login-form">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            required
          />
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <button type="submit" className="login-submit">
            Entrar
          </button>
        </form>
        <p className="login-footnote">
          O acesso às contas novas depende da aprovação de um administrador.
        </p>
        <p className="login-switch">
          Ainda não tem acesso? <Link href="/cadastro">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}
