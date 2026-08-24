import type { UserProfile } from "@/src/types/vehicle";

export const TOKEN_KEY = "carpilot.accessToken";
export const REFRESH_KEY = "carpilot.refreshToken";
export const USER_KEY = "carpilot.user";

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);

export const readStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};
