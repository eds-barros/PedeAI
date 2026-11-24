export const THEME_STORAGE_KEY = "pedeai-theme";

export type ThemeChoice = "light" | "dark";

/** Mantém a mesma regra do script bloqueante em `themeBootScript`. */
export function resolveTheme(stored: string | null, prefersDark: boolean): ThemeChoice {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

export const themeBootScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t;}catch(e){}})();`;

const themeListeners = new Set<() => void>();

export function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  themeListeners.forEach((listener) => listener());
}

export function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (localStorage.getItem(THEME_STORAGE_KEY)) return;
    const next = resolveTheme(null, media.matches);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    listener();
  };
  media.addEventListener("change", onMedia);
  return () => {
    themeListeners.delete(listener);
    media.removeEventListener("change", onMedia);
  };
}

export function readAppliedTheme(): ThemeChoice {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
