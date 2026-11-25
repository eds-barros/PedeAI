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
  permissions: string[] | null;
};

type LoginResult = { next: "picker" | "app"; role: Role | null; permissions: string[] | null };

type CompanySelection = Pick<SwitchCompanyResponse, "activeCompanyId" | "role"> & {
  permissions: string[];
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  selectCompany: (companyId: string) => Promise<CompanySelection>;
};

const empty: AuthState = {
  status: "loading",
  user: null,
  companies: [],
  activeCompanyId: null,
  role: null,
  permissions: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(
  userId: string,
  companyId: string,
  role: Role | "",
  permissions: string[] | undefined,
  pick: boolean,
) {
  writeSessionHint({ userId, companyId, role, permissions }, pick);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(empty);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!tokenStore.getRefresh()) {
        clearSessionCookies();
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
          permissions: pick ? null : me.permissions,
        });
        persist(
          me.user.id,
          pick ? "" : (me.activeCompanyId ?? ""),
          pick ? "" : (me.role ?? ""),
          pick ? undefined : me.permissions,
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
        const me = await getMe();
        const pick = me.companies.length > 1;
        setState({
          status: "authenticated",
          user: me.user,
          companies: me.companies,
          activeCompanyId: pick ? null : me.activeCompanyId,
          role: pick ? null : me.role,
          permissions: pick ? null : me.permissions,
        });
        persist(
          me.user.id,
          pick ? "" : (me.activeCompanyId ?? ""),
          pick ? "" : (me.role ?? ""),
          pick ? undefined : me.permissions,
          pick,
        );
        return { next: pick ? "picker" : "app", role: pick ? null : me.role, permissions: pick ? null : me.permissions };
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
        await switchCompanyRequest(companyId);
        const me = await getMe();
        if (!me.role || !me.activeCompanyId) {
          throw new Error("Não foi possível entrar nesta empresa.");
        }
        const role = me.role;
        if (me.user) persist(me.user.id, me.activeCompanyId, role, me.permissions, false);
        setState((current) => ({
          ...current,
          status: "authenticated",
          user: me.user,
          companies: me.companies,
          activeCompanyId: me.activeCompanyId,
          role: me.role,
          permissions: me.permissions,
        }));
        return { activeCompanyId: me.activeCompanyId, role, permissions: me.permissions };
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
