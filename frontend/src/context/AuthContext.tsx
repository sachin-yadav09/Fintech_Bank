// frontend\src\context\AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from "react";
import apiClient, { setAccessToken } from "@/libs/apiClient";

export interface User {
  id: number;
  phone_number: string;
  username: string;
  email?: string;
  phone_verified?: boolean;
  has_pin?: boolean;
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Step 1: Refresh the access token using the HttpOnly cookie.
        const { data } = await apiClient.post<{ access: string }>(
          "user/auth/token/refresh/",
        );
        setAccessToken(data.access);

        // Step 2: Fetch the user profile.
        // FIX: Do NOT call setUser(null) on profile failure — token is still
        // valid, so isLoggedIn must stay true to prevent redirect to /login.
        try {
          const { data: userData } = await apiClient.get<User>("user/profile/");
          setUser(userData);
        } catch (profileError) {
          // Token is valid but profile fetch failed (transient error, wrong URL, 500).
          // Leave user as null but DO NOT clear the access token — the session
          // is still alive. The user can retry without being redirected to /login.
          console.error("Profile fetch failed:", profileError);
          // Intentionally NOT calling setUser(null) here so isLoggedIn stays
          // as whatever it was (null on first load is fine — the loading flag
          // is cleared in finally, which stops the spinner).
        }
      } catch {
        // Token refresh failed — genuine logged-out state.
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const refreshUser = async () => {
    const { data } = await apiClient.get<User>("user/profile/");
    setUser(data);
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
  };

  const register = async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<{ access: string; user: User }>(
      "user/auth/register/",
      payload,
    );
    setAccessToken(data.access);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await apiClient.post("user/auth/logout/");
    } catch {
      // best-effort
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
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