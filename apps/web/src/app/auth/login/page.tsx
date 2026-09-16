"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Script from "next/script";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Loader2, Activity, ShieldCheck, Mail, Phone } from "lucide-react";
import Link from "next/link";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const { login, sendEmailOtp, loginWithEmailOtp, loginWithGoogle } = useAuth();
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    try {
      const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      if (sp) {
        setMode(sp.get("mode") === "signup" ? "signup" : "login");
        setRedirectPath(sp.get("redirect") || "/feed");
      }
    } catch (e) {}
  }, []);

  const consentOk = mode === "login" || (acceptedTerms && acceptedPrivacy && ageConfirmed);

  const handleGoogleCredential = async (response: any) => {
    setError("");
    if (mode === "signup" && !consentOk) {
      setError("Please accept the Terms, Privacy Policy, and confirm your age before signing up.");
      return;
    }
    setIsLoading(true);
    try {
      await loginWithGoogle(response.credential, mode === "signup" ? {
        accepted_terms: acceptedTerms,
        accepted_privacy: acceptedPrivacy,
        age_confirmed: ageConfirmed,
        analytics_consent: analyticsConsent,
      } : undefined);
      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.response?.data?.message || "Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!googleReady || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    // @ts-ignore
    if (!window.google?.accounts?.id) return;
    // @ts-ignore
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    // @ts-ignore
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: 360,
      text: mode === "signup" ? "signup_with" : "signin_with",
    });
  }, [googleReady, mode, acceptedTerms, acceptedPrivacy, ageConfirmed, analyticsConsent]);

  const sendPhoneOtp = async () => {
    if (!phone.match(/^[6-9]\d{9}$/)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }
    if (mode === "signup" && !consentOk) {
      setError("Please accept the Terms, Privacy Policy, and confirm your age to continue.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await api.post("/api/v1/auth/otp/send", { phone_number: `+91${phone}`, mode });
      setStep("otp");
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404 && mode === "login") {
        setMode("signup");
        setError("Number not registered. Please check the boxes above to sign up.");
      } else if (status === 409 && mode === "signup") {
        setMode("login");
        setError("Account already exists. Please sign in.");
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || "Failed to send OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await login(`+91${phone}`, otp, mode === "signup" ? {
        username: name.trim(),
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

  const sendEmailOtpStep = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }
    if (mode === "signup" && !consentOk) {
      setError("Please accept the Terms, Privacy Policy, and confirm your age to continue.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await sendEmailOtp(email, mode);
      setStep("otp");
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404 && mode === "login") {
        setMode("signup");
        setError("Email not registered. Please check the boxes above to sign up.");
      } else if (status === 409 && mode === "signup") {
        setMode("login");
        setError("Account already exists. Please sign in.");
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || "Failed to send OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailOtpStep = async () => {
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await loginWithEmailOtp(email, otp, mode === "signup" ? {
        username: name.trim(),
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

  const sendOtp = method === "phone" ? sendPhoneOtp : sendEmailOtpStep;
  const verifyOtp = method === "phone" ? verifyPhoneOtp : verifyEmailOtpStep;
  const contactLabel = method === "phone" ? `+91 ${phone}` : email;

  return (
    <div className="flex min-h-screen bg-[#f4efe7]">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleReady(true)}
      />

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
              {mode === "signup" ? "Sign up with Google, or use your phone or email below." : "Sign in with Google, or use your phone or email below."}
            </p>
          </div>

          {step === "phone" && mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-slate-700">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="flex h-11 w-full rounded-md border border-[#d8ceb8] bg-white px-3 py-2 text-sm placeholder:text-[#625a50] focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent transition-all"
              />
            </div>
          )}

          {mode === "signup" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              {[
                { state: analyticsConsent, setter: setAnalyticsConsent, label: "Allow anonymous analytics to improve experience (optional)." },
                {
                  state: acceptedTerms && acceptedPrivacy && ageConfirmed,
                  setter: (checked: boolean) => {
                    setAcceptedTerms(checked);
                    setAcceptedPrivacy(checked);
                    setAgeConfirmed(checked);
                  },
                  label: <>I agree to the <Link href="/terms" className="font-semibold text-slate-900 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="font-semibold text-slate-900 hover:underline">Privacy Policy</Link>, and confirm that I am 18 years or older.</>,
                },
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

          {step === "phone" && (
            <div className="flex justify-center">
              <div ref={googleButtonRef} />
              {!GOOGLE_CLIENT_ID && (
                <p className="text-xs text-slate-400">Google Sign-In will appear here once configured.</p>
              )}
            </div>
          )}

          {step === "phone" && (
            <div className="relative flex items-center gap-2">
              <div className="flex-1 border-t border-[#d8ceb8]" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">or</span>
              <div className="flex-1 border-t border-[#d8ceb8]" />
            </div>
          )}

          {step === "phone" && (
            <div className="flex rounded-md border border-[#d8ceb8] bg-white p-1">
              <button
                onClick={() => { setMethod("phone"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-2 h-9 rounded text-sm font-medium transition-colors ${method === "phone" ? "bg-maroon text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Phone className="w-4 h-4" /> Phone
              </button>
              <button
                onClick={() => { setMethod("email"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-2 h-9 rounded text-sm font-medium transition-colors ${method === "email" ? "bg-maroon text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
            </div>
          )}

          {step === "phone" ? (
            <div className="space-y-6">
              {method === "phone" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-slate-700">Phone Number</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-medium text-slate-500">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex h-11 w-full rounded-md border border-[#d8ceb8] bg-white pl-10 pr-3 py-2 text-sm placeholder:text-[#625a50] focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex h-11 w-full rounded-md border border-[#d8ceb8] bg-white px-3 py-2 text-sm placeholder:text-[#625a50] focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent transition-all"
                  />
                </div>
              )}

              {error && <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}

              <button
                onClick={sendOtp}
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center rounded-md bg-maroon h-11 px-8 text-sm font-medium text-white transition-colors hover:bg-[#5c1709] focus:outline-none focus:ring-2 focus:ring-maroon focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
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
                  className="flex h-12 w-full rounded-md border border-[#d8ceb8] bg-white px-3 py-2 text-center text-2xl tracking-[0.5em] font-mono placeholder:text-[#d8ceb8] focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent transition-all"
                  maxLength={6}
                />
                <p className="text-xs text-slate-500 pt-1">Sent to {contactLabel}</p>
              </div>

              {error && <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}

              <button
                onClick={verifyOtp}
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center rounded-md bg-maroon h-11 px-8 text-sm font-medium text-white transition-colors hover:bg-[#5c1709] focus:outline-none focus:ring-2 focus:ring-maroon focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Continue"}
              </button>

              <div className="flex justify-center">
                <button
                  onClick={() => setStep("phone")}
                  className="text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors"
                >
                  ← Use a different {method === "phone" ? "number" : "email"}
                </button>
              </div>
            </div>
          )}

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
