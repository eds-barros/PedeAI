const REFRESH_KEY = "pedeai.refreshToken";

let accessToken: string | null = null;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const tokenStore = {
  getAccess() {
    return accessToken;
  },
  setAccess(token: string | null) {
    accessToken = token;
  },
  getRefresh() {
    return storage()?.getItem(REFRESH_KEY) ?? null;
  },
  setRefresh(token: string | null) {
    const store = storage();
    if (!store) return;
    if (token) store.setItem(REFRESH_KEY, token);
    else store.removeItem(REFRESH_KEY);
  },
  clear() {
    accessToken = null;
    storage()?.removeItem(REFRESH_KEY);
  },
};
