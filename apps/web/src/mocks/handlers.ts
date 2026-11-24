import { http, HttpResponse } from "msw/http";
import { isRole, type Role } from "@/lib/permissions";
import { consumeRefresh, issueTokenPair, readAccess } from "@/mocks/codec";
import { companies, memberships, users, type DbUser, type Membership } from "@/mocks/data";
import { DEMO_RESET_TOKEN } from "@/mocks/demo-accounts";

type FieldError = { field: string; message: string };

function error(statusCode: number, message: string, errors?: FieldError[]) {
  return HttpResponse.json(
    { statusCode, message, ...(errors ? { errors } : {}) },
    { status: statusCode },
  );
}

function noContent() {
  return new HttpResponse(null, { status: 204 });
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
    }));
}

function companyUser(user: DbUser, membership: Membership) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: membership.role,
    active: membership.active,
  };
}

function requireAccess(request: Request) {
  const access = readAccess(request);
  if (!access) return { error: error(401, "Sessão expirada. Faça login de novo.") } as const;
  return { access } as const;
}

function requireManager(request: Request) {
  const result = requireAccess(request);
  if ("error" in result) return result;
  const { access } = result;
  if (!access.companyId || (access.role !== "ADMIN" && access.role !== "GERENTE")) {
    return { error: error(403, "Você não tem permissão para gerenciar usuários nesta empresa.") } as const;
  }
  return { access } as const;
}

