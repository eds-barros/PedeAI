"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FullScreenStatus } from "@/components/status/full-screen-status";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth/auth-context";
import { env } from "@/lib/env";
import { ensureMock } from "@/mocks/enable";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MockBoundary>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </MockBoundary>
  );
}

function MockBoundary({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!env.mock);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!env.mock) return;
    let cancelled = false;
    ensureMock()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <FullScreenStatus label="Não foi possível iniciar o modo demonstração. Recarregue a página." />
    );
  }
  if (!ready) return <FullScreenStatus label="Preparando o modo demonstração…" />;
  return children;
}
