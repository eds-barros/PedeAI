"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/badge";
import { FormAlert } from "@/components/ui/form-alert";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/cn";

export function CompanyPicker() {
  const { user, companies, logout, selectCompany } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState(companies[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      setError("Escolha uma empresa.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await selectCompany(selected);
      router.replace("/");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível entrar nesta empresa.");
      setPending(false);
    }
  }

  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>
      <form className="mt-10 grid gap-6" onSubmit={onSubmit}>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Escolha a empresa</h1>
          <p className="mt-2 text-sm text-muted">
            {user?.name}, seu papel muda conforme a empresa. O menu segue essa escolha.
          </p>
        </div>
        <FormAlert message={error} />
        <fieldset className="grid gap-3">
          <legend className="sr-only">Empresas disponíveis</legend>
          {companies.map((company) => {
            const active = selected === company.id;
            return (
              <label
                key={company.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border bg-surface px-4 py-4 shadow-card",
                  active ? "border-primary" : "border-border",
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="company"
                    value={company.id}
                    checked={active}
                    onChange={() => setSelected(company.id)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block font-semibold">{company.name}</span>
                    <span className="block text-sm text-muted">Entrar com este papel</span>
                  </span>
                </span>
                <RoleBadge role={company.role} />
              </label>
            );
          })}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>
            {pending ? "Entrando…" : "Continuar"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => void logout()}>
            Sair
          </Button>
        </div>
      </form>
    </main>
  );
}
