import Image from "next/image";
import Link from "next/link";
import { selfRegister } from "@/app/cadastro/actions";

const messages: Record<string, string> = {
  "dados-invalidos": "Revise os campos. A senha deve ter pelo menos 12 caracteres.",
  "email-existente": "Já existe uma conta com esse e-mail. Tente entrar ou use outro endereço.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="register-title">
        <Image
          src="/images/logo-sao-joao.jpg"
          alt="Paróquia São João Batista"
          width={72}
          height={72}
          className="login-logo"
          priority
        />
        <span className="login-eyebrow">Paróquia São João Batista</span>
        <h1 id="register-title">Criar conta</h1>
        <p className="login-description">
          Solicite acesso à equipe pastoral. Um administrador liberará sua conta.
        </p>

        {erro && (
          <p className="login-error" role="alert">
            {messages[erro] || "Não foi possível criar a conta. Tente novamente."}
          </p>
        )}

        <form action={selfRegister} className="login-form">
          <label htmlFor="name">Nome completo</label>
          <input id="name" name="name" autoComplete="name" minLength={3} maxLength={160} required />

          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" maxLength={254} required />

          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required />

          <label htmlFor="confirmPassword">Confirme a senha</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={72} required />

          <button type="submit" className="login-submit">
            Solicitar cadastro
          </button>
        </form>
        <p className="login-footnote">
          A conta começa como catequista e fica bloqueada até a aprovação de um administrador.
        </p>
        <p className="login-switch">
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
