"use client";
import { useActionState, useState } from "react";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { loginAction, registerAction } from "./actions";

const emptyLogin = { error: "" };
const emptyRegister = { error: "", success: false };

export default function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginSubmit, loginPending] = useActionState(loginAction, emptyLogin);
  const [registerState, registerSubmit, registerPending] = useActionState(registerAction, emptyRegister);

  function showLogin() {
    setMode("login");
  }

  return mode === "login" ? <>
    <span className="login-welcome">Acesso à plataforma</span><h2>Que bom ter você aqui.</h2><p className="login-intro">Entre com seus dados para continuar a missão.</p>
    <form action={loginSubmit} className="login-form">
      {registerState.success && <div className="alert success" role="status">Conta criada com sucesso! Entre com seu e-mail e senha.</div>}
      {loginState.error && <div className="alert error" role="alert">{loginState.error}</div>}
      <div className="field"><label htmlFor="email">E-mail</label><div style={{ position: "relative" }}><Mail size={16} style={{ position: "absolute", left: 13, top: 14, color: "#8795a4" }} /><input id="email" name="email" type="email" autoComplete="email" placeholder="seuemail@paroquia.org" style={{ paddingLeft: 40 }} required /></div></div>
      <div className="field"><label htmlFor="password">Senha</label><div style={{ position: "relative" }}><LockKeyhole size={16} style={{ position: "absolute", left: 13, top: 14, color: "#8795a4" }} /><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Sua senha" style={{ paddingLeft: 40 }} required /></div></div>
      <div className="login-help"><label className="checkbox"><input name="remember" type="checkbox" />Lembrar de mim por 30 dias</label><a href="mailto:admin@catequesepresente.com">Esqueci minha senha</a></div>
      <button className="btn btn-primary" disabled={loginPending}>{loginPending ? "Entrando..." : "Entrar no sistema"}</button>
    </form>
    <p className="login-switch">Não tem uma conta? <button type="button" onClick={() => setMode("register")}>Criar conta</button></p>
  </> : <>
    <span className="login-welcome">Nova conta</span><h2>Vamos começar?</h2><p className="login-intro">Crie seu acesso para continuar a missão.</p>
    <form action={registerSubmit} className="login-form" aria-label="Formulário de criação de conta">
      {registerState.error && <div className="alert error" role="alert">{registerState.error}</div>}
      <div className="field"><label htmlFor="register-name">Nome completo</label><div className="login-input-wrap"><UserRound size={16} aria-hidden="true" /><input id="register-name" name="name" type="text" autoComplete="name" placeholder="Seu nome completo" minLength={3} maxLength={160} required /></div></div>
      <div className="field"><label htmlFor="register-email">E-mail</label><div className="login-input-wrap"><Mail size={16} aria-hidden="true" /><input id="register-email" name="email" type="email" autoComplete="email" placeholder="seuemail@paroquia.org" required /></div></div>
      <div className="field"><label htmlFor="register-password">Senha</label><div className="login-input-wrap"><LockKeyhole size={16} aria-hidden="true" /><input id="register-password" name="password" type="password" autoComplete="new-password" placeholder="Pelo menos 8 caracteres" minLength={8} maxLength={72} required /></div></div>
      <div className="field"><label htmlFor="register-confirm-password">Confirmar senha</label><div className="login-input-wrap"><LockKeyhole size={16} aria-hidden="true" /><input id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Digite a senha novamente" minLength={8} maxLength={72} required /></div></div>
      <button className="btn btn-primary" disabled={registerPending}>{registerPending ? "Criando conta..." : "Criar minha conta"}</button>
    </form>
    <p className="login-switch"><button type="button" onClick={showLogin}>Voltar ao login</button></p>
  </>;
}
