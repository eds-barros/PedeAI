import type { Role } from "@/lib/permissions";

type AccessPayload = {
  typ: "access";
  sub: string;
  companyId: string | null;
  role: Role | null;
  exp: number;
};

type RefreshPayload = {
  typ: "refresh";
  sub: string;
  companyId: string | null;
  role: Role | null;
  exp: number;
  jti: string;
};

const revoked = new Set<string>();

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

export function issueTokenPair(input: { sub: string; companyId: string | null; role: Role | null }) {
  const accessToken = encode({
    typ: "access",
    ...input,
    exp: Date.now() + 15 * 60 * 1000,
  });
  const refreshToken = encode({
    typ: "refresh",
    ...input,
    exp: Date.now() + 14 * 24 * 60 * 60 * 1000,
    jti: crypto.randomUUID(),
  });
  return { accessToken, refreshToken };
}

export function readAccess(request: Request): AccessPayload | null {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match?.[1]) return null;
  const payload = decode(match[1]);
  if (!payload || payload.typ !== "access" || payload.exp < Date.now()) return null;
  return payload;
}

/** Invalida o refresh usado. Um segundo uso do mesmo token falha (rotação). */
export function consumeRefresh(token: string): RefreshPayload | null {
  const payload = decode(token);
  if (!payload || payload.typ !== "refresh" || payload.exp < Date.now()) return null;
  if (revoked.has(payload.jti)) return null;
  revoked.add(payload.jti);
  return payload;
}
