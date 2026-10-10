"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const STAFF_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

function errMsg(err: any, fallback: string): string {
  const d = err?.response?.data;
  if (typeof d?.message === "string" && d.message) return d.message;
  if (typeof d?.error === "string" && d.error) return d.error;
  return fallback;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const handleSend = async () => {
    const address = email.trim().toLowerCase();
    if (!address) { setError("Enter your staff email address."); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/v1/auth/email-otp/send", { email: address, mode: "login" });
      setSent(true);
      setWait(30);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // do not reveal whether the address belongs to a staff account
        setSent(true);
        setWait(30);
      } else {
        setError(errMsg(err, "Could not send the code. Please try again in a minute."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const address = email.trim().toLowerCase();
    if (otp.trim().length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/v1/auth/email-otp/verify", { email: address, otp: otp.trim() });
      const user = res.data?.user;
      const token = res.data?.tokens?.access_token;
      if (!token || !user?.role || !STAFF_ROLES.includes(user.role)) {
        setError("This account is not authorised for admin access.");
        return;
      }
      localStorage.setItem("pollbooth_token", token);
      localStorage.setItem("pollbooth_user_role", user.role);
      router.replace("/");
    } catch (err: any) {
      setError(errMsg(err, "That code is not valid or has expired."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4efe7] px-4 text-[#1f1b18]">
      <div className="w-full max-w-md rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_rgba(122,31,16,0.08)]">
        <p className="text-sm uppercase tracking-[0.3em] text-[#7a1f10]">Staff access</p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in to PollBooth HQ</h1>
        <p className="mt-2 text-sm text-[#625a50]">We will email you a 6-digit code. Only staff accounts can enter.</p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block text-[#1f1b18]">Staff email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sent}
              className="w-full rounded-2xl border border-[#d8ceb8] bg-[#f7f1e8] px-4 py-3 text-[#1f1b18] outline-none focus:border-[#7a1f10] disabled:opacity-70"
              placeholder="you@example.com"
            />
          </label>

          {!sent ? (
            <button type="button" onClick={handleSend} disabled={loading}
              className="w-full rounded-2xl bg-[#7a1f10] px-4 py-3 font-medium text-white transition hover:bg-[#5c1709] disabled:opacity-60">
              {loading ? "Sending..." : "Email me a code"}
            </button>
          ) : (
            <>
              <p className="rounded-xl bg-[#f4efe7] p-3 text-sm text-[#625a50]">If this email belongs to a staff account, a code is on its way. It expires in 5 minutes.</p>
              <label className="block text-sm">
                <span className="mb-2 block text-[#1f1b18]">6-digit code</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-[#d8ceb8] bg-[#f7f1e8] px-4 py-3 text-center text-xl tracking-[0.5em] text-[#1f1b18] outline-none focus:border-[#7a1f10]"
                  placeholder="000000"
                />
              </label>
              <button type="button" onClick={handleVerify} disabled={loading}
                className="w-full rounded-2xl bg-[#7a1f10] px-4 py-3 font-medium text-white transition hover:bg-[#5c1709] disabled:opacity-60">
                {loading ? "Checking..." : "Sign in"}
              </button>
              <div className="flex items-center justify-between text-xs text-[#625a50]">
                <button type="button" className="underline" onClick={() => { setSent(false); setOtp(""); setError(""); }}>Use a different email</button>
                <button type="button" className="underline disabled:no-underline disabled:opacity-50" disabled={wait > 0 || loading} onClick={handleSend}>
                  {wait > 0 ? `Send again in ${wait}s` : "Send again"}
                </button>
              </div>
            </>
          )}

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
      </div>
    </main>
  );
}
