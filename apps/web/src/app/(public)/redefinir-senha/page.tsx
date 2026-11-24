import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default function ResetPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <ResetForm />
    </Suspense>
  );
}
