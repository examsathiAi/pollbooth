"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  username: string | null;
  phone_number: string | null;
  city: string | null;
  state: string | null;
  avatar_url?: string | null;
  profile?: any;
  moderation?: {
    comment_banned_until?: string | null;
    is_permanently_banned?: boolean;
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("pulse_token") : null;
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/users/profile");
      setUser(res.data);
      return res.data;
    } catch {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("pulse_token");
        window.localStorage.removeItem("pulse_refresh_token");
      }
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const login = async (
    phoneNumber: string,
    otp: string,
    options?: {
      accepted_terms?: boolean;
      accepted_privacy?: boolean;
      age_confirmed?: boolean;
      analytics_consent?: boolean;
    }
  ) => {
    const res = await api.post("/api/v1/auth/otp/verify", {
      phone_number: phoneNumber,
      otp,
      ...options,
    });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pulse_token", res.data.tokens.access_token);
      window.localStorage.setItem("pulse_refresh_token", res.data.tokens.refresh_token);
    }
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("pulse_token");
      window.localStorage.removeItem("pulse_refresh_token");
    }
    setUser(null);
    window.location.href = "/feed";
  };

  return { user, isLoading, login, logout, refreshUser };
}
