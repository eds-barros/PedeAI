"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { readPickCookie } from "@/lib/session-cookie";

export function PublicGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && pathname === "/login") {
      router.replace(readPickCookie() ? "/selecionar-empresa" : "/");
    }
  }, [pathname, router, status]);

  if (status === "loading" || (status === "authenticated" && pathname === "/login")) {
    return (
      <p role="status" className="text-sm text-muted">
        {status === "loading" ? "Carregando…" : "Redirecionando…"}
      </p>
    );
  }
  return children;
}
