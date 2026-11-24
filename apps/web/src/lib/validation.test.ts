import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema, resetSchema } from "@/lib/validation";

describe("validação dos formulários", () => {
  it("exige e-mail válido e senha no login", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
    const invalid = loginSchema.safeParse({ email: "ana", password: "123" });
    expect(invalid.success).toBe(false);
    expect(loginSchema.safeParse({ email: "ana.silva@pedeai.dev", password: "senha1234" }).success).toBe(true);
  });

  it("confere a senha nova e impede repetir a atual", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "senha1234",
        newPassword: "senha1234",
        confirmPassword: "senha1234",
      }).success,
    ).toBe(false);
    expect(
      resetSchema.safeParse({ newPassword: "novasenha1", confirmPassword: "outrasenha" }).success,
    ).toBe(false);
    expect(
      resetSchema.safeParse({ newPassword: "novasenha1", confirmPassword: "novasenha1" }).success,
    ).toBe(true);
  });
});
