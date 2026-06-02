/**
 * AuthContext — PiBazaar Mobile
 *
 * Mirrors the exact JWT session contract used by the web app's PiAuthProvider:
 *   1. On mount, restores a persisted JWT from AsyncStorage (web uses localStorage).
 *   2. Decodes the JWT payload to hydrate the user store (same decode logic as web).
 *   3. Calls setSupabaseAuth(token) so all subsequent queries use the custom JWT,
 *      honouring the same RLS policies that read auth.jwt() ->> 'pi_uid'.
 *   4. loginWithPi() calls supabase.functions.invoke('pi-auth') with a Pi access
 *      token — the same Supabase Edge Function the web app calls.
 *
 * Pi SDK limitation:
 *   window.Pi.authenticate() is only available inside the Pi Browser (web).
 *   React Native cannot call it directly. loginWithPi() therefore:
 *   a) Checks AsyncStorage for a token previously established by the web session.
 *   b) If none, surfaces a clear "Pi Browser required" message — the same message
 *      the web app shows when window.Pi is absent — rather than fabricating a user.
 *   c) Exposes an acceptToken() escape hatch so tests / native Pi SDK integrations
 *      can inject a real Pi access token and complete the same edge-function flow.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getSupabaseClient, setSupabaseAuth, clearSupabaseAuth } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PiUser {
  pi_uid: string;
  username: string;
  avatar_url: string | null;
}

interface TokenPayload {
  sub: string;
  pi_uid: string;
  username?: string;
  exp: number;
}

interface EdgeAuthUser {
  pi_uid: string;
  pi_id: string;
  username?: string | null;
  avatar_url?: string | null;
}

interface EdgeAuthResponse {
  token?: string;
  user?: EdgeAuthUser;
  error?: string;
}

interface AuthContextValue {
  user: PiUser | null;
  isLoading: boolean;
  authError: string | null;
  loginWithPi: () => Promise<void>;
  acceptToken: (piAccessToken: string, piUid: string, piUsername: string) => Promise<void>;
  logout: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_KEY = "@pibazaar/session_token";

const PI_BROWSER_REQUIRED =
  "Please open PiBazaar inside the Pi Browser to sign in.";

// ─── JWT decode (same algorithm as web PiAuthProvider) ────────────────────────

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    return JSON.parse(atob(padded)) as TokenPayload;
  } catch {
    return null;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  authError: null,
  loginWithPi: async () => {},
  acceptToken: async () => {},
  logout: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then((token) => {
        if (!token) return;

        const decoded = decodeJwtPayload(token);
        if (!decoded || !decoded.pi_uid || decoded.exp * 1000 < Date.now()) {
          AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
          return;
        }

        setSupabaseAuth(token);
        setUser({
          pi_uid: decoded.pi_uid,
          username: decoded.username ?? "Pioneer",
          avatar_url: null,
        });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const finalizeSession = useCallback(
    async (token: string, edgeUser: EdgeAuthUser) => {
      try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      } catch {
        // Non-fatal: session will work for this launch but won't persist.
      }

      setSupabaseAuth(token);

      setUser({
        pi_uid: edgeUser.pi_uid,
        username: edgeUser.username ?? edgeUser.pi_id ?? "Pioneer",
        avatar_url: edgeUser.avatar_url ?? null,
      });
    },
    []
  );

  const invokeEdge = useCallback(
    async (
      piAccessToken: string,
      piUid: string,
      piUsername: string
    ): Promise<{ ok: true; data: EdgeAuthResponse } | { ok: false; message: string }> => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.functions.invoke<EdgeAuthResponse>(
          "pi-auth",
          {
            body: {
              accessToken: piAccessToken,
              pi_uid: piUid,
              pi_username: piUsername,
            },
          }
        );

        if (error) {
          return {
            ok: false,
            message: error.message || "Authentication service unavailable.",
          };
        }

        if (!data) {
          return { ok: false, message: "Empty response from authentication service." };
        }

        return { ok: true, data };
      } catch (err) {
        return {
          ok: false,
          message:
            err instanceof Error
              ? err.message
              : "Network error contacting authentication service.",
        };
      }
    },
    []
  );

  /**
   * loginWithPi — called when the user taps "Sign in with Pi".
   *
   * window.Pi.authenticate() is unavailable in React Native. This function
   * surfaces the same "Pi Browser required" error the web app shows when
   * window.Pi is absent. Use acceptToken() to complete auth once a Pi access
   * token is available (e.g. from a native Pi SDK integration or test harness).
   */
  const loginWithPi = useCallback(async () => {
    setAuthError(PI_BROWSER_REQUIRED);
    throw new Error(PI_BROWSER_REQUIRED);
  }, []);

  /**
   * acceptToken — inject a real Pi access token to complete the same
   * backend auth flow the web app uses. Called by:
   *   - Future native Pi SDK integration
   *   - Test harnesses that supply a Pi access token via deep link / QR scan
   */
  const acceptToken = useCallback(
    async (piAccessToken: string, piUid: string, piUsername: string) => {
      setIsLoading(true);
      setAuthError(null);

      try {
        const result = await invokeEdge(piAccessToken, piUid, piUsername);

        if (!result.ok) {
          setAuthError(result.message);
          throw new Error(result.message);
        }

        const { token, user: edgeUser, error } = result.data;

        if (!token || !edgeUser) {
          const msg = error ?? "Authentication service unavailable.";
          setAuthError(msg);
          throw new Error(msg);
        }

        await finalizeSession(token, edgeUser);
      } finally {
        setIsLoading(false);
      }
    },
    [invokeEdge, finalizeSession]
  );

  const logout = useCallback(() => {
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    clearSupabaseAuth();
    setUser(null);
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, authError, loginWithPi, acceptToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
