import { env } from "@/lib/env";
import { clearSessionCookies } from "@/lib/session-cookie";
import { ApiError } from "@/lib/api/errors";
import { tokenStore } from "@/lib/api/tokens";
import type { ApiErrorBody, RefreshResponse } from "@/lib/api/types";

type ApiOptions = {
  method?: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
  auth?: boolean;
  skipRefresh?: boolean;
  signal?: AbortSignal;
};

const PUBLIC_AUTH = ["/auth/login", "/auth/refresh", "/auth/forgot-password", "/auth/reset-password"];

let refreshInflight: Promise<void> | null = null;

function endpoint(path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${env.apiUrl}${suffix}`;
}

function isPublicAuth(path: string) {
  const pathname = path.split("?")[0] ?? path;
  return PUBLIC_AUTH.some((item) => pathname === item);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function asErrorBody(body: unknown, status: number): ApiErrorBody {
  if (body && typeof body === "object") {
    const record = body as Partial<ApiErrorBody>;
    return {
      statusCode: typeof record.statusCode === "number" ? record.statusCode : status,
      message:
        typeof record.message === "string" && record.message
          ? record.message
          : "Não foi possível concluir a ação.",
      errors: Array.isArray(record.errors) ? record.errors : undefined,
    };
  }
  return { statusCode: status, message: "Não foi possível concluir a ação." };
}

async function performRefresh() {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) {
    tokenStore.clear();
    clearSessionCookies();
    throw new ApiError({ statusCode: 401, message: "Sessão expirada. Faça login de novo." });
  }

  const response = await fetch(endpoint("/auth/refresh"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      tokenStore.clear();
      clearSessionCookies();
    }
    throw new ApiError(asErrorBody(body, response.status));
  }

  const data = body as RefreshResponse;
  tokenStore.setAccess(data.accessToken);
  tokenStore.setRefresh(data.refreshToken);
}

/** Uma única renovação em voo. Chamadas concorrentes compartilham a mesma promise. */
export function refreshSession() {
  if (!refreshInflight) {
    refreshInflight = performRefresh().finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const auth = options.auth ?? !isPublicAuth(path);
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const access = tokenStore.getAccess();
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }

  const response = await fetch(endpoint(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body,
    signal: options.signal,
  });

  if (response.status === 401 && auth && !options.skipRefresh) {
    await refreshSession();
    return api<T>(path, { ...options, skipRefresh: true });
  }

  if (response.status === 204) return undefined as T;

  const body = await readJson(response);
  if (!response.ok) throw new ApiError(asErrorBody(body, response.status));
  return body as T;
}

export function resetClientForTests() {
  refreshInflight = null;
  tokenStore.clear();
}
