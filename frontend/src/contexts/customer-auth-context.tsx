"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clientApiRoot, logApiFailure } from "@/lib/api-config";

const STORAGE_ACCESS = "atlas-customer-access";
const STORAGE_REFRESH = "atlas-customer-refresh";

export type CustomerUser = {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: string;
  locale: string;
};

export type CustomerProfile = CustomerUser & { loyaltyPoints: number };

type CustomerAuthContextValue = {
  token: string | null;
  profile: CustomerProfile | null;
  loading: boolean;
  profileLoading: boolean;
  register: (body: {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    email?: string;
  }) => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(
  null,
);

export function CustomerAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiRoot = useMemo(() => clientApiRoot(), []);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const persistTokens = useCallback((access: string, refresh?: string) => {
    localStorage.setItem(STORAGE_ACCESS, access);
    if (refresh) localStorage.setItem(STORAGE_REFRESH, refresh);
    setToken(access);
  }, []);

  const loadProfile = useCallback(
    async (access: string) => {
      setProfileLoading(true);
      try {
        const r = await fetch(`${apiRoot}/auth/me`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (!r.ok) {
          const txt = await r.text();
          if (r.status === 401) {
            localStorage.removeItem(STORAGE_ACCESS);
            localStorage.removeItem(STORAGE_REFRESH);
            setToken(null);
          }
          throw new Error(txt);
        }
        setProfile((await r.json()) as CustomerProfile);
      } catch (e) {
        logApiFailure("auth/me", e);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    },
    [apiRoot],
  );

  useEffect(() => {
    try {
      const a = localStorage.getItem(STORAGE_ACCESS);
      setToken(a);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }
    void loadProfile(token);
  }, [token, loadProfile]);

  const register = useCallback(
    async (body: {
      phone: string;
      password: string;
      firstName: string;
      lastName: string;
      email?: string;
    }) => {
      const r = await fetch(`${apiRoot}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          locale: "ar",
        }),
      });
      const raw = await r.text();
      if (!r.ok) {
        throw new Error(raw || "register failed");
      }
      const data = JSON.parse(raw) as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!data.accessToken) throw new Error("no token");
      persistTokens(data.accessToken, data.refreshToken);
    },
    [apiRoot, persistTokens],
  );

  const login = useCallback(
    async (identifier: string, password: string) => {
      const r = await fetch(`${apiRoot}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const raw = await r.text();
      if (!r.ok) {
        throw new Error(raw || "login failed");
      }
      const data = JSON.parse(raw) as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!data.accessToken) throw new Error("no token");
      persistTokens(data.accessToken, data.refreshToken);
    },
    [apiRoot, persistTokens],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_ACCESS);
    localStorage.removeItem(STORAGE_REFRESH);
    setToken(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    await loadProfile(token);
  }, [token, loadProfile]);

  const value = useMemo(
    () => ({
      token,
      profile,
      loading,
      profileLoading,
      register,
      login,
      logout,
      refreshProfile,
    }),
    [
      token,
      profile,
      loading,
      profileLoading,
      register,
      login,
      logout,
      refreshProfile,
    ],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return ctx;
}
