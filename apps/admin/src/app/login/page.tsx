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
        localStorage.setItem("pollbooth_token", token);
      }

      const user = res.data?.user;
      if (!user?.role || !["MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        setAccessDenied(true);
        return;
      }

      localStorage.setItem("pollbooth_user_role", user.role);

      router.replace("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4efe7] px-4 text-[#1f1b18]">
      <div className="w-full max-w-md rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_rgba(122,31,16,0.08)]">
        <p className="text-sm uppercase tracking-[0.3em] text-[#7a1f10]">Admin access</p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in to PollBooth Admin</h1>
        <p className="mt-2 text-sm text-[#625a50]">Use the seeded admin phone number and OTP 123456 in development.</p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block text-[#1f1b18]">Phone number</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="w-full rounded-2xl border border-[#d8ceb8] bg-[#f7f1e8] px-4 py-3 text-[#1f1b18] outline-none"
              placeholder="+91xxxxxxxxxx"
            />
          </label>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full rounded-2xl bg-[#7a1f10] px-4 py-3 font-medium text-white transition hover:bg-[#5c1709] disabled:opacity-60"
          >
            {loading ? "Working..." : "Send OTP"}
          </button>

          {otpSent ? (
            <>
              <label className="block text-sm">
                <span className="mb-2 block text-[#1f1b18]">OTP</span>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="w-full rounded-2xl border border-[#d8ceb8] bg-[#f7f1e8] px-4 py-3 text-[#1f1b18] outline-none"
                  placeholder="123456"
                />
              </label>
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="w-full rounded-2xl border border-[#d8ceb8] bg-[#f7f1e8] px-4 py-3 font-medium text-[#7a1f10] transition hover:bg-[#f2e7dc] disabled:opacity-60"
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
