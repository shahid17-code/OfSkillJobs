"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

// --- Helpers from your codebase ---
function safeParseArray(value: any): any[] {
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

function formatDate(d?: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  } catch { return d; }
}

export default function CandidateProfileView() {
  return (
    <ProtectedRoute role="company">
      <CandidateInner />
    </ProtectedRoute>
  );
}

function CandidateInner() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCandidate() {
      if (!id) return;
      setLoading(true);

      const { data: userProfile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (userProfile) {
        userProfile.skills = safeParseArray(userProfile.skills);
        userProfile.experience = safeParseArray(userProfile.experience);
        userProfile.education = safeParseArray(userProfile.education);

        const { data: subs } = await supabase
          .from("submissions")
          .select("*")
          .eq("user_id", userProfile.id);
        
        setProfile(userProfile);
        setProjects(subs || []);
      }
      setLoading(false);
    }
    loadCandidate();
  }, [id]);

  if (loading) return <div style={{ padding: 60, textAlign: "center" }}>Loading Candidate...</div>;
  if (!profile) return <div style={{ padding: 60, textAlign: "center" }}>Candidate not found.</div>;

  const badges = () => {
    const b: string[] = [];
    const skills = (profile.skills || []).map((s: string) => s.toLowerCase());
    if (skills.includes("react")) b.push("⚛️ React Dev");
    if (skills.includes("javascript")) b.push("🟨 JS Dev");
    if (projects.length >= 3) b.push("🚀 Builder");
    return b;
  };

  return (
    <div style={styles.container}>
      <button onClick={() => router.back()} style={styles.backBtn}>← Back to Dashboard</button>

      {/* RESUME HEADER */}
      <div style={styles.resumeHeader}>
        <img src={profile.avatar_url || "https://via.placeholder.com/120"} style={styles.avatar} alt="avatar" />
        <div style={{ flex: 1 }}>
          <h1 style={styles.name}>{profile.full_name || profile.username}</h1>
          <p style={styles.headline}>{profile.headline || "Software Developer"}</p>
          <div style={styles.contactBar}>
            <span>📧 {profile.email}</span>
            {profile.phone && <span>📞 {profile.phone}</span>}
            {profile.location && <span>📍 {profile.location}</span>}
          </div>
          <div style={styles.badgeRow}>
            {badges().map(b => <span key={b} style={styles.badge}>{b}</span>)}
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* MAIN BODY */}
        <div style={styles.leftCol}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Professional Summary</h3>
            <p style={styles.text}>{profile.bio || "No summary provided."}</p>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Experience</h3>
            {profile.experience?.length ? profile.experience.map((exp: any, i: number) => (
              <div key={i} style={styles.entry}>
                <div style={styles.entryHeader}>
                  <strong>{exp.title}</strong>
                  <span>{formatDate(exp.startDate)} — {exp.endDate ? formatDate(exp.endDate) : "Present"}</span>
                </div>
                <div style={styles.subLabel}>{exp.company}</div>
                <p style={styles.entryText}>{exp.description}</p>
              </div>
            )) : <p style={styles.muted}>No experience listed.</p>}
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Built Projects</h3>
            {projects.map(p => (
              <div key={p.id} style={styles.projectCard}>
                <strong>{p.title}</strong>
                <p style={styles.entryText}>{p.description}</p>
                <div style={styles.linkRow}>
                  {p.repo_url && <a href={p.repo_url} style={styles.link}>Code</a>}
                  {p.file_url && <a href={p.file_url} style={styles.link}>Live Demo</a>}
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* SIDEBAR */}
        <div style={styles.rightCol}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Skills</h3>
            <div style={styles.skillCloud}>
              {profile.skills.map((s: string) => <span key={s} style={styles.skillTag}>{s}</span>)}
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Education</h3>
            {profile.education?.map((edu: any, i: number) => (
              <div key={i} style={{ marginBottom: 15 }}>
                <div style={{ fontWeight: 700 }}>{edu.degree}</div>
                <div style={styles.subLabel}>{edu.school}</div>
                <div style={{ fontSize: 12 }}>{formatDate(edu.startDate)} — {formatDate(edu.endDate)}</div>
              </div>
            ))}
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Online Presence</h3>
            <div style={styles.socialList}>
              {profile.github && <a href={profile.github}>GitHub Profile</a>}
              {profile.linkedin && <a href={profile.linkedin}>LinkedIn Profile</a>}
              {profile.website && <a href={profile.website}>Portfolio Website</a>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// --- Styles specifically for a Read-Only CV ---
const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1000, margin: "20px auto", padding: 20, fontFamily: "Inter, sans-serif" },
  backBtn: { padding: "8px 16px", marginBottom: 20, cursor: "pointer", border: "1px solid #ddd", borderRadius: 8, background: "#fff" },
  resumeHeader: { display: "flex", gap: 30, alignItems: "center", borderBottom: "2px solid #000", paddingBottom: 30, marginBottom: 30 },
  avatar: { width: 140, height: 140, borderRadius: 12, objectFit: "cover" },
  name: { fontSize: 36, margin: 0, fontWeight: 800 },
  headline: { fontSize: 20, color: "#475569", margin: "5px 0" },
  contactBar: { display: "flex", gap: 15, fontSize: 14, color: "#64748b", marginTop: 10 },
  badgeRow: { display: "flex", gap: 8, marginTop: 15 },
  badge: { background: "#000", color: "#fff", padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 40 },
  sectionTitle: { fontSize: 16, textTransform: "uppercase", letterSpacing: 1.5, borderBottom: "1px solid #eee", paddingBottom: 8, marginBottom: 15 },
  section: { marginBottom: 35 },
  text: { lineHeight: 1.6, color: "#334155" },
  entry: { marginBottom: 20 },
  entryHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  subLabel: { color: "#2563eb", fontWeight: 600, fontSize: 14 },
  entryText: { fontSize: 14, color: "#475569", marginTop: 5 },
  projectCard: { padding: 12, background: "#f8fafc", borderRadius: 8, marginBottom: 10 },
  linkRow: { display: "flex", gap: 15, marginTop: 8 },
  link: { fontSize: 13, color: "#2563eb", fontWeight: 600 },
  skillCloud: { display: "flex", gap: 8, flexWrap: "wrap" },
  skillTag: { background: "#eee", padding: "4px 8px", borderRadius: 4, fontSize: 13 },
  socialList: { display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "#2563eb" },
  muted: { color: "#94a3b8", fontSize: 14 }
};