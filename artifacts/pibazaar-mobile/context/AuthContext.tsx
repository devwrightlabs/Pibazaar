/**
 * AuthContext — PiBazaar Mobile
 *
 * Two-step auth against the self-contained Express backend (mirrors the web app):
 *   1. Manual Sign Up / Log In with username + password → JWT.
 *   2. Separate "Log in with Pi" via the Pi SDK access token → /auth/pi.
 *
 * The JWT is persisted in AsyncStorage (key `@pibazaar/session_token`) and attached
 * to every API request as `Authorization: Bearer <token>` by the api client.
 *
 * Pi SDK limitation:
 *   window.Pi.authenticate() is only available inside the Pi Browser (web). React
 *   Native cannot call it directly, so loginWithPi() degrades gracefully with a clear
 *   "Pi Browser required" message. acceptToken() is an escape hatch that completes the
 *   same /auth/pi flow once a real Pi access token is available (web Pi Browser, a
 *   native Pi SDK integration, or a developer/test harness).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import {
  authApi,
  setToken,
  hydrateToken,
  ApiError,
} from "@/lib/api/client";
import type {
  SelfUser,
  SignupBody,
  LoginBody,
} from "@/lib/api/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: SelfUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  clearError: () => void;
  signup: (body: SignupBody) => Promise<void>;
  login: (body: LoginBody) => Promise<void>;
  /** Triggers the Pi SDK flow; throws a friendly error outside the Pi Browser. */
  loginWithPi: () => Promise<void>;
  /**
   * Best-effort: verify the current user is a real Pioneer via the Pi SDK and
   * link Pi to their account. Resolves to `false` (never throws) outside the Pi
   * Browser so it can safely run right after signup without blocking anything.
   */
  verifyPioneer: () => Promise<boolean>;
  /** Complete /auth/pi with a real Pi access token (escape hatch). */
  acceptToken: (piAccessToken: string, opts?: { link?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PI_BROWSER_REQUIRED =
  "Pi login is only available inside the Pi Browser. Open PiBazaar in your Pi Browser, or sign in with a username and password.";

// Minimal shape of the Pi SDK we rely on (only present in the Pi Browser).
type PiSdk = {
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound?: (payment: unknown) => void,
  ) => Promise<{ accessToken: string }>;
};

function getPiSdk(): PiSdk | null {
  if (Platform.OS !== "web") return null;
  const w = globalThis as unknown as { Pi?: PiSdk };
  return w.Pi ?? null;
}

function errMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  clearError: () => {},
  signup: async () => {},
  login: async () => {},
  loginWithPi: async () => {},
  verifyPioneer: async () => false,
  acceptToken: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SelfUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearError = useCallback(() => setAuthError(null), []);

  // Restore a persisted session on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await hydrateToken();
        if (!token) return;
        const { user: me } = await authApi.me();
        if (!cancelled) setUser(me);
      } catch {
        // Stale/invalid token — the client clears it on 401.
        await setToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const signup = useCallback(
    async (body: SignupBody) => {
      setIsLoading(true);
      setAuthError(null);
      try {
        const { token, user: me } = await authApi.signup(body);
        await setToken(token);
        setUser(me);
        queryClient.clear();
      } catch (err) {
        const msg = errMessage(err, "Could not create your account.");
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient],
  );

  const login = useCallback(
    async (body: LoginBody) => {
      setIsLoading(true);
      setAuthError(null);
      try {
        const { token, user: me } = await authApi.login(body);
        await setToken(token);
        setUser(me);
        queryClient.clear();
      } catch (err) {
        const msg = errMessage(err, "Invalid username or password.");
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient],
  );

  const acceptToken = useCallback(
    async (piAccessToken: string, opts?: { link?: boolean }) => {
      setIsLoading(true);
      setAuthError(null);
      try {
        const { token, user: me } = await authApi.pi(
          { accessToken: piAccessToken },
          opts,
        );
        if (opts?.link) {
          // Linking Pi to the current account — keep the existing session/cache.
          await setToken(token);
          setUser(me);
        } else {
          await setToken(token);
          setUser(me);
          queryClient.clear();
        }
      } catch (err) {
        const msg = errMessage(err, "Pi authentication failed.");
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient],
  );

  const loginWithPi = useCallback(async () => {
    const pi = getPiSdk();
    if (!pi) {
      // Soft, non-destructive: callers surface this as a gentle info notice
      // rather than a blocking error, so web testing is never interrupted.
      throw new Error(PI_BROWSER_REQUIRED);
    }
    setAuthError(null);
    const { accessToken } = await pi.authenticate(["username", "payments"]);
    await acceptToken(accessToken);
  }, [acceptToken]);

  const verifyPioneer = useCallback(async () => {
    const pi = getPiSdk();
    // Outside the Pi Browser there is no SDK — skip silently, never block.
    if (!pi) return false;
    try {
      const { accessToken } = await pi.authenticate(["username"]);
      const { token, user: me } = await authApi.pi(
        { accessToken },
        { link: true },
      );
      await setToken(token);
      setUser(me);
      return true;
    } catch {
      // Verification is best-effort; the account is already created.
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network failures on logout.
    }
    await setToken(null);
    setUser(null);
    setAuthError(null);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        authError,
        clearError,
        signup,
        login,
        loginWithPi,
        verifyPioneer,
        acceptToken,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
