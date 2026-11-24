"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { applyFieldErrors, changePassword } from "@/lib/api";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/validation";

export function ChangePasswordForm() {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setFormError(null);
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      reset();
      toast({ title: "Senha alterada", description: "Use a nova senha no próximo acesso.", variant: "success" });
    } catch (error) {
      setFormError(applyFieldErrors(error, setError));
    }
  }

  return (
    <form className="grid max-w-md gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Alterar senha</h1>
        <p className="mt-2 text-sm text-muted">A sessão atual continua aberta depois da troca.</p>
      </div>
      <FormAlert message={formError} />
      <Input
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        canReveal
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />
      <Input
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        canReveal
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <Input
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        canReveal
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Button type="submit" loading={isSubmitting} className="w-fit">
        {isSubmitting ? "Salvando…" : "Salvar senha"}
      </Button>
    </form>
  );
}
