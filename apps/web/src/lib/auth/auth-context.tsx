"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  refresh,
  switchCompany as switchCompanyRequest,
  tokenStore,
  type CompanyMembership,
  type SwitchCompanyResponse,
  type UserProfile,
} from "@/lib/api";
import type { Role } from "@/lib/permissions";
import { clearSessionCookies, readPickCookie, writeSessionHint } from "@/lib/session-cookie";

type AuthState = {
  status: "loading" | "anonymous" | "authenticated";
  user: UserProfile | null;
  companies: CompanyMembership[];
  activeCompanyId: string | null;
  role: Role | null;
};

type LoginResult = { next: "picker" | "app"; role: Role | null };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  selectCompany: (companyId: string) => Promise<SwitchCompanyResponse>;
};

const empty: AuthState = {
  status: "loading",
  user: null,
  companies: [],
  activeCompanyId: null,
  role: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(userId: string, companyId: string, role: Role | "", pick: boolean) {
  writeSessionHint({ userId, companyId, role }, pick);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(empty);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!tokenStore.getRefresh()) {
        if (!cancelled) setState({ ...empty, status: "anonymous" });
        return;
      }
      try {
        await refresh();
        const me = await getMe();
        if (cancelled) return;
        const pick = readPickCookie();
        setState({
          status: "authenticated",
          user: me.user,
          companies: me.companies,
          activeCompanyId: pick ? null : me.activeCompanyId,
          role: pick ? null : me.role,
        });
        persist(
          me.user.id,
          pick ? "" : (me.activeCompanyId ?? ""),
          pick ? "" : (me.role ?? ""),
          pick,
        );
      } catch {
        if (cancelled) return;
        tokenStore.clear();
        clearSessionCookies();
        setState({ ...empty, status: "anonymous" });
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      async login(email, password) {
        const result = await loginRequest(email, password);
        tokenStore.setAccess(result.accessToken);
        tokenStore.setRefresh(result.refreshToken);
        const pick = result.companies.length > 1;
        const active =
          result.companies.find((company) => company.id === result.activeCompanyId) ??
          result.companies[0] ??
          null;
        setState({
          status: "authenticated",
          user: result.user,
          companies: result.companies,
          activeCompanyId: pick ? null : (active?.id ?? null),
          role: pick ? null : (active?.role ?? null),
        });
        persist(result.user.id, pick ? "" : (active?.id ?? ""), pick ? "" : (active?.role ?? ""), pick);
        return { next: pick ? "picker" : "app", role: pick ? null : (active?.role ?? null) };
      },
      async logout() {
        try {
          await logoutRequest();
        } finally {
          setState({ ...empty, status: "anonymous" });
          router.replace("/login");
        }
      },
      async selectCompany(companyId) {
        const result = await switchCompanyRequest(companyId);
        if (state.user) persist(state.user.id, result.activeCompanyId, result.role, false);
        setState((current) => ({
          ...current,
          status: "authenticated",
          activeCompanyId: result.activeCompanyId,
          role: result.role,
        }));
        return result;
      },
    }),
    [router, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider.");
  return context;
}
