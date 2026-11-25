"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FullScreenStatus } from "@/components/status/full-screen-status";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessPath } from "@/lib/permissions";
import { readPickCookie } from "@/lib/session-cookie";

export function AppGate({ children }: { children: ReactNode }) {
  const { status, role, activeCompanyId, permissions } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = role ? canAccessPath(role, pathname, permissions) : false;

  useEffect(() => {
    if (status === "anonymous") {
      const target = pathname === "/" ? "/login" : `/login?from=${encodeURIComponent(pathname)}`;
      router.replace(target);
      return;
    }
    if (status !== "authenticated") return;
    if (readPickCookie() || !activeCompanyId || !role) {
      router.replace("/selecionar-empresa");
      return;
    }
    if (!canAccessPath(role, pathname, permissions)) router.replace("/acesso-negado");
  }, [activeCompanyId, pathname, permissions, role, router, status]);

  if (status !== "authenticated" || !role || !activeCompanyId || !allowed) {
    return <FullScreenStatus label="Carregando o painel…" />;
  }

  return <AppShell>{children}</AppShell>;
}
