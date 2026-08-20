import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/token";

const SESSION_COOKIE = "7ev_session";
const PUBLIC_PATHS = ["/login"];

/**
 * Proteção de rotas (RN da Fase 1: "rotas ocultas por perfil também
 * devem ser protegidas contra acesso direto"). Roda no Edge e valida
 * apenas a assinatura do cookie; a checagem fina de empresa/perfil por
 * capacidade acontece na camada de dados (src/lib/domain/permissions.ts),
 * que é a proteção que realmente importa e não pode ser contornada
 * pelo cliente. (Convenção "proxy": substitui o antigo middleware.ts.)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = await verifyToken(token);

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
