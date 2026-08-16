"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Loader2, Activity, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Consent States
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);

  const [mode, setMode] = useState<"signup" | "login">("login");
  const [redirectPath, setRedirectPath] = useState<string>("/feed");

  useEffect(() => {
    try {
      const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      if (sp) {
        setMode(sp.get("mode") === "signup" ? "signup" : "login");
        setRedirectPath(sp.get("redirect") || "/feed");
      }
    } catch (e) {}
  }, []);

  const sendOtp = async () => {
    if (!phone.match(/^\+91[6-9]\d{9}$/)) {
      setError("Please enter a valid Indian phone number (+91...)");
      return;
    }
    if (mode === "signup" && (!acceptedTerms || !acceptedPrivacy || !ageConfirmed)) {
      setError("Please accept the Terms, Privacy Policy, and confirm your age to continue.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await api.post("/api/v1/auth/otp/send", { phone_number: phone });
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await login(phone, otp, mode === "signup" ? {
        accepted_terms: acceptedTerms,
        accepted_privacy: acceptedPrivacy,
        age_confirmed: ageConfirmed,
        analytics_consent: analyticsConsent,
      } : undefined);
      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f4efe7]">
      <div className="hidden lg:flex w-1/2 flex-col justify-between overflow-hidden bg-[#fffdf9] p-12 shadow-[inset_-1px_0_0_#d8ceb8]">
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-[#f2e7dc] blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#f7f1e8] blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-2 text-2xl font-bold tracking-tight text-[#7a1f10]">
          <Activity className="h-6 w-6" /> PollBooth
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight text-[#1f1b18]">
            Join the conversation. <br /> Shape the narrative.
          </h2>
          <p className="mt-4 text-lg text-[#625a50]">
            Sign in to securely cast your votes, build your civic streak, and engage with verified cohorts across the platform.
          </p>

          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-[#1f1b18]">
              <ShieldCheck className="h-5 w-5 text-[#7a1f10]" />
              <span>Bank-grade OTP authentication</span>
            </div>
            <div className="flex items-center gap-3 text-[#1f1b18]">
              <ShieldCheck className="h-5 w-5 text-[#7a1f10]" />
              <span>DPDP compliant data protection</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-[#625a50]">
          © {new Date().getFullYear()} PollBooth Enterprise. All rights reserved.
        </div>
      </div>

      <div className="flex w-full items-center justify-center p-8 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8 rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_rgba(122,31,16,0.08)] sm:p-8">
          <div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#7a1f10] lg:hidden">
            <Activity className="h-6 w-6" /> PollBooth
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1f1b18]">
              {mode === "signup" ? "Create an account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-[#625a50]">
              {mode === "signup"
                ? "Enter your phone number below to create your secure account."
                : "Enter your phone number to sign in to your account."}
            </p>
          </div>

          {step === "phone" ? (
            <div className="space-y-6 mt-8">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>

              {mode === "signup" && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  {[
                    { state: acceptedTerms, setter: setAcceptedTerms, label: <>I agree to the <Link href="/terms" className="font-semibold text-slate-900 hover:underline">Terms of Service</Link>.</> },
                    { state: acceptedPrivacy, setter: setAcceptedPrivacy, label: <>I have read the <Link href="/privacy" className="font-semibold text-slate-900 hover:underline">Privacy Policy</Link>.</> },
                    { state: ageConfirmed, setter: setAgeConfirmed, label: "I confirm that I am 18 years or older." },
                    { state: analyticsConsent, setter: setAnalyticsConsent, label: "Allow anonymous analytics to improve experience (optional)." },
                  ].map((item, i) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer group">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={(e) => item.setter(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </div>
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{item.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {error && <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}

              <button
                onClick={sendOtp}
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 h-11 px-8 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signup" ? "Sign up" : "Sign in"}
              </button>
            </div>
          ) : (
            <div className="space-y-6 mt-8">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-slate-700">One-Time Password</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="flex h-12 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-2xl tracking-[0.5em] font-mono placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  maxLength={6}
                />
                <p className="text-xs text-slate-500 pt-1">Sent to {phone}</p>
              </div>

              {error && <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}

              <button
                onClick={verifyOtp}
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 h-11 px-8 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Continue"}
              </button>

              <div className="flex justify-center">
                <button
                  onClick={() => setStep("phone")}
                  className="text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors"
                >
                  ← Use a different number
                </button>
              </div>
            </div>
          )}

          {/* Toggle Mode */}
          <div className="text-center text-sm text-slate-500 mt-6">
            {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError("");
                setStep("phone");
              }}
              className="font-semibold text-slate-900 hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}