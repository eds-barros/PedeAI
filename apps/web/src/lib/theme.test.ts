import { describe, expect, it } from "vitest";
import { resolveTheme, themeBootScript, THEME_STORAGE_KEY } from "@/lib/theme";

describe("tema", () => {
  it("respeita a preferência salva e, sem ela, o esquema do sistema", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("sistema", true)).toBe("dark");
  });

  it("o script de boot usa a mesma chave", () => {
    expect(themeBootScript).toContain(THEME_STORAGE_KEY);
    expect(themeBootScript).toContain("prefers-color-scheme: dark");
  });
});
