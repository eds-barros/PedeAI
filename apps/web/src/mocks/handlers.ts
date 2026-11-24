import { http, HttpResponse } from "msw/http";
import {
  hasPermission,
  isRole,
  permissionsForRole,
  type ApiPermission,
  type Role,
} from "@/lib/permissions";
import {
  consumeRefresh,
  issueTokenPair,
  readAccess,
  revokeSession,
  revokeUserSessions,
  sessionOf,
} from "@/mocks/codec";
import { companies, memberships, users, type DbUser, type Membership } from "@/mocks/data";
import { DEMO_RESET_TOKEN } from "@/mocks/demo-accounts";
import { passwordError } from "@/lib/validation";

type FieldError = { field: string; message: string };

const SELF_FORBIDDEN = "Você não pode alterar o próprio papel ou status.";
const EMAIL_CONFLICT = "Não foi possível cadastrar este e-mail.";
const LAST_ADMIN = "A empresa precisa manter ao menos um administrador ativo.";
const INVALID_TOKEN = "Token inválido ou expirado.";
const INVALID_LOGIN = "E-mail ou senha inválidos.";

const loginAttempts = new Map<string, { failures: number; blockedUntil: number }>();
const forgotAttempts = new Map<string, number[]>();

function error(statusCode: number, message: string, errors?: FieldError[], headers?: HeadersInit) {
  return HttpResponse.json(
    { statusCode, message, ...(errors ? { errors } : {}) },
    { status: statusCode, headers },
  );
}

function noContent() {
  return new HttpResponse(null, { status: 204 });
}

function nowIso() {
  return new Date().toISOString();
}

function publicUser(user: DbUser) {
  return { id: user.id, name: user.name, email: user.email };
}

function companyName(id: string) {
  return companies.find((company) => company.id === id)?.name ?? id;
}

