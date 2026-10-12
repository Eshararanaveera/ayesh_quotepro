import { createContext } from 'react';

export interface AdminUser {
  email: string;
  name: string;
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export interface AuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  /** True while the default password hasn't been changed yet. */
  usingDefaultPassword: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<LoginResult>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<LoginResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
