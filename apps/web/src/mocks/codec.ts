import type { Role } from "@/lib/permissions";

type AccessPayload = {
  typ: "access";
  sub: string;
  sid: string;
  companyId: string | null;
  role: Role | null;
  exp: number;
};

type RefreshPayload = {
  typ: "refresh";
  sub: string;
  sid: string;
  companyId: string | null;
  role: Role | null;
  exp: number;
  jti: string;
};

type Session = {
  sid: string;
  userId: string;
  companyId: string | null;
  role: Role | null;
  revoked: boolean;
};

const sessions = new Map<string, Session>();
const liveRefresh = new Map<string, string>();
const consumedRefresh = new Map<string, string>();

const ACCESS_TTL = 15 * 60 * 1000;
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;

function encode(payload: AccessPayload | RefreshPayload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `mock.${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "")}`;
}

function decode(token: string): AccessPayload | RefreshPayload | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const padded = part.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (part.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as AccessPayload | RefreshPayload;
  } catch {
    return null;
  }
}

export function issueTokenPair(input: {
  sub: string;
  companyId: string | null;
  role: Role | null;
  sid?: string;
}) {
  const sid = input.sid ?? crypto.randomUUID();
  const current = sessions.get(sid);
  if (current) {
    current.userId = input.sub;
    current.companyId = input.companyId;
    current.role = input.role;
    current.revoked = false;
  } else {
    sessions.set(sid, {
      sid,
      userId: input.sub,
      companyId: input.companyId,
      role: input.role,
      revoked: false,
    });
  }

  const jti = crypto.randomUUID();
  liveRefresh.set(jti, sid);
  const accessToken = encode({
    typ: "access",
    sub: input.sub,
    sid,
    companyId: input.companyId,
    role: input.role,
    exp: Date.now() + ACCESS_TTL,
  });
  const refreshToken = encode({
    typ: "refresh",
    sub: input.sub,
    sid,
    companyId: input.companyId,
    role: input.role,
    exp: Date.now() + REFRESH_TTL,
    jti,
  });
  return { accessToken, refreshToken };
}

export function readAccess(request: Request): AccessPayload | null {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match?.[1]) return null;
  const payload = decode(match[1]);
  if (!payload || payload.typ !== "access" || payload.exp < Date.now()) return null;
  const session = sessions.get(payload.sid);
  if (!session || session.revoked) return null;
  if (session.companyId !== payload.companyId) return null;
  return payload;
}

/** Invalida o refresh usado. Reúso revoga a sessão inteira. */
export function consumeRefresh(token: string): RefreshPayload | null {
  const payload = decode(token);
  if (!payload || payload.typ !== "refresh" || payload.exp < Date.now()) return null;
  if (consumedRefresh.has(payload.jti)) {
    revokeSession(consumedRefresh.get(payload.jti) ?? payload.sid);
    return null;
  }
  if (!liveRefresh.has(payload.jti)) return null;
  liveRefresh.delete(payload.jti);
  consumedRefresh.set(payload.jti, payload.sid);
  const session = sessions.get(payload.sid);
  if (!session || session.revoked) return null;
  return payload;
}

export function sessionOf(sid: string) {
  return sessions.get(sid) ?? null;
}

export function revokeSession(sid: string) {
  const session = sessions.get(sid);
  if (session) session.revoked = true;
}

export function revokeUserSessions(userId: string, keepSid?: string) {
  for (const session of sessions.values()) {
    if (session.userId === userId && session.sid !== keepSid) session.revoked = true;
  }
}
