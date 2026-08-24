import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { UserProfile } from "@/src/types/vehicle";
import { apiClient } from "@/src/api/client";
import {
  clearAuthStorage,
  getAccessToken,
  readStoredUser,
  REFRESH_KEY,
  TOKEN_KEY,
  USER_KEY,
} from "@/src/lib/authStorage";

export { getAccessToken } from "@/src/lib/authStorage";

export interface AuthSession {
  accessToken: string;
  refreshToken?: string | null;
  user: UserProfile;
}

interface AuthContextValue {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: UserProfile) => void;
}

interface AuthResponse {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  user: UserProfile;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    getAccessToken()
  );
  const [user, setUserState] = useState<UserProfile | null>(() =>
    readStoredUser()
  );

  const persist = useCallback((session: AuthSession | null) => {
    if (!session) {
      clearAuthStorage();
      setAccessToken(null);
      setUserState(null);
      return;
    }

    localStorage.setItem(TOKEN_KEY, session.accessToken);
    if (session.refreshToken) {
      localStorage.setItem(REFRESH_KEY, session.refreshToken);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setAccessToken(session.accessToken);
    setUserState(session.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiClient.post<AuthResponse>("/auth/login", {
        email,
        password,
      });
      persist({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
    },
    [persist]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await apiClient.post<AuthResponse>("/auth/register", {
        name,
        email,
        password,
      });
      persist({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
    },
    [persist]
  );

  const logout = useCallback(() => {
    persist(null);
  }, [persist]);

  const setUser = useCallback((next: UserProfile) => {
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    setUserState(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken),
      login,
      register,
      logout,
      setUser,
    }),
    [user, accessToken, login, register, logout, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
