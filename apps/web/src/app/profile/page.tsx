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
    completion_percentage?: number | null;
    age_bracket?: string | null;
    gender?: string | null;
    education?: string | null;
    income_bracket?: string | null;
    employment?: string | null;
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
  });

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("DPDP Mandate: This action will permanently scrub your personal identity (PII). Proceed?");
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api.delete("/api/v1/users/me");
      localStorage.removeItem("pulse_token");
      window.location.href = "/auth/login";
    } catch (err) {
      alert("Server Error Details: " + (err.response?.data?.message || err.response?.data?.error || err.message || JSON.stringify(err.response?.data)));
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

  const completion = profile?.profile?.completion_percentage ?? 0;

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
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Profile</p>
          <h1 className="text-3xl font-semibold">Your account</h1>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Display name</p>
              <p className="text-xl font-semibold">{profile?.username || profile?.city || "Add your display name"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300">
                {completion}% complete
              </div>
              <button onClick={() => setEditing((value) => !value)} className="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/50 hover:text-white">
                {editing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">City</p>
              <p className="mt-1 font-medium">{profile?.city || "Add city"}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Streak</p>
              <p className="mt-1 font-medium">{loading ? "—" : streak !== null ? `${streak} days` : "No streak yet"}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Badges</p>
              <p className="mt-1 font-medium">{badges.length} earned</p>
            </div>
          </div>

          {editing ? (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block">Display name</span>
                  <input value={form.username} onChange={(event) => setForm((value) => ({ ...value, username: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block">State</span>
                  <select value={form.state} onChange={(event) => setForm((value) => ({ ...value, state: event.target.value, city: "" }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                    <option value="">Select state</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Puducherry">Puducherry</option>
                    <option value="Chandigarh">Chandigarh</option>
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block">City</span>
                  <select value={form.city} onChange={(event) => setForm((value) => ({ ...value, city: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                    <option value="">Select city</option>
                    {form.state === "Delhi" ? (["Delhi", "Noida", "Gurgaon", "Faridabad"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Maharashtra" ? (["Mumbai", "Pune", "Nagpur", "Nashik"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Tamil Nadu" ? (["Chennai", "Coimbatore", "Madurai", "Salem"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Karnataka" ? (["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Uttar Pradesh" ? (["Lucknow", "Kanpur", "Noida", "Agra"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "West Bengal" ? (["Kolkata", "Howrah", "Durgapur", "Siliguri"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Telangana" ? (["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Rajasthan" ? (["Jaipur", "Jodhpur", "Udaipur", "Kota"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Gujarat" ? (["Ahmedabad", "Surat", "Vadodara", "Rajkot"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Punjab" ? (["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Kerala" ? (["Thiruvananthapuram", "Kochi", "Kozhikode", "Kottayam"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Andhra Pradesh" ? (["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Haryana" ? (["Gurgaon", "Faridabad", "Panipat", "Hisar"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Bihar" ? (["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Odisha" ? (["Bhubaneswar", "Cuttack", "Rourkela", "Puri"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Assam" ? (["Guwahati", "Silchar", "Dibrugarh", "Jorhat"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Jharkhand" ? (["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {form.state === "Chhattisgarh" ? (["Raipur", "Bhilai", "Bilaspur", "Korba"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                    {!form.state ? (["Mumbai", "Delhi", "Bengaluru", "Chennai", "Hyderabad", "Kolkata", "Pune", "Jaipur", "Ahmedabad", "Lucknow"].map((city) => <option key={city} value={city}>{city}</option>)) : null}
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block">Age bracket</span>
                  <select value={form.age_bracket} onChange={(event) => setForm((value) => ({ ...value, age_bracket: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                    <option value="">Select</option>
                    <option value="GEN_Z">Gen Z</option>
                    <option value="MILLENNIAL">Millennial</option>
                    <option value="GEN_X">Gen X</option>
                    <option value="BOOMER">Boomer</option>
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block">Gender</span>
                  <select value={form.gender} onChange={(event) => setForm((value) => ({ ...value, gender: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="NON_BINARY">Non-binary</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block">Education</span>
                  <input value={form.education} onChange={(event) => setForm((value) => ({ ...value, education: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block">Income bracket</span>
                  <input value={form.income_bracket} onChange={(event) => setForm((value) => ({ ...value, income_bracket: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block">Employment</span>
                  <input value={form.employment} onChange={(event) => setForm((value) => ({ ...value, employment: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                </label>
                <label className="text-sm text-slate-300 md:col-span-2">
                  <span className="mb-1 block">Interests / topics</span>
                  <input value={form.streaming_platforms} onChange={(event) => setForm((value) => ({ ...value, streaming_platforms: event.target.value }))} placeholder="Politics, Bollywood, Tech" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                </label>
              </div>
              {feedback ? <p className="mt-3 text-sm text-cyan-400">{feedback}</p> : null}
              <div className="mt-4 flex justify-end">
                <button onClick={() => void handleSave()} disabled={saving} className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60">
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Progressive profile</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {profileFields.map((field) => (
              <div key={field.key} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">{field.label}</p>
                {field.value ? <p className="mt-1 font-medium text-white">{field.value}</p> : <p className="mt-1 text-sm text-cyan-400">Add {field.label.toLowerCase()}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">This Week</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Polls voted</p>
              <p className="mt-1 font-medium">{weekly?.polls_voted ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Opinions shared</p>
              <p className="mt-1 font-medium">{weekly?.opinions_shared ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Agrees received</p>
              <p className="mt-1 font-medium">{weekly?.total_agrees_received ?? 0}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Earned badges</h2>
            <Link href="/badges" className="text-sm text-cyan-400">View all</Link>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading badges…</p>
          ) : badges.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No badges earned yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {badges.map((badge) => (
                <div key={badge.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="font-medium text-white">{badge.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{badge.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold">Settings & Data Protection</h2>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Link href="/consent" className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-500/50 hover:text-white">
              Manage consent settings
            </Link>
            <button 
              onClick={() => void handleDeleteAccount()} 
              disabled={deleting} 
              className="inline-flex items-center justify-center rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm font-medium text-rose-400 transition hover:bg-rose-900/50 hover:text-rose-300 disabled:opacity-50"
            >
              {deleting ? "Scrubbing Data..." : "Delete Account & Data"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}