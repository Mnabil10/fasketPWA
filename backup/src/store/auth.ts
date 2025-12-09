import { create } from "zustand";
import { registerAuthHooks } from "../api/client";
import { authLogin, authRegister, authRefresh } from "../services/auth";

type User = { id: string; name: string; phone: string; email?: string; role: string };

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (p: { name: string; phone: string; password: string; email?: string }) => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem("at"),
  refreshToken: localStorage.getItem("rt"),
  isAuthenticated: !!localStorage.getItem("at"),
  async login(phone, password) {
    const data = await authLogin({ phone, password });
    localStorage.setItem("at", data.accessToken);
    localStorage.setItem("rt", data.refreshToken);
    set({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
    });
  },
  async register(body) {
    const data = await authRegister(body);
    localStorage.setItem("at", data.accessToken);
    localStorage.setItem("rt", data.refreshToken);
    set({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
    });
  },
  logout() {
    localStorage.removeItem("at");
    localStorage.removeItem("rt");
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));

// اربط الـ hooks مرّة واحدة (في bootstrap للتطبيق مثلاً)
registerAuthHooks(
  () => ({ accessToken: useAuth.getState().accessToken, refreshToken: useAuth.getState().refreshToken }),
  (t) => useAuth.setState({ accessToken: t.accessToken, refreshToken: t.refreshToken, isAuthenticated: !!t.accessToken }),
  () => useAuth.getState().logout()
);
