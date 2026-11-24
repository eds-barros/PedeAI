"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/ui/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyFieldErrors } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { env } from "@/lib/env";
import { canAccessPath } from "@/lib/permissions";
import { loginSchema, type LoginValues } from "@/lib/validation";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/mocks/demo-accounts";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      const result = await login(values.email, values.password);
      if (result.next === "picker") {
        router.replace("/selecionar-empresa");
        return;
      }
      const from = searchParams.get("from");
      if (from && isSafePath(from) && result.role && canAccessPath(result.role, from, result.permissions)) {
        router.replace(from);
        return;
      }
      router.replace("/");
    } catch (error) {
      setFormError(applyFieldErrors(error, setError));
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-sm text-muted">Use o e-mail e a senha da sua conta PedeAI.</p>
      </div>
      <FormAlert message={formError} />
      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Senha"
        type="password"
        autoComplete="current-password"
        canReveal
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="flex justify-end">
        <Link href="/esqueci-senha" className="text-sm font-semibold text-accent">
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" loading={isSubmitting}>
        {isSubmitting ? "Entrando…" : "Entrar"}
      </Button>
      {env.mock ? (
        <section className="rounded-2xl border border-border bg-surface-muted p-4" aria-label="Contas de demonstração">
          <h2 className="text-sm font-semibold">Modo demonstração</h2>
          <p className="mt-1 text-sm text-muted">Senha de todas as contas: {DEMO_PASSWORD}</p>
          <ul className="mt-3 grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-left"
                  onClick={() => {
                    setValue("email", account.email, { shouldValidate: true });
                    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
                  }}
                >
                  <span className="block text-sm font-semibold">{account.name}</span>
                  <span className="block text-xs text-muted">{account.email}</span>
                  <span className="block text-xs text-muted">{account.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </form>
  );
}

function isSafePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/login");
}
