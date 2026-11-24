/**
 * Catálogo de permissões alinhado ao backend (papeis/permissoes).
 * O menu e as ações usam a lista vinda do GET /me.
 * Se ela não vier, a matriz por papel abaixo serve de fallback.
 *
 * Módulos sem API nesta sprint ficam fora do menu enquanto
 * UNRELEASED_MODULES_VISIBLE for false.
 */

export const ROLES = ["ADMIN", "GERENTE", "CAIXA", "GARCOM", "COZINHA"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  CAIXA: "Caixa",
  GARCOM: "Garçom",
  COZINHA: "Cozinha",
};

export const API_PERMISSIONS = [
  "empresa:ler",
  "empresa:editar",
  "usuarios:ler",
  "usuarios:gerenciar",
  "papeis:ler",
  "produtos:ler",
  "produtos:gerenciar",
  "pedidos:ler",
  "pedidos:gerenciar",
  "pdv:operar",
  "caixa:operar",
  "cozinha:operar",
  "relatorios:ler",
] as const;

export type ApiPermission = (typeof API_PERMISSIONS)[number];

export type UnreleasedModule = "produtos" | "pedidos" | "pdv" | "caixa" | "cozinha" | "relatorios";

/** Ligue para mostrar PDV, KDS, cardápio, pedidos e relatórios. */
export const UNRELEASED_MODULES_VISIBLE = false;

const ALL_PERMISSIONS: readonly ApiPermission[] = API_PERMISSIONS;

const ROLE_PERMISSIONS: Record<Role, readonly ApiPermission[]> = {
  ADMIN: ALL_PERMISSIONS,
  GERENTE: ALL_PERMISSIONS.filter((item) => item !== "empresa:editar" && item !== "usuarios:gerenciar"),
  CAIXA: ["empresa:ler", "produtos:ler", "pedidos:ler", "pedidos:gerenciar", "pdv:operar", "caixa:operar"],
  GARCOM: ["empresa:ler", "produtos:ler", "pedidos:ler", "pedidos:gerenciar"],
  COZINHA: ["empresa:ler", "produtos:ler", "pedidos:ler", "cozinha:operar"],
};

export function permissionsForRole(role: Role): ApiPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function hasPermission(
  permissions: readonly string[] | null | undefined,
  needed: ApiPermission,
  role?: Role | null,
) {
  if (permissions) return permissions.includes(needed);
  if (role) return ROLE_PERMISSIONS[role].includes(needed);
  return false;
}

export type RouteDefinition = {
  id: string;
  href: string;
  label: string;
  description: string;
  permission: ApiPermission | null;
  module?: UnreleasedModule;
  nav: boolean;
};

export const ROUTES: readonly RouteDefinition[] = [
  {
    id: "inicio",
    href: "/",
    label: "Início",
    description: "Visão da empresa ativa e dos módulos liberados para você.",
    permission: null,
    nav: true,
  },
  {
    id: "pdv",
    href: "/pdv",
    label: "PDV",
    description: "Lançar vendas, receber e fechar a conta.",
    permission: "pdv:operar",
    module: "pdv",
    nav: true,
  },
  {
    id: "kds",
    href: "/kds",
    label: "KDS",
    description: "Acompanhar os pedidos na cozinha.",
    permission: "cozinha:operar",
    module: "cozinha",
    nav: true,
  },
  {
    id: "cardapio",
    href: "/cardapio",
    label: "Cardápio",
    description: "Montar produtos, preços e disponibilidade.",
    permission: "produtos:ler",
    module: "produtos",
    nav: true,
  },
  {
    id: "pedidos",
    href: "/pedidos",
    label: "Pedidos",
    description: "Ver e acompanhar os pedidos do salão.",
    permission: "pedidos:ler",
    module: "pedidos",
    nav: true,
  },
  {
    id: "relatorios",
    href: "/relatorios",
    label: "Relatórios",
    description: "Acompanhar o movimento da empresa.",
    permission: "relatorios:ler",
    module: "relatorios",
    nav: true,
  },
  {
    id: "usuarios",
    href: "/usuarios",
    label: "Usuários",
    description: "Pessoas com acesso a esta empresa e o papel de cada uma.",
    permission: "usuarios:ler",
    nav: true,
  },
  {
    id: "senha",
    href: "/conta/senha",
    label: "Alterar senha",
    description: "Trocar a senha da conta autenticada.",
    permission: null,
    nav: false,
  },
];

export const NAV_ITEMS = ROUTES.filter((route) => route.nav);

const PUBLIC_PATHS = ["/login", "/esqueci-senha", "/redefinir-senha"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isModuleVisible(module?: UnreleasedModule) {
  if (!module) return true;
  return UNRELEASED_MODULES_VISIBLE;
}

export function matchRoute(pathname: string) {
  return [...ROUTES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((route) => {
      if (route.href === "/") return pathname === "/";
      return pathname === route.href || pathname.startsWith(`${route.href}/`);
    });
}

export function canSeeRoute(
  route: RouteDefinition,
  role: Role | null,
  permissions?: readonly string[] | null,
) {
  if (!isModuleVisible(route.module)) return false;
  if (!route.permission) return role !== null || Boolean(permissions && permissions.length > 0);
  return hasPermission(permissions, route.permission, role);
}

export function canAccessPath(
  role: Role | null,
  pathname: string,
  permissions?: readonly string[] | null,
) {
  if (pathname === "/selecionar-empresa" || pathname === "/acesso-negado") return true;
  const route = matchRoute(pathname);
  if (!route) return true;
  return canSeeRoute(route, role, permissions);
}

export function navItemsFor(role: Role | null, permissions?: readonly string[] | null) {
  return NAV_ITEMS.filter((item) => canSeeRoute(item, role, permissions));
}

export function isNavActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function canManageUsers(role: Role | null, permissions?: readonly string[] | null) {
  return hasPermission(permissions, "usuarios:gerenciar", role);
}
