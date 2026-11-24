"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { applyFieldErrors, forgotPassword } from "@/lib/api";
import { forgotSchema, type ForgotValues } from "@/lib/validation";

const NEUTRAL =
  "Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha.";

export function ForgotForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotValues) {
    setFormError(null);
    try {
      await forgotPassword(values.email);
      setSent(true);
    } catch (error) {
      setFormError(applyFieldErrors(error, setError));
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Esqueci minha senha</h1>
        <p className="mt-2 text-sm text-muted">Informe o e-mail da conta. A resposta é a mesma mesmo que ele não exista.</p>
      </div>
      {sent ? (
        <p role="status" className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
          {NEUTRAL}
        </p>
      ) : null}
      <FormAlert message={formError} />
      <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Button type="submit" loading={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Enviar link"}
      </Button>
      <Link href="/login" className="text-sm font-semibold text-accent">
        Voltar para o login
      </Link>
    </form>
  );
}
