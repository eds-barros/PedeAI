import type { ReactNode } from "react";
import { PublicGate } from "@/components/auth/public-gate";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[#0D6E56] p-12 text-white lg:flex">
        <Logo tone="inverse" />
        <div className="max-w-md">
          <p className="text-4xl font-semibold tracking-tight">A operação da praça, num só lugar.</p>
          <p className="mt-4 text-lg text-[#E7F6F1]">
            PDV, cozinha e salão compartilham a empresa ativa. Cada pessoa vê só o que o papel dela permite.
          </p>
        </div>
        <p className="text-sm text-[#E7F6F1]">Design system Praça</p>
      </section>
      <main id="conteudo" tabIndex={-1} className="flex flex-col px-4 py-6 outline-none sm:px-8">
        <div className="mb-8 flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-10">
          <PublicGate>{children}</PublicGate>
        </div>
      </main>
    </div>
  );
}
