import { api, refreshSession } from "@/lib/api/client";
import { tokenStore } from "@/lib/api/tokens";
import { clearSessionCookies } from "@/lib/session-cookie";
import type { LoginResponse, MeResponse, SwitchCompanyResponse } from "@/lib/api/types";

export function login(email: string, password: string) {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export function refresh() {
  return refreshSession();
}

export async function logout() {
  const refreshToken = tokenStore.getRefresh();
  try {
    if (refreshToken) {
      await api<void>("/auth/logout", {
        method: "POST",
        skipRefresh: true,
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    tokenStore.clear();
    clearSessionCookies();
  }
}

export function forgotPassword(email: string) {
  return api<void>("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string) {
  return api<void>("/auth/reset-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ token, newPassword }),
  });
}

export function changePassword(input: { currentPassword: string; newPassword: string }) {
  return api<void>("/auth/change-password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function switchCompany(companyId: string) {
  const data = await api<SwitchCompanyResponse>("/auth/switch-company", {
    method: "POST",
    body: JSON.stringify({ companyId }),
  });
  tokenStore.setAccess(data.accessToken);
  tokenStore.setRefresh(data.refreshToken);
  return data;
}

export function getMe() {
  return api<MeResponse>("/me");
}