function activeCompanies(userId: string) {
  return memberships
    .filter((item) => item.userId === userId && item.active)
    .map((item) => ({
      id: item.companyId,
      name: companyName(item.companyId),
      role: item.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function companyUser(user: DbUser, membership: Membership) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: membership.role,
    active: membership.active,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}

function defaultCompany(user: DbUser) {
  const linked = activeCompanies(user.id);
  if (user.ultimaEmpresaId) {
    const preferred = linked.find((item) => item.id === user.ultimaEmpresaId);
    if (preferred) return preferred;
  }
  return linked[0] ?? null;
}

function otherActiveAdmins(companyId: string, userId: string) {
  return memberships.filter(
    (item) => item.companyId === companyId && item.role === "ADMIN" && item.active && item.userId !== userId,
  ).length;
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function requireAccess(request: Request) {
  const access = readAccess(request);
  if (!access?.companyId || !access.role) return { error: error(401, "Sessão expirada. Faça login de novo.") } as const;
  const membership = memberships.find(
    (item) => item.userId === access.sub && item.companyId === access.companyId && item.active,
  );
  if (!membership) return { error: error(401, "Sessão expirada. Faça login de novo.") } as const;
  return { access, membership } as const;
}

function requirePermission(request: Request, permission: ApiPermission) {
  const result = requireAccess(request);
  if ("error" in result) return result;
  if (!hasPermission(permissionsForRole(result.access.role as Role), permission)) {
    return { error: error(403, "Você não tem permissão para esta ação.") } as const;
  }
  return result;
}

async function readBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function findInCompany(id: string, companyId: string | null) {
  const membership = memberships.find((item) => item.userId === id && item.companyId === companyId);
  const user = users.find((item) => item.id === id);
  if (!membership || !user) return null;
  return { user, membership };
}

export const handlers = [
  http.post("*/api/v1/auth/login", async ({ request }) => {
    const body = await readBody<{ email?: string; password?: string }>(request);
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    const errors: FieldError[] = [];
    if (!email) errors.push({ field: "email", message: "Informe o e-mail." });
    if (!password) errors.push({ field: "password", message: "Informe a senha." });
    if (errors.length) return error(400, "Revise os campos destacados.", errors);

    const key = `${clientIp(request)}|${email}`;
    const attempt = loginAttempts.get(key);
    if (attempt && attempt.blockedUntil > Date.now()) {
      const retry = Math.ceil((attempt.blockedUntil - Date.now()) / 1000);
      return error(429, "Muitas tentativas de login. Tente de novo mais tarde.", undefined, {
        "Retry-After": String(retry),
      });
    }

    const user = users.find((item) => item.email === email);
    const active = user && user.password === password ? defaultCompany(user) : null;
    if (!user || user.password !== password || !active) {
      const failures = (attempt && attempt.blockedUntil <= Date.now() ? attempt.failures : attempt?.failures ?? 0) + 1;
      const blockedUntil = failures >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
      loginAttempts.set(key, { failures: blockedUntil ? 0 : failures, blockedUntil });
      return error(401, INVALID_LOGIN);
    }

    loginAttempts.delete(key);
    user.ultimaEmpresaId = active.id;
    const tokens = issueTokenPair({ sub: user.id, companyId: active.id, role: active.role });
    return HttpResponse.json({
      ...tokens,
      user: publicUser(user),
      companies: activeCompanies(user.id),
      activeCompanyId: active.id,
    });
  }),

  http.post("*/api/v1/auth/refresh", async ({ request }) => {
    const body = await readBody<{ refreshToken?: string }>(request);
    if (!body?.refreshToken) return error(401, "Sessão expirada. Faça login de novo.");
    const payload = consumeRefresh(body.refreshToken);
    if (!payload) return error(401, "Sessão expirada. Faça login de novo.");
    const session = sessionOf(payload.sid);
    if (!session) return error(401, "Sessão expirada. Faça login de novo.");
    return HttpResponse.json(
      issueTokenPair({
        sub: session.userId,
        companyId: session.companyId,
        role: session.role,
        sid: session.sid,
      }),
    );
  }),

  http.post("*/api/v1/auth/logout", async ({ request }) => {
    const access = readAccess(request);
    const body = await readBody<{ refreshToken?: string }>(request);
    if (body?.refreshToken) consumeRefresh(body.refreshToken);
    if (access?.sid) revokeSession(access.sid);
    return noContent();
  }),

  http.post("*/api/v1/auth/forgot-password", async ({ request }) => {
    const ip = clientIp(request);
    const recent = (forgotAttempts.get(ip) ?? []).filter((time) => time > Date.now() - 60 * 60 * 1000);
    if (recent.length >= 5) {
      return error(429, "Muitas solicitações. Tente de novo mais tarde.", undefined, { "Retry-After": "3600" });
    }
    recent.push(Date.now());
    forgotAttempts.set(ip, recent);
    return noContent();
  }),

  http.post("*/api/v1/auth/reset-password", async ({ request }) => {
    const body = await readBody<{ token?: string; newPassword?: string }>(request);
    const errors: FieldError[] = [];
    if (!body?.token) errors.push({ field: "token", message: INVALID_TOKEN });
    const passwordMessage = passwordError(body?.newPassword ?? "");
    if (passwordMessage) errors.push({ field: "newPassword", message: passwordMessage });
    if (errors.length) return error(400, "Não foi possível redefinir a senha.", errors);
    if (body?.token !== DEMO_RESET_TOKEN) return error(400, INVALID_TOKEN);
    const ana = users.find((item) => item.email === "ana.silva@pedeai.dev");
    if (!ana || !body.newPassword || activeCompanies(ana.id).length === 0) return error(400, INVALID_TOKEN);
    ana.password = body.newPassword;
    revokeUserSessions(ana.id);
    return noContent();
  }),

  http.patch("*/api/v1/auth/change-password", async ({ request }) => {
    const result = requireAccess(request);
    if ("error" in result) return result.error;
    const body = await readBody<{ currentPassword?: string; newPassword?: string }>(request);
    const user = users.find((item) => item.id === result.access.sub);
    if (!user) return error(401, "Sessão expirada. Faça login de novo.");
    const nextPassword = body?.newPassword ?? "";
    const errors: FieldError[] = [];
    if (!body?.currentPassword) errors.push({ field: "currentPassword", message: "Informe a senha atual." });
    const passwordMessage = passwordError(nextPassword);
    if (passwordMessage) errors.push({ field: "newPassword", message: passwordMessage });
    if (errors.length) return error(400, "Revise os campos destacados.", errors);
    if (body?.currentPassword !== user.password) {
      return error(400, "Revise os campos destacados.", [
        { field: "currentPassword", message: "Senha atual incorreta." },
      ]);
    }
    if (nextPassword === user.password) {
      return error(400, "Revise os campos destacados.", [
        { field: "newPassword", message: "A nova senha deve ser diferente da atual." },
      ]);
    }
    user.password = nextPassword;
    revokeUserSessions(user.id, result.access.sid);
    return noContent();
  }),

  http.post("*/api/v1/auth/switch-company", async ({ request }) => {
    const result = requireAccess(request);
    if ("error" in result) return result.error;
    const body = await readBody<{ companyId?: string }>(request);
    if (!body?.companyId) {
      return error(400, "Escolha uma empresa.", [{ field: "companyId", message: "Escolha uma empresa." }]);
    }
    const membership = memberships.find(
      (item) => item.userId === result.access.sub && item.companyId === body.companyId && item.active,
    );
    if (!membership) return error(404, "Empresa não encontrada.");
    const user = users.find((item) => item.id === result.access.sub);
    if (user) user.ultimaEmpresaId = membership.companyId;
    const tokens = issueTokenPair({
      sub: result.access.sub,
      companyId: membership.companyId,
      role: membership.role,
      sid: result.access.sid,
    });
    return HttpResponse.json({
      ...tokens,
      activeCompanyId: membership.companyId,
      role: membership.role,
    });
  }),

  http.get("*/api/v1/me", ({ request }) => {
    const result = requireAccess(request);
    if ("error" in result) return result.error;
    const user = users.find((item) => item.id === result.access.sub);
    if (!user) return error(401, "Sessão expirada. Faça login de novo.");
    return HttpResponse.json({
      user: publicUser(user),
      companies: activeCompanies(user.id),
      activeCompanyId: result.membership.companyId,
      role: result.membership.role,
      permissions: permissionsForRole(result.membership.role),
    });
  }),

  http.get("*/api/v1/companies/current", ({ request }) => {
    const result = requireAccess(request);
    if ("error" in result) return result.error;
    const company = companies.find((item) => item.id === result.access.companyId);
    if (!company) return error(404, "Empresa não encontrada.");
    const summary = {
      id: company.id,
      nomeFantasia: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
    };
    if (!hasPermission(permissionsForRole(result.access.role as Role), "empresa:editar") && result.access.role !== "GERENTE" && result.access.role !== "ADMIN") {
      return HttpResponse.json(summary);
    }
    if (result.access.role !== "ADMIN" && result.access.role !== "GERENTE") return HttpResponse.json(summary);
    return HttpResponse.json({
      ...summary,
      razaoSocial: company.razaoSocial,
      cnpj: company.cnpj,
      telefone: company.telefone,
      email: company.email,
      endereco: company.endereco,
    });
  }),

  http.patch("*/api/v1/companies/current", async ({ request }) => {
    const result = requirePermission(request, "empresa:editar");
    if ("error" in result) return result.error;
    const company = companies.find((item) => item.id === result.access.companyId);
    if (!company) return error(404, "Empresa não encontrada.");
    const body = await readBody<{
      nomeFantasia?: string;
      razaoSocial?: string;
      telefone?: string;
      email?: string;
      endereco?: string;
      logoUrl?: string | null;
    }>(request);
    if (body?.nomeFantasia?.trim()) company.name = body.nomeFantasia.trim();
    if (body?.razaoSocial?.trim()) company.razaoSocial = body.razaoSocial.trim();
    if (typeof body?.telefone === "string") company.telefone = body.telefone;
    if (typeof body?.email === "string") company.email = body.email;
    if (typeof body?.endereco === "string") company.endereco = body.endereco;
    if (body && "logoUrl" in body) company.logoUrl = body.logoUrl ?? null;
    return HttpResponse.json({
      id: company.id,
      nomeFantasia: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
      razaoSocial: company.razaoSocial,
      cnpj: company.cnpj,
      telefone: company.telefone,
      email: company.email,
      endereco: company.endereco,
    });
  }),

  http.get("*/api/v1/roles", ({ request }) => {
    const result = requirePermission(request, "papeis:ler");
    if ("error" in result) return result.error;
    return HttpResponse.json({
      data: (["ADMIN", "GERENTE", "CAIXA", "GARCOM", "COZINHA"] as const).map((role) => ({
        role,
        permissions: permissionsForRole(role),
      })),
    });
  }),

  http.get("*/api/v1/users", ({ request }) => {
    const result = requirePermission(request, "usuarios:ler");
    if ("error" in result) return result.error;
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
    if (!Number.isInteger(page) || page < 1) return error(400, "Página inválida.");
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return error(400, "Tamanho de página inválido.");
    }
    const role = url.searchParams.get("role") ?? "";
    if (role && !isRole(role)) return error(400, "Papel inválido.");
    const activeParam = url.searchParams.get("active") ?? "";
    if (activeParam && activeParam !== "true" && activeParam !== "false") {
      return error(400, "Filtro de situação inválido.");
    }
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();

    const rows = memberships
      .filter((item) => item.companyId === result.access.companyId)
      .map((item) => {
        const person = users.find((candidate) => candidate.id === item.userId);
        return person ? companyUser(person, item) : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => (role ? item.role === role : true))
      .filter((item) => (activeParam ? String(item.active) === activeParam : true))
      .filter((item) =>
        search ? item.name.toLowerCase().includes(search) || item.email.toLowerCase().includes(search) : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const data = rows.slice((page - 1) * pageSize, page * pageSize);
    return HttpResponse.json({ data, meta: { page, pageSize, total, totalPages } });
  }),

  http.post("*/api/v1/users", async ({ request }) => {
    const result = requirePermission(request, "usuarios:gerenciar");
    if ("error" in result) return result.error;
    const body = await readBody<{ name?: string; email?: string; password?: string; role?: string }>(request);
    const errors: FieldError[] = [];
    const name = body?.name?.trim() ?? "";
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    const role = body?.role ?? "";
    if (name.length < 2) errors.push({ field: "name", message: "Informe o nome." });
    if (!email.includes("@")) errors.push({ field: "email", message: "Informe um e-mail válido." });
    const passwordMessage = passwordError(password);
    if (passwordMessage) errors.push({ field: "password", message: passwordMessage });
    if (!isRole(role)) errors.push({ field: "role", message: "Escolha um papel." });
    if (errors.length || !isRole(role)) return error(400, "Revise os campos destacados.", errors);
    if (users.some((item) => item.email === email)) return error(409, EMAIL_CONFLICT);
    const stamp = nowIso();
    const user: DbUser = { id: crypto.randomUUID(), name, email, password };
    const membership: Membership = {
      userId: user.id,
      companyId: result.access.companyId as string,
      role,
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    };
    users.push(user);
    memberships.push(membership);
    return HttpResponse.json(companyUser(user, membership), { status: 201 });
  }),

  http.patch("*/api/v1/users/:id/status", async ({ request, params }) => {
    const result = requirePermission(request, "usuarios:gerenciar");
    if ("error" in result) return result.error;
    const found = findInCompany(String(params.id), result.access.companyId);
    if (!found) return error(404, "Usuário não encontrado nesta empresa.");
    const body = await readBody<{ active?: boolean }>(request);
    if (typeof body?.active !== "boolean") {
      return error(400, "Informe se a conta fica ativa.", [
        { field: "active", message: "Informe se a conta fica ativa." },
      ]);
    }
    if (found.user.id === result.access.sub && body.active !== found.membership.active) {
      return error(403, SELF_FORBIDDEN);
    }
    if (
      !body.active &&
      found.membership.role === "ADMIN" &&
      found.membership.active &&
      otherActiveAdmins(found.membership.companyId, found.user.id) === 0
    ) {
      return error(409, LAST_ADMIN);
    }
    found.membership.active = body.active;
    found.membership.updatedAt = nowIso();
    return HttpResponse.json(companyUser(found.user, found.membership));
  }),

  http.get("*/api/v1/users/:id", ({ request, params }) => {
    const result = requirePermission(request, "usuarios:ler");
    if ("error" in result) return result.error;
    const found = findInCompany(String(params.id), result.access.companyId);
    if (!found) return error(404, "Usuário não encontrado nesta empresa.");
    return HttpResponse.json(companyUser(found.user, found.membership));
  }),

  http.patch("*/api/v1/users/:id", async ({ request, params }) => {
    const result = requirePermission(request, "usuarios:gerenciar");
    if ("error" in result) return result.error;
    const found = findInCompany(String(params.id), result.access.companyId);
    if (!found) return error(404, "Usuário não encontrado nesta empresa.");
    const body = await readBody<{ name?: string; role?: Role }>(request);
    const errors: FieldError[] = [];
    const name = body?.name?.trim() ?? found.user.name;
    if (body?.name !== undefined && name.length < 2) errors.push({ field: "name", message: "Informe o nome." });
    if (body?.role !== undefined && !isRole(body.role)) errors.push({ field: "role", message: "Escolha um papel." });
    if (errors.length) return error(400, "Revise os campos destacados.", errors);
    if (body?.role && body.role !== found.membership.role && found.user.id === result.access.sub) {
      return error(403, SELF_FORBIDDEN);
    }
    if (
      body?.role &&
      body.role !== "ADMIN" &&
      found.membership.role === "ADMIN" &&
      otherActiveAdmins(found.membership.companyId, found.user.id) === 0
    ) {
      return error(409, LAST_ADMIN);
    }
    found.user.name = name;
    if (body?.role && isRole(body.role)) found.membership.role = body.role;
    found.membership.updatedAt = nowIso();
    return HttpResponse.json(companyUser(found.user, found.membership));
  }),
];
