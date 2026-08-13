/**
 * AuthContext — PiBazaar Mobile
 *
 * Pi Network compliance: Pi Authentication SDK is the ONLY sign-in method.
 * There is no username/password signup or login — /auth/pi both signs in
 * returning Pioneers and auto-provisions a new account on first sign-in.
 *
 * The JWT is persisted in AsyncStorage (key `@pibazaar/session_token`) and attached
 * to every API request as `Authorization: Bearer <token>` by the api client.
 *
 * Pi SDK limitation:
 *   window.Pi.authenticate() is only available inside the Pi Browser (web). React
 *   Native cannot call it directly, so loginWithPi() degrades gracefully with a clear
 *   "Pi Browser required" message.
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
import type { SelfUser } from "@/lib/api/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: SelfUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  clearError: () => void;
  /** Triggers the Pi SDK flow; throws a friendly error outside the Pi Browser. */
  loginWithPi: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PI_BROWSER_REQUIRED =
  "Pi login is only available inside the Pi Browser. Open PiBazaar in your Pi Browser to sign in.";

// Minimal shape of the Pi SDK we rely on (only present in the Pi Browser).
type PiSdk = {
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound?: (payment: unknown) => void,
  ) => Promise<{ accessToken: string; user?: { wallet_address?: string } }>;
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
  loginWithPi: async () => {},
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

  const acceptToken = useCallback(
    async (piAccessToken: string) => {
      setIsLoading(true);
      setAuthError(null);
      try {
        const { token, user: me } = await authApi.pi({ accessToken: piAccessToken });
        await setToken(token);
        setUser(me);
        queryClient.clear();
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
        loginWithPi,
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
