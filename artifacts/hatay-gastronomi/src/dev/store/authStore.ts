import { create } from "zustand";

const AUTH_KEY = "hatay_dev_auth";

type AuthSession = {
  username: string;
  displayName: string;
};

function loadAuth(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveAuth(session: AuthSession) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(session)); } catch {}
}

function clearAuth() {
  try { localStorage.removeItem(AUTH_KEY); } catch {}
}

const saved = loadAuth();

type AuthState = {
  isAuthenticated: boolean;
  username: string;
  displayName: string;
  authError: string | null;
  authLoading: boolean;

  login: (username: string, displayName: string) => void;
  logout: () => void;
  setDisplayName: (name: string) => void;
  setAuthError: (msg: string | null) => void;
  setAuthLoading: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!saved,
  username: saved?.username ?? "",
  displayName: saved?.displayName ?? "",
  authError: null,
  authLoading: false,

  login: (username, displayName) => {
    const session: AuthSession = { username, displayName };
    saveAuth(session);
    set({ isAuthenticated: true, username, displayName, authError: null });
  },

  logout: () => {
    clearAuth();
    set({ isAuthenticated: false, username: "", displayName: "", authError: null });
  },

  setDisplayName: (name) => {
    set((s) => {
      const session: AuthSession = { username: s.username, displayName: name };
      saveAuth(session);
      return { displayName: name };
    });
  },

  setAuthError: (msg) => set({ authError: msg }),
  setAuthLoading: (v) => set({ authLoading: v }),
}));
