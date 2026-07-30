"use client";
import { useActionState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { loginAction } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  return <form action={action} className="login-form">
    {state.error && <div className="alert error">{state.error}</div>}
    <div className="field"><label htmlFor="email">E-mail</label><div style={{ position: "relative" }}><Mail size={16} style={{ position: "absolute", left: 13, top: 14, color: "#8795a4" }} /><input id="email" name="email" type="email" autoComplete="email" placeholder="seuemail@paroquia.org" style={{ paddingLeft: 40 }} required /></div></div>
    <div className="field"><label htmlFor="password">Senha</label><div style={{ position: "relative" }}><LockKeyhole size={16} style={{ position: "absolute", left: 13, top: 14, color: "#8795a4" }} /><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Sua senha" style={{ paddingLeft: 40 }} required /></div></div>
    <div className="login-help"><label className="checkbox"><input type="checkbox" />Lembrar de mim</label><a href="mailto:admin@catequesepresente.com">Esqueci minha senha</a></div>
    <button className="btn btn-primary" disabled={pending}>{pending ? "Entrando..." : "Entrar no sistema"}</button>
  </form>;
}
