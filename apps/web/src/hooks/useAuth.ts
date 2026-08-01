"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  username: string | null;
  phone_number: string | null;
  city: string | null;
  state: string | null;
  profile: any;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("pulse_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.get("/api/v1/users/profile")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("pulse_token");
        localStorage.removeItem("pulse_refresh_token");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (phoneNumber: string, otp: string) => {
    const res = await api.post("/api/v1/auth/otp/verify", {
      phone_number: phoneNumber,
      otp,
    });
    localStorage.setItem("pulse_token", res.data.tokens.access_token);
    localStorage.setItem("pulse_refresh_token", res.data.tokens.refresh_token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("pulse_token");
    localStorage.removeItem("pulse_refresh_token");
    setUser(null);
    window.location.href = "/auth/login";
  };

  return { user, isLoading, login, logout };
}
