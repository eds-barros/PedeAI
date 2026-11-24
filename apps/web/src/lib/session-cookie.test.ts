import { describe, expect, it } from "vitest";
import { parseHint, serializeHint } from "@/lib/session-cookie";

describe("cookie de sessão", () => {
  it("faz o caminho de ida e volta do hint", () => {
    const hint = { userId: "usr_ana", companyId: "cmp_praca", role: "ADMIN" as const };
    expect(parseHint(serializeHint(hint))).toEqual(hint);
  });

  it("rejeita papel desconhecido e valor vazio", () => {
    expect(parseHint(undefined)).toBeNull();
    expect(parseHint(encodeURIComponent(JSON.stringify({ userId: "u", role: "DONO" })))).toBeNull();
    expect(parseHint("%")).toBeNull();
  });
});
