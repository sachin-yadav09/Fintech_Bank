import React, { createContext, useEffect, useState, type ReactNode } from "react";
import apiClient, {
  AUTH_LOGOUT_EVENT,
  setAccessToken,
} from "@/shared/api/client";

export interface User {
  id: number;
  phone_number: string;
  username: string;
  email?: string;
  phone_verified?: boolean;
}

interface SendOTPPayload {
  phone_number?: string;
  email?: string;
  purpose: "LOGIN" | "REGISTER";
  delivery_method?: "SMS" | "EMAIL" | "BOTH";
}

interface LoginPayload {
  phone_number?: string;
  email?: string;
  otp_id: string | number;
  otp_code: string;
  delivery_method?: "SMS" | "EMAIL" | "BOTH";
}

interface RegisterPayload {
  phone_number?: string;
  email?: string;
  otp_id: number;
  otp_code: string;
  full_name: string;
  password: string;
  delivery_method?: "SMS" | "EMAIL" | "BOTH";
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  sendOTP: (
    payload: SendOTPPayload,
  ) => Promise<{ otp_id: number; message: string; delivery_method?: string }>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoggedIn: false,
  sendOTP: async () => ({ otp_id: 0, message: "" }),
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasSession, setHasSession] = useState<boolean>(false);

  useEffect(() => {
    const handleLogoutEvent = () => {
      setAccessToken(null);
      setUser(null);
      setHasSession(false);
      setLoading(false);
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogoutEvent);

    const initializeAuth = async () => {
      try {
        const { data } = await apiClient.post<{ access: string }>(
          "user/auth/token/refresh/",
        );
        setAccessToken(data.access);
        setHasSession(true);

        try {
          const { data: userData } = await apiClient.get<User>("user/profile/");
          setUser(userData);
        } catch (profileError) {
          console.error("Profile fetch failed:", profileError);
          setUser(null);
        }
      } catch {
        setUser(null);
        setAccessToken(null);
        setHasSession(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogoutEvent);
    };
  }, []);

  const refreshUser = async () => {
    const { data } = await apiClient.get<User>("user/profile/");
    setUser(data);
    setHasSession(true);
  };

  const sendOTP = async (payload: SendOTPPayload) => {
    const { data } = await apiClient.post<{
      otp_id: number;
      message: string;
      delivery_method?: string;
    }>("user/auth/send-otp/", payload);
    return data;
  };

  const login = async (payload: LoginPayload) => {
    const { data } = await apiClient.post<{ access: string; user: User }>(
      "user/auth/login/",
      payload,
    );
    setAccessToken(data.access);
    setUser(data.user);
    setHasSession(true);
  };

  const register = async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<{ access: string; user: User }>(
      "user/auth/register/",
      payload,
    );
    setAccessToken(data.access);
    setUser(data.user);
    setHasSession(true);
  };

  const logout = async () => {
    try {
      await apiClient.post("user/auth/logout/");
    } catch {
      // best-effort
    } finally {
      setAccessToken(null);
      setUser(null);
      setHasSession(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: hasSession,
        sendOTP,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

