import { isRole, type Role } from "@/lib/permissions";

/** Hint de rota. Não é credencial: a API exige o access token. */
export const SESSION_COOKIE = "pedeai_session";
export const PICK_COOKIE = "pedeai_pick";

const FOURTEEN_DAYS = 60 * 60 * 24 * 14;

export type SessionHint = {
  userId: string;
  companyId: string;
  role: Role | "";
  permissions?: string[];
};

export function serializeHint(hint: SessionHint) {
  return encodeURIComponent(JSON.stringify(hint));
}

export function parseHint(value: string | undefined): SessionHint | null {
  if (!value) return null;
  try {
    const data = JSON.parse(decodeURIComponent(value)) as Partial<SessionHint>;
    if (!data.userId || typeof data.userId !== "string") return null;
    const role = typeof data.role === "string" ? data.role : "";
    if (role !== "" && !isRole(role)) return null;
    const permissions = Array.isArray(data.permissions)
      ? data.permissions.filter((item): item is string => typeof item === "string")
      : undefined;
    return {
      userId: data.userId,
      companyId: typeof data.companyId === "string" ? data.companyId : "",
      role,
      ...(permissions ? { permissions } : {}),
    };
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string, maxAge: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function writeSessionHint(hint: SessionHint, pick: boolean) {
  writeCookie(SESSION_COOKIE, serializeHint(hint), FOURTEEN_DAYS);
  if (pick) writeCookie(PICK_COOKIE, "1", FOURTEEN_DAYS);
  else writeCookie(PICK_COOKIE, "", 0);
}

export function clearSessionCookies() {
  if (typeof document === "undefined") return;
  writeCookie(SESSION_COOKIE, "", 0);
  writeCookie(PICK_COOKIE, "", 0);
}

export function readPickCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((part) => part.startsWith(`${PICK_COOKIE}=1`));
}