async function readBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
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

    const user = users.find((item) => item.email === email);
    if (!user || user.password !== password) return error(401, "E-mail ou senha inválidos.");

    const linked = activeCompanies(user.id);
    if (linked.length === 0) return error(403, "Esta conta não tem acesso ativo a nenhuma empresa.");

    const active = linked[0];
    if (!active) return error(403, "Esta conta não tem acesso ativo a nenhuma empresa.");
    const tokens = issueTokenPair({ sub: user.id, companyId: active.id, role: active.role });
    return HttpResponse.json({
      ...tokens,
      user: publicUser(user),
      companies: linked,
      activeCompanyId: active.id,
    });
  }),

  http.post("*/api/v1/auth/refresh", async ({ request }) => {
    const body = await readBody<{ refreshToken?: string }>(request);
    if (!body?.refreshToken) return error(401, "Sessão expirada. Faça login de novo.");
    const payload = consumeRefresh(body.refreshToken);
    if (!payload) return error(401, "Sessão expirada. Faça login de novo.");
    return HttpResponse.json(
      issueTokenPair({ sub: payload.sub, companyId: payload.companyId, role: payload.role }),
    );
  }),

  http.post("*/api/v1/auth/logout", async ({ request }) => {
    const body = await readBody<{ refreshToken?: string }>(request);
    if (body?.refreshToken) consumeRefresh(body.refreshToken);
    return noContent();
  }),

  http.post("*/api/v1/auth/forgot-password", async () => noContent()),

  http.post("*/api/v1/auth/reset-password", async ({ request }) => {
    const body = await readBody<{ token?: string; newPassword?: string }>(request);
    const errors: FieldError[] = [];
    if (!body?.token) errors.push({ field: "token", message: "Link inválido ou expirado." });
    if (!body?.newPassword || body.newPassword.length < 8) {
      errors.push({ field: "newPassword", message: "A senha deve ter pelo menos 8 caracteres." });
    }
    if (errors.length) return error(400, "Não foi possível redefinir a senha.", errors);
    if (body?.token !== DEMO_RESET_TOKEN) return error(400, "Link inválido ou expirado.");
    const ana = users.find((item) => item.email === "ana.silva@pedeai.dev");
    if (!ana || !body.newPassword) return error(400, "Link inválido ou expirado.");
    ana.password = body.newPassword;
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
    if (nextPassword.length < 8) {
      errors.push({ field: "newPassword", message: "A senha deve ter pelo menos 8 caracteres." });
    }
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
      (item) => item.userId === result.access.sub && item.companyId === body.companyId,
    );
    if (!membership) return error(403, "Você não participa desta empresa.");
    if (!membership.active) return error(403, "Seu acesso a esta empresa está inativo.");
    const tokens = issueTokenPair({
      sub: result.access.sub,
      companyId: membership.companyId,
      role: membership.role,
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
    const membership = memberships.find(
      (item) =>
        item.userId === user.id && item.companyId === result.access.companyId && item.active,
    );
    return HttpResponse.json({
      user: publicUser(user),
      companies: activeCompanies(user.id),
      activeCompanyId: membership?.companyId ?? null,
      role: membership?.role ?? null,
    });
  }),

  http.get("*/api/v1/users", ({ request }) => {
    const result = requireManager(request);
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
        const user = users.find((candidate) => candidate.id === item.userId);
        return user ? companyUser(user, item) : null;
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
    const result = requireManager(request);
    if ("error" in result) return result.error;
    const body = await readBody<{ name?: string; email?: string; password?: string; role?: string }>(request);
    const errors: FieldError[] = [];
    const name = body?.name?.trim() ?? "";
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    const role = body?.role ?? "";
    if (name.length < 2) errors.push({ field: "name", message: "Informe o nome." });
    if (!email.includes("@")) errors.push({ field: "email", message: "Informe um e-mail válido." });
    if (password.length < 8) errors.push({ field: "password", message: "A senha deve ter pelo menos 8 caracteres." });
    if (!isRole(role)) errors.push({ field: "role", message: "Escolha um papel." });
    if (errors.length || !isRole(role)) return error(400, "Revise os campos destacados.", errors);
    if (result.access.role !== "ADMIN" && role === "ADMIN") {
      return error(403, "Somente administradores podem atribuir o papel de administrador.");
    }
    if (users.some((item) => item.email === email)) {
      return error(409, "Este e-mail já está em uso.", [
        { field: "email", message: "Este e-mail já está em uso." },
      ]);
    }
    const user: DbUser = { id: `usr_${crypto.randomUUID().slice(0, 8)}`, name, email, password };
    const membership: Membership = {
      userId: user.id,
      companyId: result.access.companyId as string,
      role,
      active: true,
    };
    users.push(user);
    memberships.push(membership);
    return HttpResponse.json(companyUser(user, membership), { status: 201 });
  }),

  http.patch("*/api/v1/users/:id/status", async ({ request, params }) => {
    const result = requireManager(request);
    if ("error" in result) return result.error;
    const found = findInCompany(String(params.id), result.access.companyId);
    if (!found) return error(404, "Usuário não encontrado nesta empresa.");
    if (found.membership.role === "ADMIN" && result.access.role !== "ADMIN") {
      return error(403, "Você não pode alterar outro administrador.");
    }
    const body = await readBody<{ active?: boolean }>(request);
    if (typeof body?.active !== "boolean") {
      return error(400, "Informe se a conta fica ativa.", [
        { field: "active", message: "Informe se a conta fica ativa." },
      ]);
    }
    if (!body.active && found.user.id === result.access.sub) {
      return error(400, "Você não pode desativar a própria conta.");
    }
    found.membership.active = body.active;
    return HttpResponse.json(companyUser(found.user, found.membership));
  }),

  http.get("*/api/v1/users/:id", ({ request, params }) => {
    const result = requireManager(request);
    if ("error" in result) return result.error;
    const found = findInCompany(String(params.id), result.access.companyId);
    if (!found) return error(404, "Usuário não encontrado nesta empresa.");
    return HttpResponse.json(companyUser(found.user, found.membership));
  }),

  http.patch("*/api/v1/users/:id", async ({ request, params }) => {
    const result = requireManager(request);
    if ("error" in result) return result.error;
    const found = findInCompany(String(params.id), result.access.companyId);
    if (!found) return error(404, "Usuário não encontrado nesta empresa.");
    if (found.membership.role === "ADMIN" && result.access.role !== "ADMIN") {
      return error(403, "Você não pode alterar outro administrador.");
    }
    const body = await readBody<{ name?: string; email?: string; role?: Role }>(request);
    const errors: FieldError[] = [];
    const name = body?.name?.trim() ?? "";
    const email = body?.email?.trim().toLowerCase() ?? "";
    const role = body?.role;
    if (name.length < 2) errors.push({ field: "name", message: "Informe o nome." });
    if (!email.includes("@")) errors.push({ field: "email", message: "Informe um e-mail válido." });
    if (!role || !isRole(role)) errors.push({ field: "role", message: "Escolha um papel." });
    if (errors.length || !role || !isRole(role)) return error(400, "Revise os campos destacados.", errors);
    if (result.access.role !== "ADMIN" && role === "ADMIN") {
      return error(403, "Somente administradores podem atribuir o papel de administrador.");
    }
    const emailTaken = users.some((item) => item.email === email && item.id !== found.user.id);
    if (emailTaken) {
      return error(409, "Este e-mail já está em uso.", [
        { field: "email", message: "Este e-mail já está em uso." },
      ]);
    }
    found.user.name = name;
    found.user.email = email;
    found.membership.role = role;
    return HttpResponse.json(companyUser(found.user, found.membership));
  }),
];

function findInCompany(id: string, companyId: string | null) {
  const membership = memberships.find((item) => item.userId === id && item.companyId === companyId);
  const user = users.find((item) => item.id === id);
  if (!membership || !user) return null;
  return { user, membership };
}
