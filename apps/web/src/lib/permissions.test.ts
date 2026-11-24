import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  canManageUsers,
  hasPermission,
  isPublicPath,
  navItemsFor,
  permissionsForRole,
  UNRELEASED_MODULES_VISIBLE,
} from "@/lib/permissions";

describe("permissões", () => {
  it("esconde os módulos sem API nesta sprint e deixa usuários para quem pode ler", () => {
    expect(UNRELEASED_MODULES_VISIBLE).toBe(false);
    expect(navItemsFor("ADMIN").map((item) => item.href)).toEqual(["/", "/usuarios"]);
    expect(navItemsFor("GERENTE").map((item) => item.href)).toEqual(["/", "/usuarios"]);
    expect(navItemsFor("CAIXA").map((item) => item.href)).toEqual(["/"]);
    expect(navItemsFor("GARCOM").map((item) => item.href)).toEqual(["/"]);
    expect(navItemsFor("COZINHA").map((item) => item.href)).toEqual(["/"]);
  });

  it("usa a lista do GET /me e cai na matriz do papel se ela não vier", () => {
    expect(hasPermission(null, "usuarios:gerenciar", "ADMIN")).toBe(true);
    expect(hasPermission(null, "usuarios:gerenciar", "GERENTE")).toBe(false);
    expect(hasPermission(null, "usuarios:ler", "GERENTE")).toBe(true);
    expect(hasPermission(permissionsForRole("GERENTE"), "usuarios:gerenciar", "ADMIN")).toBe(false);
    expect(hasPermission(["usuarios:ler"], "usuarios:gerenciar", "ADMIN")).toBe(false);
    expect(canManageUsers("GERENTE")).toBe(false);
    expect(canManageUsers("ADMIN")).toBe(true);
  });

  it("bloqueia rotas de módulos escondidos e libera usuários e senha", () => {
    expect(canAccessPath("ADMIN", "/pdv")).toBe(false);
    expect(canAccessPath("COZINHA", "/kds")).toBe(false);
    expect(canAccessPath("CAIXA", "/usuarios")).toBe(false);
    expect(canAccessPath("GERENTE", "/usuarios")).toBe(true);
    expect(canAccessPath("CAIXA", "/conta/senha")).toBe(true);
    expect(canAccessPath("CAIXA", "/rota-inexistente")).toBe(true);
    expect(canAccessPath(null, "/")).toBe(false);
    expect(canAccessPath("CAIXA", "/pdv", ["pdv:operar"])).toBe(false);
  });

  it("trata login e redefinição como rotas públicas", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/redefinir-senha")).toBe(true);
    expect(isPublicPath("/usuarios")).toBe(false);
  });

  it("dá ao gerente todas as permissões menos editar empresa e gerenciar usuários", () => {
    const gerente = permissionsForRole("GERENTE");
    expect(gerente).not.toContain("usuarios:gerenciar");
    expect(gerente).not.toContain("empresa:editar");
    expect(gerente).toContain("usuarios:ler");
    expect(gerente).toContain("pdv:operar");
    expect(permissionsForRole("CAIXA")).toEqual([
      "empresa:ler",
      "produtos:ler",
      "pedidos:ler",
      "pedidos:gerenciar",
      "pdv:operar",
      "caixa:operar",
    ]);
  });
});
