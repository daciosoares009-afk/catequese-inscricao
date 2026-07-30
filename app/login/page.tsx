import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HeartHandshake, ShieldCheck, Users } from "lucide-react";
import LoginForm from "./login-form";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return <div className="login-page">
    <section className="login-hero">
      <div className="login-brand"><span className="brand-mark">✝</span><div><strong>Catequese Presente</strong><small>GESTÃO PASTORAL</small></div></div>
      <div className="login-visual"><div className="halo halo-one" /><div className="halo halo-two" /><div className="church-window"><span>✦</span><i /><b>✝</b></div></div>
      <div className="login-copy"><div className="login-kicker">Fé que acolhe. Gestão que aproxima.</div><h1>Cada encontro deixa<br />uma marca na caminhada.</h1><p>Organize turmas, acompanhe presenças e cuide de cada história com uma plataforma pensada para a missão pastoral.</p><div className="login-features"><span><Users size={16} />Pessoas</span><span><HeartHandshake size={16} />Cuidado</span><span><ShieldCheck size={16} />Segurança</span></div></div>
      <div className="login-quote">“Onde dois ou três estiverem reunidos em meu nome, eu estarei no meio deles.” <strong>Mt 18,20</strong></div>
    </section>
    <section className="login-panel"><div className="login-box"><div className="login-mobile-brand"><span className="brand-mark">✝</span><strong>Catequese Presente</strong></div><span className="login-welcome">Acesso à plataforma</span><h2>Que bom ter você aqui.</h2><p>Entre com seus dados para continuar a missão.</p><LoginForm /><div className="login-security"><ShieldCheck size={14} /> Seus dados são protegidos e tratados com cuidado.</div><div className="login-foot">© 2026 Catequese Presente · Paróquia São José</div></div></section>
  </div>;
}
