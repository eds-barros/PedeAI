import { afterEach, describe, expect, it, vi } from "vitest";
import { api, refreshSession, resetClientForTests } from "@/lib/api/client";
import { ApiError, applyFieldErrors } from "@/lib/api/errors";
import { tokenStore } from "@/lib/api/tokens";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  resetClientForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("cliente da API", () => {
  it("compartilha uma única renovação entre 401 concorrentes e guarda o refresh novo", async () => {
    tokenStore.setAccess("access-1");
    tokenStore.setRefresh("refresh-1");
    let refreshCalls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const href = String(input);
        if (href.endsWith("/auth/refresh")) {
          refreshCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 20));
          return json({ accessToken: "access-2", refreshToken: "refresh-2" });
        }
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") !== "Bearer access-2") {
          return json({ statusCode: 401, message: "Sessão expirada. Faça login de novo." }, 401);
        }
        return json({ ok: true });
      }),
    );

    const [first, second] = await Promise.all([api<{ ok: boolean }>("/me"), api<{ ok: boolean }>("/me")]);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(tokenStore.getAccess()).toBe("access-2");
    expect(tokenStore.getRefresh()).toBe("refresh-2");
  });

  it("não tenta renovar o login inválido", async () => {
    tokenStore.setRefresh("refresh-1");
    const fetchMock = vi.fn(async () => json({ statusCode: 401, message: "E-mail ou senha inválidos." }, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api("/auth/login", { method: "POST", auth: false, body: JSON.stringify({ email: "a", password: "b" }) }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(tokenStore.getRefresh()).toBe("refresh-1");
  });

  it("limpa a sessão quando a renovação falha", async () => {
    tokenStore.setAccess("access-1");
    tokenStore.setRefresh("refresh-1");
    vi.stubGlobal("fetch", vi.fn(async () => json({ statusCode: 401, message: "Sessão expirada. Faça login de novo." }, 401)));

    await expect(refreshSession()).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
  });

  it("mapeia errors para os campos do formulário", () => {
    const setError = vi.fn();
    const message = applyFieldErrors(
      new ApiError({
        statusCode: 400,
        message: "Revise os campos destacados.",
        errors: [{ field: "email", message: "Este e-mail já está em uso." }],
      }),
      setError,
    );
    expect(message).toBeNull();
    expect(setError).toHaveBeenCalledWith("email", {
      type: "server",
      message: "Este e-mail já está em uso.",
    });
  });
});
