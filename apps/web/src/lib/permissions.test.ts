import { describe, expect, it } from "vitest";
import {
  assignableRoles,
  can,
  canAccessPath,
  canManageTarget,
  isPublicPath,
  navItemsFor,
  PERMISSIONS,
  ROLES,
  ROUTES,
} from "@/lib/permissions";

describe("matriz de permissões", () => {
  it("cobre os cinco papéis em toda permissão", () => {
    for (const roles of Object.values(PERMISSIONS)) {
      for (const role of roles) expect(ROLES).toContain(role);
    }
  });

  it("mostra o menu certo de cada papel", () => {
    expect(navItemsFor("ADMIN").map((item) => item.href)).toEqual([
      "/",
      "/pdv",
      "/kds",
      "/cardapio",
      "/pedidos",
      "/relatorios",
      "/usuarios",
    ]);
    expect(navItemsFor("GERENTE").map((item) => item.id)).toEqual(navItemsFor("ADMIN").map((item) => item.id));
    expect(navItemsFor("CAIXA").map((item) => item.href)).toEqual(["/", "/pdv", "/pedidos"]);
    expect(navItemsFor("GARCOM").map((item) => item.href)).toEqual(["/", "/pedidos"]);
    expect(navItemsFor("COZINHA").map((item) => item.href)).toEqual(["/", "/kds"]);
  });

  it("protege rotas pelo papel e deixa a troca de senha para todos", () => {
    expect(canAccessPath("CAIXA", "/usuarios")).toBe(false);
    expect(canAccessPath("CAIXA", "/kds")).toBe(false);
    expect(canAccessPath("COZINHA", "/kds")).toBe(true);
    expect(canAccessPath("COZINHA", "/pdv")).toBe(false);
    expect(canAccessPath("GARCOM", "/pedidos")).toBe(true);
    expect(canAccessPath("GARCOM", "/relatorios")).toBe(false);
    expect(canAccessPath("CAIXA", "/conta/senha")).toBe(true);
    expect(canAccessPath("ADMIN", "/usuarios")).toBe(true);
    expect(canAccessPath("CAIXA", "/rota-inexistente")).toBe(true);
    expect(canAccessPath(null, "/")).toBe(false);
  });

  it("deixa o gerente fora da administração de outros admins", () => {
    expect(can("GERENTE", "users:manage")).toBe(true);
    expect(can("GERENTE", "users:assign-admin")).toBe(false);
    expect(canManageTarget("GERENTE", "CAIXA")).toBe(true);
    expect(canManageTarget("GERENTE", "ADMIN")).toBe(false);
    expect(canManageTarget("ADMIN", "ADMIN")).toBe(true);
    expect(assignableRoles("GERENTE")).toEqual(["GERENTE", "CAIXA", "GARCOM", "COZINHA"]);
    expect(assignableRoles("CAIXA")).toEqual([]);
  });

  it("trata login e redefinição como rotas públicas", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/redefinir-senha")).toBe(true);
    expect(isPublicPath("/usuarios")).toBe(false);
  });

  it("amarra cada item de menu à mesma permissão da rota", () => {
    for (const route of ROUTES.filter((item) => item.nav)) {
      expect(can("ADMIN", route.permission)).toBe(true);
      expect(route.href.startsWith("/")).toBe(true);
    }
  });
});
