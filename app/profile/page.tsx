"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type ToastType = "success" | "error" | "info";

// ---------- Helpers ----------
function safeParseArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeUrl(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function formatDate(d?: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  } catch {
    return d;
  }
}

export default function ProfilePage() {
  return (
    <ProtectedRoute role="developer">
      <ProfileInner />
    </ProtectedRoute>
  );
}

function ProfileInner() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("os_dark_mode") === "1";
  });
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadData();
    document.documentElement.style.background = dark ? "#0b1220" : "#f8fafc";
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [dark]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        profileData.skills = safeParseArray(profileData.skills);
        profileData.experience = safeParseArray(profileData.experience);
        profileData.education = safeParseArray(profileData.education);
        profileData.languages = safeParseArray(profileData.languages);
      }

      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setProfile(profileData);
      setProjects(submissionsData || []);

      await loadBadges(user.id);
    } catch (err) {
      console.error("loadData error:", err);
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBadges(userId: string) {
    const { data, error } = await supabase
      .from("user_badges")
      .select("badge:badges(*)")
      .eq("user_id", userId);

    if (!error && data) {
      const earned = data.map((item: any) => item.badge).filter(Boolean);
      setBadges(earned);
    }
  }

  function showToast(message: string, type: ToastType = "info", duration = 3000) {
    setToast({ message, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), duration);
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("os_dark_mode", next ? "1" : "0");
    showToast(next ? "Dark mode enabled" : "Light mode enabled", "info", 1400);
    document.documentElement.style.background = next ? "#0b1220" : "#f8fafc";
  }

  function profileCompletionDetails() {
    if (!profile) return { score: 0, total: 0, completed: [], missing: [] };
    const items = [
      { key: "full_name", label: "Full name", weight: 12, done: !!profile.full_name },
      { key: "headline_bio", label: "Headline / Bio", weight: 12, done: !!(profile.headline || profile.bio) },
      { key: "location", label: "Location", weight: 8, done: !!profile.location },
      { key: "phone", label: "Phone number", weight: 8, done: !!profile.phone },
      { key: "skills", label: "Skills", weight: 12, done: (profile.skills?.length || 0) >= 2 },
      { key: "languages", label: "Languages", weight: 8, done: (profile.languages?.length || 0) >= 1 },
      { key: "github", label: "GitHub", weight: 6, done: !!profile.github },
      { key: "linkedin", label: "LinkedIn", weight: 6, done: !!profile.linkedin },
      { key: "website", label: "Website/Portfolio", weight: 6, done: !!profile.website },
      { key: "intro_video", label: "Intro Video", weight: 10, done: !!profile.intro_video_url },
      { key: "experience", label: "Work experience", weight: 10, done: (profile.experience?.length || 0) > 0 },
      { key: "education", label: "Education", weight: 10, done: (profile.education?.length || 0) > 0 },
    ];
    let score = 0;
    const completed = items.filter(i => i.done);
    const missing = items.filter(i => !i.done);
    for (const item of items) if (item.done) score += item.weight;
    return { score: Math.min(100, score), total: 100, completed, missing };
  }

  function getCompletionMessage(score: number) {
    if (score === 100) return "🎉 Perfect profile! You're ready to impress recruiters.";
    if (score >= 80) return "🔥 Excellent profile! A few small tweaks and you'll be unstoppable.";
    if (score >= 60) return "📈 Good progress! Fill the missing sections to stand out.";
    if (score >= 40) return "🌱 Getting there! Add more details to increase your chances.";
    return "✨ Start building your profile – every section counts.";
  }

  const completion = profileCompletionDetails();
  const skillBadges = generateBadges();
  const hasPublicLinks = profile?.github || profile?.linkedin || profile?.website;

  function generateBadges() {
    if (!profile) return [];
    const badgesList: string[] = [];
    const skills = (profile?.skills || []).map((s: string) => String(s).toLowerCase());
    if (skills.includes("javascript") || skills.includes("js")) badgesList.push("🟨 JavaScript");
    if (skills.includes("react")) badgesList.push("⚛️ React");
    if (skills.includes("node") || skills.includes("node.js")) badgesList.push("🟩 Node.js");
    if (skills.includes("python")) badgesList.push("🐍 Python");
    if (projects.length >= 3) badgesList.push("🚀 Builder");
    if (projects.length >= 5) badgesList.push("🏆 Creator");
    if (profile.intro_video_url) badgesList.push("🎥 Video Intro");
    return badgesList;
  }

  async function shareProfile() {
    if (!profile?.username) {
      showToast("Set a username in Edit Profile to share", "error");
      return;
    }
    const url = `${window.location.origin}/profile/${profile.username}`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `${profile.full_name || "Profile"} — Profile`,
          text: "Check my professional profile",
          url,
        });
        showToast("Shared", "success");
      } catch (err) {
        console.error("native share error:", err);
        fallbackCopy(url);
      }
    } else {
      fallbackCopy(url);
    }
    incrementMetric("profile_clicks");
  }

  function fallbackCopy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => showToast("Profile link copied to clipboard", "success"),
      () => showToast("Copy failed — select & copy manually", "error")
    );
  }

  function downloadPdf() {
    if (!previewRef.current) {
      showToast("Nothing to download", "error");
      return;
    }
    const content = previewRef.current.innerHTML;
    const styles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; color: #0f172a; margin: 0; padding: 0; background: white; }
        .cv-wrapper { display: flex; min-height: 100vh; width: 100%; }
        .sidebar { width: 30%; background: #0f172a; color: white; padding: 40px 25px; }
        .main-content { width: 70%; padding: 40px; background: white; }
        .avatar { width: 100%; border-radius: 12px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.1); }
        .side-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; margin: 25px 0 10px; }
        .side-text { font-size: 13px; color: #cbd5e1; margin: 5px 0; word-break: break-all; }
        .pill-box { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .pill { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px; }
        .name { font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -1px; }
        .headline { font-size: 18px; color: #64748b; margin-top: 5px; font-weight: 500; }
        .line { width: 40px; height: 4px; background: #3b82f6; margin: 20px 0 35px; }
        .section-title { font-size: 13px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin: 35px 0 20px; }
        .item-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
        .item-title { font-size: 15px; font-weight: 700; }
        .item-date { font-size: 12px; font-weight: 700; color: #0f172a; }
        .item-desc { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
        th { text-align: left; background: #f8fafc; padding: 10px; font-size: 11px; color: #94a3b8; text-transform: uppercase; }
        td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; }
        .td-bold { font-weight: 700; color: #0f172a; width: 30%; }
        @media print { * { -webkit-print-color-adjust: exact; } }
      </style>
    `;
    const w = window.open("", "_blank", "width=1000,height=900");
    if (!w) {
      showToast("Popup blocked — allow popups to download", "error");
      return;
    }
    w.document.open();
    w.document.write(`
      <html>
        <head><title>${profile.full_name} — CV</title>${styles}</head>
        <body>${content}</body>
      </html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 800);
    incrementMetric("downloads");
  }

  async function incrementMetric(metric: "views" | "profile_clicks" | "downloads") {
    try {
      if (!profile?.id) return;
      const newVal = (profile[metric] || 0) + 1;
      const { error } = await supabase
        .from("users")
        .update({ [metric]: newVal })
        .eq("id", profile.id);
      if (!error) {
        setProfile((p: any) => ({ ...p, [metric]: newVal }));
      }
    } catch (err) {
      console.error("incrementMetric error:", err);
    }
  }

  async function generateWithAI(kind: "bio" | "headline") {
    setAiLoading(true);
    try {
      const payload = {
        kind,
        context: {
          skills: profile?.skills,
          headline: profile?.headline,
          bio: profile?.bio,
          full_name: profile?.full_name,
        },
      };
      let generated = null;
      try {
        const r = await fetch("/api/generate-bio", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "content-type": "application/json" },
        });
        if (r.ok) {
          const json = await r.json();
          generated = json.result;
        }
      } catch (err) {
        console.log("AI endpoint failed — fallback to local template", err);
      }

      if (!generated) {
        if (kind === "bio") {
          const skillsList = (profile?.skills || []).slice(0, 5).join(", ");
          generated = `${profile?.full_name || "Experienced professional"} with strong skills in ${skillsList}. Proven track record building real-world projects and solving practical challenges. Passionate about clean code, collaboration, and continuous learning.`;
        } else {
          generated = `${profile?.headline || "Software Developer"} • ${(profile?.skills?.[0]) || "Skilled in modern web"}`;
        }
      }

      await navigator.clipboard.writeText(generated);
      showToast(`${kind === "bio" ? "Bio" : "Headline"} generated — copied to clipboard`, "success", 2800);
    } catch (err) {
      console.error("AI generation error:", err);
      showToast("AI generation failed", "error");
    } finally {
      setAiLoading(false);
    }
  }

  function exportJSON() {
    if (!profile) return;
    const dataStr = JSON.stringify(profile, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.username || "profile"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Profile exported", "success");
    incrementMetric("profile_clicks");
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        Loading profile…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <p>{error || "Profile not found"}</p>
        <button
          onClick={() => router.push("/profile/edit")}
          style={styles.primaryBtn}
        >
          Create Profile
        </button>
      </div>
    );
  }

  const containerStyle = {
    maxWidth: 1120,
    margin: "0 auto",
    padding: 20,
    fontFamily:
      "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    background: dark ? "#0b1220" : "#f8fafc",
    minHeight: "100vh",
  };

  const cardStyle = {
    background: dark ? "#071022" : "white",
    borderRadius: 18,
    padding: 18,
    boxShadow: dark
      ? "0 8px 28px rgba(0,0,0,0.2)"
      : "0 10px 30px rgba(2,6,23,0.06)",
    transition: "background 0.2s ease",
  };

  const sectionTitle = {
    margin: "0 0 12px 0",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    color: dark ? "#e6eefb" : "#0f172a",
  };

  const bodyText = {
    color: dark ? "#cbd5e1" : "#475569",
    lineHeight: 1.75,
    margin: 0,
  };

  const mutedText = {
    color: dark ? "#9fb0c9" : "#64748b",
    margin: 0,
  };

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            ...styles.heroBanner,
            background: profile.cover_url
              ? `linear-gradient(180deg, rgba(15,23,42,0.10), rgba(15,23,42,0.72)), url(${profile.cover_url})`
              : dark
              ? "linear-gradient(135deg, #1e293b, #0f172a)"
              : "linear-gradient(135deg, #eef2ff, #f8fafc, #e0f2fe)",
          }}
        >
          <div style={styles.heroTopRow}>
            <div style={styles.logoWrap}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || "Avatar"} style={styles.logoImg} />
              ) : (
                <div style={styles.logoFallback}>
                  {(profile.full_name?.[0] || "U").toUpperCase()}
                </div>
              )}
            </div>
            {/* ADDED CLASS NAME: profile-hero-actions */}
            <div style={styles.heroActions} className="profile-hero-actions">
              <button onClick={shareProfile} style={styles.secondaryBtn}>
                Share Profile
              </button>
              <button
                onClick={() => router.push("/profile/edit")}
                style={styles.editBtn}
              >
                Edit Profile
              </button>
              <button onClick={downloadPdf} style={styles.secondaryBtn}>
                Download PDF
              </button>
              <button onClick={toggleDark} style={styles.secondaryBtn}>
                {dark ? "Light" : "Dark"}
              </button>
              <div style={{ width: 1, height: 32, background: "rgba(0,0,0,0.08)" }} />
              <button
                onClick={() => generateWithAI("headline")}
                disabled={aiLoading}
                style={styles.secondaryBtn}
              >
                {aiLoading ? "…" : "Gen Headline"}
              </button>
              <button
                onClick={() => generateWithAI("bio")}
                disabled={aiLoading}
                style={styles.secondaryBtn}
              >
                {aiLoading ? "…" : "Gen Bio"}
              </button>
              <button onClick={exportJSON} style={styles.secondaryBtn}>
                Export JSON
              </button>
            </div>
          </div>

          <div style={styles.heroContent}>
            <div style={styles.titleRow}>
              <h1 style={styles.companyNameStyle}>{profile.full_name || "Developer Profile"}</h1>
            </div>
            <div style={styles.metaRow}>
              {profile.profession && <span style={styles.metaBold}>{profile.profession}</span>}
              {profile.profession && <span style={styles.metaDot}>•</span>}
              <span style={styles.metaBold}>{profile.headline || "Professional profile"}</span>
              {profile.location && <span style={styles.metaDot}>•</span>}
              {profile.location && <span style={styles.metaBold}>{profile.location}</span>}
              {profile.phone && <span style={styles.metaDot}>•</span>}
              {profile.phone && <span style={styles.metaBold}>{profile.phone}</span>}
            </div>
            <p style={styles.subText}>{profile.bio || "No summary provided."}</p>
            <div style={styles.heroButtons}>
              <button onClick={() => router.push("/profile/edit")} style={styles.ghostBtn}>
                Edit Profile
              </button>
              <button onClick={shareProfile} style={styles.ghostBtn}>
                Share
              </button>
              <button onClick={downloadPdf} style={styles.ghostBtn}>
                PDF
              </button>
              <button onClick={() => generateWithAI("bio")} disabled={aiLoading} style={styles.ghostBtn}>
                {aiLoading ? "Generating…" : "AI Bio"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADDED CLASS NAME: profile-stats-grid */}
      <div style={styles.statsGrid} className="profile-stats-grid">
        <div style={statCard(dark)}>
          <div style={styles.statValue}>{profile.views || 0}</div>
          <div style={styles.statLabel}>Profile Views</div>
        </div>
        <div style={statCard(dark)}>
          <div style={styles.statValue}>{profile.profile_clicks || 0}</div>
          <div style={styles.statLabel}>Profile Shares</div>
        </div>
        <div style={statCard(dark)}>
          <div style={styles.statValue}>{profile.downloads || 0}</div>
          <div style={styles.statLabel}>PDF Downloads</div>
        </div>
        <div style={statCard(dark)}>
          <div style={styles.statValue}>{projects.length}</div>
          <div style={styles.statLabel}>Projects</div>
        </div>
      </div>

      {/* Profile Completion + Points + Badges (unchanged) */}
      <div style={{ ...cardStyle, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: dark ? "#9fb0c9" : "#64748b", marginBottom: 8 }}>
              Profile Strength
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#grad)"
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - completion.score / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 20, fontWeight: 800, color: dark ? "#fff" : "#0f172a" }}>
                  {completion.score}%
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: dark ? "#e6eefb" : "#0f172a" }}>
                  {getCompletionMessage(completion.score)}
                </div>
                <div style={{ fontSize: 13, color: dark ? "#9fb0c9" : "#64748b", marginTop: 4 }}>
                  {completion.completed.length} of {completion.completed.length + completion.missing.length} sections completed
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push("/profile/edit")}
            style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 40, padding: "8px 18px", fontWeight: 600, cursor: "pointer" }}
          >
            Complete Profile
          </button>
        </div>

        {completion.missing.length > 0 && (
          <div style={{ marginTop: 20, borderTop: `1px solid ${dark ? "#1e293b" : "#eef2f7"}`, paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: dark ? "#cbd5e1" : "#475569" }}>
              ✨ Add these to reach 100%:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {completion.missing.map((item) => (
                <div
                  key={item.key}
                  style={{
                    background: dark ? "#1e293b" : "#f8fafc",
                    borderRadius: 40,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: dark ? "#94a3b8" : "#64748b",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>➕</span> {item.label}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, borderTop: `1px solid ${dark ? "#1e293b" : "#eef2f7"}`, paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: dark ? "#cbd5e1" : "#475569" }}>🏆 Total Points</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: dark ? "#fff" : "#0f172a" }}>{profile.total_points || 0}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: dark ? "#cbd5e1" : "#475569", marginBottom: 8 }}>🏅 Badges Earned</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {badges.length === 0 && <span style={mutedText}>No badges yet – keep using the platform!</span>}
                {badges.map((badge) => (
                  <div key={badge.id} style={{ textAlign: "center", width: 80 }}>
                    <div style={{ fontSize: 32 }}>{badge.icon || "🏅"}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: dark ? "#cbd5e1" : "#334155", marginTop: 4 }}>{badge.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          {skillBadges.length ? skillBadges.map(b => (
            <span key={b} style={styles.badge}>{b}</span>
          )) : (
            <span style={mutedText}>Add skills and projects to unlock badges.</span>
          )}
        </div>
      </div>

      {/* Two column layout unchanged */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr", gap: 18, alignItems: "start" }}>
        {/* Left column unchanged */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={cardStyle}>
            <h2 style={sectionTitle}>About</h2>
            <p style={bodyText}>{profile.bio || "No summary provided."}</p>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Experience</h2>
            {!profile.experience?.length ? (
              <p style={mutedText}>No experiences added</p>
            ) : (
              profile.experience.map((e: any, idx: number) => (
                <div key={idx} style={{ marginBottom: 16, borderTop: idx > 0 ? "1px solid rgba(148,163,184,0.18)" : "none", paddingTop: idx > 0 ? 12 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <strong>{e.title}</strong> <span style={{ color: dark ? "#cbd5e1" : "#475569" }}>— {e.company}</span>
                  </div>
                  <div style={{ fontSize: 13, color: dark ? "#9fb0c9" : "#64748b", marginTop: 4 }}>
                    {formatDate(e.startDate)} — {e.endDate ? formatDate(e.endDate) : "Present"}
                  </div>
                  {e.description && <div style={{ marginTop: 8, color: dark ? "#cbd5e1" : "#475569" }}>{e.description}</div>}
                </div>
              ))
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Education</h2>
            {!profile.education?.length ? (
              <p style={mutedText}>No education listed</p>
            ) : (
              profile.education.map((ed: any, idx: number) => (
                <div key={idx} style={{ marginBottom: 16, borderTop: idx > 0 ? "1px solid rgba(148,163,184,0.18)" : "none", paddingTop: idx > 0 ? 12 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <strong>{ed.degree}</strong> <span style={{ color: dark ? "#cbd5e1" : "#475569" }}>— {ed.school}</span>
                  </div>
                  <div style={{ fontSize: 13, color: dark ? "#9fb0c9" : "#64748b", marginTop: 4 }}>
                    {formatDate(ed.startDate)} — {ed.endDate ? formatDate(ed.endDate) : ""}
                  </div>
                  {ed.description && <div style={{ marginTop: 8, color: dark ? "#cbd5e1" : "#475569" }}>{ed.description}</div>}
                </div>
              ))
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Projects ({projects.length})</h2>
            {!projects.length ? (
              <p style={mutedText}>No projects submitted</p>
            ) : (
              projects.map(p => (
                <div key={p.id} style={{ marginBottom: 16, borderTop: "1px solid rgba(148,163,184,0.18)", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <strong>{p.title}</strong>
                    <span style={{ fontSize: 13, color: dark ? "#9fb0c9" : "#64748b" }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: dark ? "#cbd5e1" : "#475569" }}>{p.description}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    {p.repo_url && <a href={normalizeUrl(p.repo_url)} target="_blank" rel="noreferrer" style={styles.linkBadge}>Code</a>}
                    {p.file_url && <a href={normalizeUrl(p.file_url)} target="_blank" rel="noreferrer" style={styles.linkBadge}>Live</a>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column unchanged */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Contact & Links</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><strong>Email:</strong> <span style={{ color: dark ? "#cbd5e1" : "#475569" }}>{profile.email || "—"}</span></div>
              <div><strong>Phone:</strong> <span style={{ color: dark ? "#cbd5e1" : "#475569" }}>{profile.phone || "—"}</span></div>
              {profile.intro_video_url && (
                <div>
                  <strong>Video Intro:</strong>{" "}
                  <a href={profile.intro_video_url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>Watch</a>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                {profile.github && <a href={normalizeUrl(profile.github)} target="_blank" rel="noreferrer" style={styles.linkBadge}>GitHub</a>}
                {profile.linkedin && <a href={normalizeUrl(profile.linkedin)} target="_blank" rel="noreferrer" style={styles.linkBadge}>LinkedIn</a>}
                {profile.website && <a href={normalizeUrl(profile.website)} target="_blank" rel="noreferrer" style={styles.linkBadge}>Portfolio</a>}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Skills</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(profile.skills || []).map((s: string, i: number) => (
                <span key={i} style={styles.skillTag}>{s}</span>
              ))}
            </div>
            {!hasPublicLinks && <p style={{ ...mutedText, marginTop: 12 }}>Add GitHub, LinkedIn, or portfolio links for a stronger profile.</p>}
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Languages</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(profile.languages || []).map((lang: string, i: number) => (
                <span key={i} style={styles.skillTag}>{lang}</span>
              ))}
            </div>
            {(!profile.languages || profile.languages.length === 0) && (
              <p style={mutedText}>No languages added.</p>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Quick Actions</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <button onClick={shareProfile} style={styles.actionBtn}>
                Copy Profile Link
              </button>
              <button onClick={() => router.push("/profile/edit")} style={styles.actionBtnSecondary}>
                Edit Profile
              </button>
              <button onClick={downloadPdf} style={styles.actionBtn}>
                Download PDF
              </button>
              <button onClick={exportJSON} style={styles.actionBtn}>
                Export JSON
              </button>
              <button 
                onClick={() => router.push(`/applications/${profile.id}`)} 
                style={styles.actionBtn}
              >
                Track Applications
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Hidden PDF preview unchanged */}
      <div style={{ display: "none" }}>
        <div ref={previewRef}>
          <div className="cv-wrapper">
            <div className="sidebar">
              <img className="avatar" src={profile.avatar_url || `https://ui-avatars.com/api/?background=334155&color=fff&name=${profile.full_name}`} />
              <div className="side-label">Contact</div>
              <div className="side-text">📧 {profile.email}</div>
              {profile.phone && <div className="side-text">📞 {profile.phone}</div>}
              {profile.location && <div className="side-text">📍 {profile.location}</div>}
              <div className="side-label">Digital</div>
              {profile.github && <div className="side-text">Git: {profile.github}</div>}
              {profile.linkedin && <div className="side-text">In: {profile.linkedin}</div>}
              <div className="side-label">Skills</div>
              <div className="pill-box">
                {profile.skills.map((s: string) => <span key={s} className="pill">{s}</span>)}
              </div>
              <div className="side-label">Languages</div>
              <div className="pill-box">
                {profile.languages.map((l: string) => <span key={l} className="pill">{l}</span>)}
              </div>
            </div>
            <div className="main-content">
              <h1 className="name">{profile.full_name}</h1>
              <h2 className="headline">{profile.headline || "Software Developer"}</h2>
              <div className="line" />
              <div className="section-title">Executive Summary</div>
              <p className="item-desc">{profile.bio}</p>
              <div className="section-title">Experience</div>
              {profile.experience?.map((exp: any, i: number) => (
                <div key={i}>
                  <div className="item-head">
                    <span className="item-title">{exp.title} — {exp.company}</span>
                    <span className="item-date">{exp.startDate} – {exp.endDate || "Present"}</span>
                  </div>
                  <p className="item-desc">{exp.description}</p>
                </div>
              ))}
              <div className="section-title">Education</div>
              {profile.education?.map((edu: any, i: number) => (
                <div key={i}>
                  <div className="item-head">
                    <span className="item-title">{edu.degree}</span>
                    <span className="item-date">{edu.startDate} – {edu.endDate || "N/A"}</span>
                  </div>
                  <div style={{fontSize: '13px', color: '#64748b', marginBottom: '4px'}}>{edu.school}</div>
                  <p className="item-desc">{edu.description}</p>
                </div>
              ))}
              <div className="section-title">Projects</div>
              <table>
                <thead>
                  <tr><th>Project</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id}>
                      <td className="td-bold">{p.title}</td>
                      <td>{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div style={styles.toast}>
          <div style={{ ...styles.toastInner, background: toast.type === "success" ? "#10b981" : toast.type === "error" ? "#ef4444" : "#2563eb" }}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Styles (unchanged) ----------
const styles = {
  heroBanner: {
    borderRadius: 20,
    overflow: "hidden" as const,
    minHeight: 340,
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 18px 45px rgba(2, 6, 23, 0.12)",
    padding: 22,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
  },
  heroTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  logoWrap: {
    width: 92,
    height: 92,
    borderRadius: 18,
    overflow: "hidden",
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
  },
  logoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  logoFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 34,
    fontWeight: 800,
    color: "#0f172a",
    background: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
  },
  heroActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
    justifyContent: "flex-end",
  },
  heroContent: {
    marginTop: 16,
    background: "rgba(255,255,255,0.80)",
    backdropFilter: "blur(8px)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 12px 30px rgba(255,255,255,0.10)",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap" as const,
  },
  companyNameStyle: {
    margin: 0,
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#0f172a",
  },
  metaRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    marginTop: 10,
    color: "#334155",
    fontSize: 14,
  },
  metaBold: {
    fontWeight: 800,
    color: "#0f172a",
  },
  metaDot: {
    color: "#94a3b8",
  },
  subText: {
    marginTop: 14,
    marginBottom: 0,
    color: "#334155",
    lineHeight: 1.75,
    maxWidth: 900,
  },
  heroButtons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
    marginTop: 16,
  },
  primaryBtn: {
    background: "#2563eb",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    background: "rgba(255,255,255,0.92)",
    color: "#0f172a",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    cursor: "pointer",
    fontWeight: 700,
  },
  editBtn: {
    background: "#0f172a",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.12)",
    cursor: "pointer",
    fontWeight: 700,
  },
  ghostBtn: {
    background: "rgba(255,255,255,0.82)",
    color: "#0f172a",
    padding: "10px 14px",
    borderRadius: 12,
    textDecoration: "none",
    border: "1px solid rgba(15,23,42,0.08)",
    cursor: "pointer",
    fontWeight: 700,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },
  statLabel: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748b",
  },
  badge: {
    background: "#eef2ff",
    color: "#3730a3",
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 13,
    fontWeight: 700,
  },
  linkBadge: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "8px 12px",
    borderRadius: 12,
    textDecoration: "none",
    color: "#0f172a",
    fontWeight: 700,
    fontSize: 13,
  },
  skillTag: {
    background: "#eef2ff",
    padding: "5px 10px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    color: "#3730a3",
  },
  actionBtn: {
    width: "100%",
    background: "#eef2ff",
    color: "#0f172a",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e0e7ff",
    cursor: "pointer",
    fontWeight: 700,
    textAlign: "center" as const,
  },
  actionBtnSecondary: {
    width: "100%",
    background: "#0f172a",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #0f172a",
    cursor: "pointer",
    fontWeight: 700,
    textAlign: "center" as const,
  },
  toast: {
    position: "fixed" as const,
    top: 18,
    right: 18,
    zIndex: 1400,
  },
  toastInner: {
    padding: "10px 14px",
    borderRadius: 12,
    color: "white",
    boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
    fontWeight: 700,
  },
};

function statCard(dark: boolean) {
  return {
    background: dark ? "#071022" : "white",
    borderRadius: 16,
    padding: 16,
    boxShadow: dark
      ? "0 8px 28px rgba(0,0,0,0.2)"
      : "0 10px 30px rgba(2,6,23,0.06)",
  };
}