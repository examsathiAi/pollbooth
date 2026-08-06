"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("+911234567890");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const handleSendOtp = async () => {
    const phone = phoneNumber.trim();
    setLoading(true);
    setError("");
    setAccessDenied(false);
    try {
      await api.post("/api/v1/auth/otp/send", { phone_number: phone });
      setOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const phone = phoneNumber.trim();
    setLoading(true);
    setError("");
    setAccessDenied(false);
    try {
      const res = await api.post("/api/v1/auth/otp/verify", {
        phone_number: phone,
        otp,
      });

      const token = res.data?.tokens?.access_token;
      if (token) {
        localStorage.setItem("pulse_token", token);
      }

      const user = res.data?.user;
      if (!user?.role || !["MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        setAccessDenied(true);
        return;
      }

      localStorage.setItem("pulse_user_role", user.role);

      router.replace("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/30">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Admin access</p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in to Pulse Admin</h1>
        <p className="mt-2 text-sm text-slate-400">Use the seeded admin phone number and OTP 123456 in development.</p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block text-slate-300">Phone number</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none"
              placeholder="+91xxxxxxxxxx"
            />
          </label>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? "Working..." : "Send OTP"}
          </button>

          {otpSent ? (
            <>
              <label className="block text-sm">
                <span className="mb-2 block text-slate-300">OTP</span>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none"
                  placeholder="123456"
                />
              </label>
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="w-full rounded-2xl border border-cyan-500/40 bg-slate-950/70 px-4 py-3 font-medium text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </>
          ) : null}

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {accessDenied ? <p className="text-sm text-amber-400">Access denied. This account is not authorized for admin access.</p> : null}
        </div>
      </div>
    </main>
  );
}
