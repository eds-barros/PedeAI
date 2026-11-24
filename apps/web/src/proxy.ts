import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, isPublicPath } from "@/lib/permissions";
import { PICK_COOKIE, SESSION_COOKIE, parseHint } from "@/lib/session-cookie";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hint = parseHint(request.cookies.get(SESSION_COOKIE)?.value);
  const picking = request.cookies.get(PICK_COOKIE)?.value === "1";

  if (isPublicPath(pathname)) {
    if (hint && pathname === "/login") {
      const destination = picking || !hint.companyId ? "/selecionar-empresa" : "/";
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  if (!hint) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  if ((picking || !hint.companyId) && pathname !== "/selecionar-empresa") {
    return NextResponse.redirect(new URL("/selecionar-empresa", request.url));
  }

  if (pathname === "/selecionar-empresa") return NextResponse.next();

  if (hint.role && !canAccessPath(hint.role, pathname)) {
    return NextResponse.redirect(new URL("/acesso-negado", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mockServiceWorker.js|.*\\..*).*)"],
};
