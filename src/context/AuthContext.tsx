import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AdminUser, type AuthContextValue, type LoginResult } from './auth-context';
import { DEFAULT_ADMIN, STORAGE_KEYS } from '../config/constants';
import { readStorage, writeStorage } from '../lib/storage';
import { sha256Hex } from '../lib/hash';
import { createId } from '../lib/id';

/**
 * ⚠️ FRONTEND-ONLY LOGIN — for development and demos.
 *
 * Anyone can read browser code and localStorage, so this keeps casual users out
 * but is NOT real security. When you add a backend, replace `login`,
 * `changePassword` and `logout` with API calls (e.g. POST /api/auth/login that
 * sets an httpOnly cookie) and check the password on the server.
 */

interface StoredCredentials {
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  isDefault: boolean;
}

interface Session {
  email: string;
  name: string;
  loggedInAt: string;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

const hashPassword = (password: string, salt: string) => sha256Hex(`${salt}:${password}`);

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.session) ?? localStorage.getItem(STORAGE_KEYS.session);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null, remember = false) {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.session);
    localStorage.removeItem(STORAGE_KEYS.session);
    if (session) (remember ? localStorage : sessionStorage).setItem(STORAGE_KEYS.session, JSON.stringify(session));
  } catch {
    // Storage blocked — the session lasts until the page is reloaded.
  }
}

async function loadCredentials(): Promise<StoredCredentials> {
  const saved = readStorage<StoredCredentials | null>(STORAGE_KEYS.credentials, null);
  if (saved?.passwordHash && saved.salt) return saved;
  // First run: create the default admin account.
  const salt = createId();
  const created: StoredCredentials = {
    email: DEFAULT_ADMIN.email,
    name: DEFAULT_ADMIN.name,
    salt,
    passwordHash: await hashPassword(DEFAULT_ADMIN.password, salt),
    isDefault: true,
  };
  writeStorage(STORAGE_KEYS.credentials, created);
  return created;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession);
  const [usingDefaultPassword, setUsingDefaultPassword] = useState<boolean>(
    () => readStorage<StoredCredentials | null>(STORAGE_KEYS.credentials, null)?.isDefault ?? true,
  );
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const login = useCallback(
    async (email: string, password: string, remember: boolean): Promise<LoginResult> => {
      const now = Date.now();
      if (now < lockedUntil) {
        const seconds = Math.ceil((lockedUntil - now) / 1000);
        return { ok: false, error: `Too many attempts. Try again in ${seconds} seconds.` };
      }

      const creds = await loadCredentials();
      const emailMatches = email.trim().toLowerCase() === creds.email.toLowerCase();
      const passwordMatches = (await hashPassword(password, creds.salt)) === creds.passwordHash;

      if (!emailMatches || !passwordMatches) {
        const attempts = failedAttempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          setFailedAttempts(0);
          setLockedUntil(now + LOCKOUT_MS);
          return { ok: false, error: 'Too many attempts. Try again in 30 seconds.' };
        }
        setFailedAttempts(attempts);
        // Same message for both cases so it doesn't reveal which part was wrong.
        return { ok: false, error: 'Incorrect email or password.' };
      }

      const next: Session = { email: creds.email, name: creds.name, loggedInAt: new Date().toISOString() };
      saveSession(next, remember);
      setSession(next);
      setFailedAttempts(0);
      setUsingDefaultPassword(creds.isDefault);
      return { ok: true };
    },
    [failedAttempts, lockedUntil],
  );

  const logout = useCallback(() => {
    saveSession(null);
    setSession(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<LoginResult> => {
    const creds = await loadCredentials();
    if ((await hashPassword(currentPassword, creds.salt)) !== creds.passwordHash) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
    const salt = createId();
    writeStorage(STORAGE_KEYS.credentials, {
      ...creds,
      salt,
      passwordHash: await hashPassword(newPassword, salt),
      isDefault: false,
    } satisfies StoredCredentials);
    setUsingDefaultPassword(false);
    return { ok: true };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user: AdminUser | null = session ? { email: session.email, name: session.name } : null;
    return { user, isAuthenticated: !!user, usingDefaultPassword, login, logout, changePassword };
  }, [session, usingDefaultPassword, login, logout, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
