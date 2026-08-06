"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
    } catch (e) {
      // ignore
    }
  }, []);

  const sendOtp = async () => {
    if (!phone.match(/^\+91[6-9]\d{9}$/)) {
      setError("Please enter a valid Indian phone number (+91...)");
      return;
    }
    if (mode === "signup" && (!acceptedTerms || !acceptedPrivacy || !ageConfirmed)) {
      setError("Please accept the Terms, Privacy policy, and confirm your age to continue.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await api.post("/api/v1/auth/otp/send", { phone_number: phone });
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Please enter 6-digit OTP");
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
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-700">Pulse</h1>
          <p className="text-sm text-gray-500 mt-1">{mode === "signup" ? "Create your account with a quick OTP" : "Sign in to keep your voice and streak"}</p>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">We&apos;ll send a 6-digit OTP to confirm your account</p>
            </div>
            {mode === "signup" ? (
              <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    I agree to the <a href="/terms" className="font-semibold text-blue-600">Terms of Service</a>.
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    I have read the <a href="/privacy" className="font-semibold text-blue-600">Privacy Policy</a>.
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(event) => setAgeConfirmed(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>I confirm that I am 18 years or older.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={analyticsConsent}
                    onChange={(event) => setAnalyticsConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow anonymous analytics to improve Pulse experience (optional).</span>
                </label>
              </div>
            ) : null}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={sendOtp}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "signup" ? "Create account" : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "signup" ? "Verify & create account" : "Verify & login"}
            </button>
            <button
              onClick={() => setStep("phone")}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              Change phone number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
