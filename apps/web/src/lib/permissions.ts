/**
 * Matriz única de permissões do frontend.
 * O papel é sempre o da empresa ativa. O proxy e o menu leem só daqui.
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

const ALL_ROLES = ROLES;

export const PERMISSIONS = {
  "route:/": ALL_ROLES,
  "route:/pdv": ["ADMIN", "GERENTE", "CAIXA"],
  "route:/kds": ["ADMIN", "GERENTE", "COZINHA"],
  "route:/cardapio": ["ADMIN", "GERENTE"],
  "route:/pedidos": ["ADMIN", "GERENTE", "CAIXA", "GARCOM"],
  "route:/relatorios": ["ADMIN", "GERENTE"],
  "users:manage": ["ADMIN", "GERENTE"],
  "users:assign-admin": ["ADMIN"],
  "account:password": ALL_ROLES,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export type RouteDefinition = {
  id: string;
  href: string;
  label: string;
  description: string;
  permission: Permission;
  nav: boolean;
};

export const ROUTES: readonly RouteDefinition[] = [
  {
    id: "inicio",
    href: "/",
    label: "Início",
    description: "Visão da empresa ativa e dos módulos liberados para o seu papel.",
    permission: "route:/",
    nav: true,
  },
  {
    id: "pdv",
    href: "/pdv",
    label: "PDV",
    description: "Lançar vendas, receber e fechar a conta.",
    permission: "route:/pdv",
    nav: true,
  },
  {
    id: "kds",
    href: "/kds",
    label: "KDS",
    description: "Acompanhar os pedidos na cozinha.",
    permission: "route:/kds",
    nav: true,
  },
  {
    id: "cardapio",
    href: "/cardapio",
    label: "Cardápio",
    description: "Montar produtos, preços e disponibilidade.",
    permission: "route:/cardapio",
    nav: true,
  },
  {
    id: "pedidos",
    href: "/pedidos",
    label: "Pedidos",
    description: "Ver e acompanhar os pedidos do salão.",
    permission: "route:/pedidos",
    nav: true,
  },
  {
    id: "relatorios",
    href: "/relatorios",
    label: "Relatórios",
    description: "Acompanhar o movimento da empresa.",
    permission: "route:/relatorios",
    nav: true,
  },
  {
    id: "usuarios",
    href: "/usuarios",
    label: "Usuários",
    description: "Convidar pessoas e definir o papel delas nesta empresa.",
    permission: "users:manage",
    nav: true,
  },
  {
    id: "senha",
    href: "/conta/senha",
    label: "Alterar senha",
    description: "Trocar a senha da conta autenticada.",
    permission: "account:password",
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

export function can(role: Role | null | undefined, permission: Permission) {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function matchRoute(pathname: string) {
  return [...ROUTES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((route) => {
      if (route.href === "/") return pathname === "/";
      return pathname === route.href || pathname.startsWith(`${route.href}/`);
    });
}

export function canAccessPath(role: Role | null, pathname: string) {
  if (pathname === "/selecionar-empresa" || pathname === "/acesso-negado") return true;
  const route = matchRoute(pathname);
  if (!route) return true;
  return can(role, route.permission);
}

export function navItemsFor(role: Role) {
  return NAV_ITEMS.filter((item) => can(role, item.permission));
}

export function isNavActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Gerente opera a equipe, mas não cria nem edita administradores. */
export function canManageTarget(actor: Role, target: Role) {
  if (!can(actor, "users:manage")) return false;
  if (target === "ADMIN" && !can(actor, "users:assign-admin")) return false;
  return true;
}

export function assignableRoles(actor: Role): Role[] {
  return ROLES.filter((role) => canManageTarget(actor, role));
}
