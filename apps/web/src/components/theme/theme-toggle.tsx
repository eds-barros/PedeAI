"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { applyTheme, readAppliedTheme, subscribeTheme, type ThemeChoice } from "@/lib/theme";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, readAppliedTheme, () => "light" as ThemeChoice);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="inline-flex size-11 items-center justify-center rounded-lg border border-border-strong bg-surface text-foreground"
      aria-pressed={isDark}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      onClick={() => applyTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  );
}
