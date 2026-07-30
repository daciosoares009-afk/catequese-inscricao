import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const protectedRoutes = ["/dashboard", "/catequizandos", "/responsaveis", "/turmas", "/encontros", "/presencas", "/relatorios", "/comunicados", "/sacramentos", "/usuarios", "/auditoria", "/configuracoes"];
export async function middleware(request: NextRequest) {
  if (!protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) return NextResponse.next();
  const token = request.cookies.get("catequese_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  try {
    const secret = process.env.AUTH_SECRET;
    if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) throw new Error("AUTH_SECRET inválido");
    await jwtVerify(token, new TextEncoder().encode(secret || "dev-secret-change-me-at-least-32-chars"));
    return NextResponse.next();
  } catch { return NextResponse.redirect(new URL("/login", request.url)); }
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
