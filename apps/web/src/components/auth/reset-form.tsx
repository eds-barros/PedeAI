"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { applyFieldErrors, resetPassword } from "@/lib/api";
import { env } from "@/lib/env";
import { resetSchema, type ResetValues } from "@/lib/validation";
import { DEMO_RESET_TOKEN } from "@/mocks/demo-accounts";

export function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetValues) {
    setFormError(null);
    try {
      await resetPassword(token, values.newPassword);
      setDone(true);
    } catch (error) {
      setFormError(applyFieldErrors(error, setError));
    }
  }

  if (!token) {
    return (
      <div className="grid gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Redefinir senha</h1>
        <FormAlert message="Este link não tem um token. Peça um novo link." />
        <Link href="/esqueci-senha" className="text-sm font-semibold text-accent">
          Solicitar outro link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Senha redefinida</h1>
        <p role="status" className="text-sm text-muted">
          Entre com a nova senha.
        </p>
        <Link href="/login" className="text-sm font-semibold text-accent">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Redefinir senha</h1>
        <p className="mt-2 text-sm text-muted">Escolha uma senha nova com pelo menos 8 caracteres.</p>
      </div>
      <FormAlert message={formError} />
      <Input
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        canReveal
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <Input
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        canReveal
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Button type="submit" loading={isSubmitting}>
        {isSubmitting ? "Salvando…" : "Salvar senha"}
      </Button>
      {env.mock && token === DEMO_RESET_TOKEN ? (
        <p className="text-xs text-muted">Token de demonstração reconhecido. Ele redefine a senha da Ana Silva.</p>
      ) : null}
    </form>
  );
}
