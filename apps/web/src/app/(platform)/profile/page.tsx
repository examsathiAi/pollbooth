"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

interface BadgeItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

interface ProfileSummary {
  id: string;
  username?: string | null;
  city?: string | null;
  state?: string | null;
  profile?: {
    completed_percentage?: number | null;
    age_bracket?: string | null;
    gender?: string | null;
    education?: string | null;
    income_bracket?: string | null;
    employment?: string | null;
    vehicle?: string | null;
    diet?: string | null;
    shopping_pref?: string | null;
    streaming_platforms?: string[] | null;
  } | null;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [form, setForm] = useState({
    username: "",
    city: "",
    state: "",
    age_bracket: "",
    gender: "",
    education: "",
    income_bracket: "",
    employment: "",
    streaming_platforms: "",
    vehicle: "",
    diet: "",
    shopping_pref: "",
  });

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("DPDP Mandate: This action will permanently scrub your personal identity (PII). Proceed?");
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api.delete("/api/v1/users/me");
      localStorage.removeItem("pollbooth_token");
      window.location.href = "/auth/login";
    } catch (err: unknown) {
      const errorInfo = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const errorMessage = errorInfo.response?.data?.message || errorInfo.response?.data?.error || errorInfo.message || "Unknown server error";
      alert("Server Error Details: " + errorMessage);
      setDeleting(false);
    }
  };

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const [badgesRes, streakRes, weeklyRes] = await Promise.all([
          api.get<{ earned?: BadgeItem[]; catalog?: BadgeItem[] }>('/api/v1/badges/me'),
          api.get('/api/v1/votes/me/streak').catch(() => null),
          api.get('/api/v1/votes/me/summary').catch(() => null),
        ]);

        const earned = badgesRes.data.earned || [];
        setBadges(earned);
        setStreak((streakRes?.data as any)?.current_streak ?? null);
        setWeekly(weeklyRes?.data || null);
      } catch {
        setBadges([]);
        setStreak(null);
        setWeekly(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username || "",
      city: user.city || "",
      state: user.state || "",
      age_bracket: user.profile?.age_bracket || "",
      gender: user.profile?.gender || "",
      education: user.profile?.education || "",
      income_bracket: user.profile?.income_bracket || "",
      employment: user.profile?.employment || "",
      streaming_platforms: user.profile?.streaming_platforms?.join(", ") || "",
      vehicle: user.profile?.vehicle || "",
      diet: user.profile?.diet || "",
      shopping_pref: user.profile?.shopping_pref || "",
    });
  }, [user]);

  const profile = useMemo<ProfileSummary | null>(() => {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      city: user.city,
      state: user.state,
      profile: user.profile,
    };
  }, [user]);

  const completion = profile?.profile?.completed_percentage ?? 0;
  const detectLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (data.city && data.region) {
        setForm(prev => ({ ...prev, city: data.city, state: data.region }));
        setFeedback("Location auto-detected via IP.");
      }
    } catch {
      setFeedback("Could not auto-detect location. Please type it manually.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload: Record<string, string | string[] | undefined> = {};
      if (form.username.trim()) payload.username = form.username.trim();
      if (form.city.trim()) payload.city = form.city.trim();
      if (form.state.trim()) payload.state = form.state.trim();
      if (form.age_bracket) payload.age_bracket = form.age_bracket;
      if (form.gender) payload.gender = form.gender;
      if (form.education) payload.education = form.education;
      if (form.income_bracket) payload.income_bracket = form.income_bracket;
      if (form.employment) payload.employment = form.employment;
      if (form.streaming_platforms.trim()) payload.streaming_platforms = form.streaming_platforms.split(",").map((value) => value.trim()).filter(Boolean);
      if (form.vehicle.trim()) payload.vehicle = form.vehicle.trim();
      if (form.diet) payload.diet = form.diet;
      if (form.shopping_pref) payload.shopping_pref = form.shopping_pref;
      await api.patch("/api/v1/users/profile", payload);
      await refreshUser();
      setEditing(false);
      setFeedback("Profile updated.");
    } catch {
      setFeedback("Could not update profile right now.");
    } finally {
      setSaving(false);
    }
  };

  const profileFields = useMemo(() => [
    { key: "display_name", label: "Display name", value: profile?.username || null, prompt: "Add display name" },
    { key: "city", label: "City", value: profile?.city || null, prompt: "Add city" },
    { key: "age_bracket", label: "Age bracket", value: profile?.profile?.age_bracket ? profile.profile.age_bracket.replace(/_/g, " ").toLowerCase().replace(/^./, (char) => char.toUpperCase()) : null, prompt: "Add age bracket" },
    { key: "gender", label: "Gender", value: profile?.profile?.gender ? profile.profile.gender.replace(/_/g, " ").toLowerCase().replace(/^./, (char) => char.toUpperCase()) : null, prompt: "Add gender" },
    { key: "income_bracket", label: "Income bracket", value: profile?.profile?.income_bracket || null, prompt: "Add income bracket" },
    { key: "education", label: "Education", value: profile?.profile?.education || null, prompt: "Add education" },
    { key: "employment", label: "Employment", value: profile?.profile?.employment || null, prompt: "Add employment" },
    { key: "interests", label: "Interests / topics", value: profile?.profile?.streaming_platforms && profile.profile.streaming_platforms.length > 0 ? profile.profile.streaming_platforms.join(", ") : null, prompt: "Add interests" },
  ], [profile]);

  return (
    <main className="w-full bg-[#f4efe7] px-4 py-6 text-[#1f1b18]">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-maroon">Profile</p>
          <h1 className="text-3xl font-semibold text-[#1f1b18]">Your account</h1>
        </div>

        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#625a50]">Display name</p>
              <p className="text-xl font-semibold text-[#1f1b18]">{profile?.username || profile?.city || "Add your display name"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-maroon/20 bg-maroon/5 px-3 py-2 text-sm text-maroon">
                {completion}% complete
              </div>
              <button onClick={() => setEditing((value) => !value)} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-3 py-2 text-sm text-[#1f1b18] transition hover:border-maroon/40 hover:text-maroon">
                {editing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <p className="text-sm text-[#625a50]">City</p>
              <p className="mt-1 font-medium text-[#1f1b18]">{profile?.city || "Add city"}</p>
            </div>
            <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <p className="text-sm text-[#625a50]">Streak</p>
              <p className="mt-1 font-medium text-[#1f1b18]">{loading ? "—" : streak !== null ? `${streak} days` : "No streak yet"}</p>
            </div>
            <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <p className="text-sm text-[#625a50]">Badges</p>
              <p className="mt-1 font-medium text-[#1f1b18]">{badges.length} earned</p>
            </div>
          </div>

          {editing ? (
            <div className="mt-5 rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-[#1f1b18]">
                  <span className="mb-1 block">Display name</span>
                  <input value={form.username} onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]" />
                </label>
                <label className="text-sm text-[#1f1b18]">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[#625a50]">State</span>
                    <button type="button" onClick={detectLocation} className="text-xs text-maroon hover:underline font-medium">Auto-detect IP</button>
                  </div>
                  <select value={form.state} onChange={(event) => setForm((value) => ({ ...value, state: event.target.value, city: "" }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]">
                    <option value="">Select state</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Puducherry">Puducherry</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                  </select>
                </label>
                <label className="text-sm text-[#1f1b18]">
              <span className="mb-1 block text-[#625a50]">City</span>
              <input value={form.city} onChange={(event) => setForm((value) => ({ ...value, city: event.target.value }))} placeholder="e.g. Ranchi" className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]" />
            </label>
                <label className="text-sm text-[#1f1b18]">
                  <span className="mb-1 block text-[#625a50]">Age bracket</span>
                  <select value={form.age_bracket} onChange={(event) => setForm((value) => ({ ...value, age_bracket: event.target.value }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]">
                    <option value="">Select</option>
                    <option value="GEN_ALPHA">Gen Alpha</option>
                    <option value="GEN_Z">Gen Z (1997 - 2012)</option>
                    <option value="MILLENNIAL">Millennial (1981 - 1996)</option>
                    <option value="GEN_X">Gen X (1965 - 1980)</option>
                    <option value="BOOMER">Boomer (1946 - 1964)</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                </label>
                <label className="text-sm text-[#1f1b18]">
                  <span className="mb-1 block text-[#625a50]">Gender</span>
                  <select value={form.gender} onChange={(event) => setForm((value) => ({ ...value, gender: event.target.value }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]">
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="NON_BINARY">Non-binary</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                </label>
                <label className="text-sm text-[#1f1b18]">
                  <span className="mb-1 block text-[#625a50]">Education</span>
                  <select value={form.education} onChange={(event) => setForm((value) => ({ ...value, education: event.target.value }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]">
                    <option value="">Select</option>
                    <option value="High School">High School</option>
                    <option value="Diploma / Certificate">Diploma / Certificate</option>
                    <option value="Undergraduate / Bachelors">Undergraduate / Bachelor&apos;s</option>
                    <option value="Postgraduate / Masters">Postgraduate / Master&apos;s</option>
                    <option value="Doctorate / PhD">Doctorate / PhD</option>
                  </select>
                </label>
                <label className="text-sm text-[#1f1b18]">
                  <span className="mb-1 block text-[#625a50]">Income bracket (Annual)</span>
                  <select value={form.income_bracket} onChange={(event) => setForm((value) => ({ ...value, income_bracket: event.target.value }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]">
                    <option value="">Select</option>
                    <option value="Under 3 Lakhs">Under 3 Lakhs</option>
                    <option value="3 - 10 Lakhs">3 - 10 Lakhs</option>
                    <option value="10 - 20 Lakhs">10 - 20 Lakhs</option>
                    <option value="Above 20 Lakhs">Above 20 Lakhs</option>
                  </select>
                </label>
                <label className="text-sm text-[#1f1b18]">
                  <span className="mb-1 block text-[#625a50]">Employment</span>
                  <select value={form.employment} onChange={(event) => setForm((value) => ({ ...value, employment: event.target.value }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]">
                    <option value="">Select</option>
                    <option value="Student">Student</option>
                    <option value="Employed">Employed</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Retired">Retired</option>
                  </select>
                </label>
                <label className="text-sm text-[#1f1b18]">
                  <span className="mb-1 block text-[#625a50]">Vehicle</span>
                  <select value={form.vehicle} onChange={(event) => setForm((value) => ({ ...value, vehicle: event.target.value }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]">
                    <option value="">Select</option>
                    <option value="None / Public Transport">None / Public Transport</option>
                    <option value="Two-Wheeler">Two-Wheeler</option>
                    <option value="Four-Wheeler">Four-Wheeler</option>
                    <option value="Both">Both (2W & 4W)</option>
                  </select>
                </label>
                <label className="text-sm text-[#1f1b18]">
                  <span className="mb-1 block text-[#625a50]">Diet</span>
                  <select value={form.diet} onChange={(event) => setForm((value) => ({ ...value, diet: event.target.value }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]">
                    <option value="">Select</option>
                    <option value="VEG">Vegetarian</option>
                    <option value="NON_VEG">Non-Vegetarian</option>
                    <option value="VEGAN">Vegan</option>
                  </select>
                </label>
                <label className="text-sm text-[#1f1b18]">
                  <span className="mb-1 block text-[#625a50]">Shopping Preference</span>
                  <select value={form.shopping_pref} onChange={(event) => setForm((value) => ({ ...value, shopping_pref: event.target.value }))} className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]">
                    <option value="">Select</option>
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">In-Store / Offline</option>
                    <option value="BOTH">Both</option>
                  </select>
                </label>
                <label className="text-sm text-[#1f1b18] md:col-span-2">
                  <span className="mb-1 block text-[#625a50]">Interests / topics</span>
                  <input value={form.streaming_platforms} onChange={(event) => setForm((value) => ({ ...value, streaming_platforms: event.target.value }))} placeholder="Politics, Bollywood, Tech" className="w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18]" />
                </label>
              </div>
              {feedback ? <p className="mt-3 text-sm text-maroon">{feedback}</p> : null}
              <div className="mt-4 flex justify-end">
                <button onClick={() => void handleSave()} disabled={saving} className="rounded-2xl bg-maroon px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5c1709] disabled:opacity-60">
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1f1b18]">Progressive profile</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {profileFields.map((field) => (
              <div key={field.key} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                <p className="text-sm text-[#625a50]">{field.label}</p>
                {field.value ? <p className="mt-1 font-medium text-[#1f1b18]">{field.value}</p> : <p className="mt-1 text-sm text-maroon">Add {field.label.toLowerCase()}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1f1b18]">This Week</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <p className="text-sm text-[#625a50]">Polls voted</p>
              <p className="mt-1 font-medium text-[#1f1b18]">{weekly?.polls_voted ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <p className="text-sm text-[#625a50]">Opinions shared</p>
              <p className="mt-1 font-medium text-[#1f1b18]">{weekly?.opinions_shared ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <p className="text-sm text-[#625a50]">Agrees received</p>
              <p className="mt-1 font-medium text-[#1f1b18]">{weekly?.total_agrees_received ?? 0}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1f1b18]">Earned badges</h2>
            <Link href="/badges" className="text-sm text-maroon">View all</Link>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-[#625a50]">Loading badges…</p>
          ) : badges.length === 0 ? (
            <p className="mt-4 text-sm text-[#625a50]">No badges earned yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {badges.map((badge) => (
                <div key={badge.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                  <p className="font-medium text-[#1f1b18]">{badge.name}</p>
                  <p className="mt-1 text-sm text-[#625a50]">{badge.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1f1b18]">Settings & Data Protection</h2>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Link href="/consent" className="inline-flex items-center justify-center rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-4 py-3 text-sm font-medium text-[#1f1b18] transition hover:border-maroon/40 hover:text-maroon">
              Manage consent settings
            </Link>
            <button 
              onClick={() => void handleDeleteAccount()} 
              disabled={deleting} 
              className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {deleting ? "Scrubbing Data..." : "Delete Account & Data"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}