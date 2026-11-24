import { z } from "zod";
import { ROLES } from "@/lib/permissions";

export const PASSWORD_HINT = "De 8 a 72 caracteres, com pelo menos uma letra e um número.";
export const PASSWORD_RULE = "A senha deve ter de 8 a 72 caracteres, com pelo menos uma letra e um número.";

export function passwordError(value: string) {
  if (value.length < 8 || value.length > 72 || !/\p{L}/u.test(value) || !/\p{N}/u.test(value)) {
    return PASSWORD_RULE;
  }
  return null;
}

export const passwordSchema = z.string().superRefine((value, ctx) => {
  const message = passwordError(value);
  if (message) ctx.addIssue({ code: "custom", message });
});

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail.")
  .email("Informe um e-mail válido.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha."),
});

export const forgotSchema = z.object({
  email: emailSchema,
});

export const resetSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "A nova senha deve ser diferente da atual.",
    path: ["newPassword"],
  });

export const roleSchema = z.enum(ROLES, { message: "Escolha um papel." });

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
});

export const editUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  role: roleSchema,
});

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type CreateUserValues = z.infer<typeof createUserSchema>;
export type EditUserValues = z.infer<typeof editUserSchema>;
