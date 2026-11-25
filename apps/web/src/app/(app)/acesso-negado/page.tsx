import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Acesso negado" };

export default function DeniedPage() {
  return (
    <section className="max-w-lg py-6">
      <h1 className="text-3xl font-semibold tracking-tight">Você não tem acesso a esta área</h1>
      <p className="mt-3 text-muted">
        O papel nesta empresa não inclui esta função. Use o menu para ir a uma área permitida.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Ir para o início</Link>
      </Button>
    </section>
  );
}
