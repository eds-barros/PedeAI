"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { navItemsFor, ROLE_LABEL } from "@/lib/permissions";

export function HomeDashboard() {
  const { user, role, companies, activeCompanyId, permissions } = useAuth();
  if (!user || !role) return null;
  const company = companies.find((item) => item.id === activeCompanyId);
  const modules = navItemsFor(role, permissions).filter((item) => item.href !== "/");

  return (
    <section>
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">Início</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Olá, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 text-muted">
        {company?.name ?? "Empresa"} · {ROLE_LABEL[role]}
      </p>
      {modules.length === 0 ? (
        <p className="mt-8 max-w-xl text-sm text-muted">
          Nenhum outro módulo está liberado para o seu papel nesta sprint.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {modules.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="rounded-2xl border border-border bg-surface p-5 shadow-card hover:bg-surface-muted"
          >
            <h2 className="text-lg font-semibold">{item.label}</h2>
            <p className="mt-1 text-sm text-muted">{item.description}</p>
          </Link>
          ))}
        </div>
      )}
    </section>
  );
}
