import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface PiUser {
  uid: string;
  username: string;
}

interface AuthContextValue {
  user: PiUser | null;
  isLoading: boolean;
  loginWithPi: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  loginWithPi: async () => {},
  logout: () => {},
});

const AUTH_KEY = "@pibazaar/auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const loginWithPi = useCallback(async () => {
    const mockUser: PiUser = {
      uid: "pi_" + Date.now().toString(36),
      username: "pi_user_" + Math.random().toString(36).slice(2, 7),
    };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  }, []);

  const logout = useCallback(() => {
    AsyncStorage.removeItem(AUTH_KEY).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithPi, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
