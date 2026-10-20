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
      <section className="login-card register-card" aria-labelledby="register-title">
        <header className="register-header">
          <div className="register-brand">
            <Image
              src="/images/logo-sao-joao.jpg"
              alt=""
              width={44}
              height={44}
              className="login-logo"
              priority
            />
            <span>Paróquia São João Batista<small>Pastoral da Crisma</small></span>
          </div>
          <div className="register-heading">
            <span className="login-eyebrow">Solicitação de acesso</span>
            <h1 id="register-title">Criar conta</h1>
            <p>Informe seus dados para solicitar acesso à equipe pastoral.</p>
          </div>
        </header>

        <div className="register-content">
          {erro && (
            <p className="login-error" role="alert">
              {messages[erro] || "Não foi possível criar a conta. Confira os dados e tente novamente."}
            </p>
          )}

          <form action={selfRegister} className="register-form">
            <div className="register-field register-field-full">
              <label htmlFor="name">Nome completo</label>
              <input id="name" name="name" autoComplete="name" minLength={3} maxLength={160} placeholder="Seu nome e sobrenome" required />
            </div>

            <div className="register-field register-field-full">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" maxLength={254} placeholder="voce@exemplo.com" required />
            </div>

            <div className="register-field">
              <label htmlFor="password">Senha</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} aria-describedby="password-help" required />
              <small id="password-help">Use pelo menos 12 caracteres.</small>
            </div>

            <div className="register-field">
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={72} required />
            </div>

            <button type="submit" className="login-submit register-submit">
              Solicitar acesso
            </button>
          </form>

          <section className="register-next" aria-labelledby="register-next-title">
            <h2 id="register-next-title">Depois do envio</h2>
            <ol>
              <li>Um administrador analisará sua solicitação.</li>
              <li>Após a aprovação, você poderá entrar com estes dados.</li>
            </ol>
          </section>

          <p className="login-switch">Já tem uma conta? <Link href="/login">Entrar</Link></p>
        </div>
      </section>
    </main>
  );
}
