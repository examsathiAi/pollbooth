import axios from "axios";
import { currentSource, sendTrack } from "./track";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("pollbooth_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (typeof window !== "undefined") {
    const guestSessionId = localStorage.getItem("pollbooth_guest_session");
    if (guestSessionId) {
      config.headers["x-pollbooth-guest-session"] = guestSessionId;
    }
  }
  return config;
});


function recordConversion(response: any) {
  const url: string = String(response?.config?.url || "");
  if (String(response?.config?.method || "").toLowerCase() !== "post") return;
  if (!currentSource().src) return;
  const v = url.match(/\/api\/v1\/votes\/([^/]+)\/(?:guest-)?vote$/);
  if (v) { sendTrack("VOTE", v[1]); return; }
  if (/\/api\/v1\/auth\/(otp|email-otp|google)\/verify$/.test(url)) sendTrack("SIGNIN");
}

api.interceptors.response.use(
  (response) => {
    try { recordConversion(response); } catch {}
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("pollbooth_refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem("pollbooth_token", res.data.access_token);
          localStorage.setItem("pollbooth_refresh_token", res.data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("pollbooth_token");
          localStorage.removeItem("pollbooth_refresh_token");
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
