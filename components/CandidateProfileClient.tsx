"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ExperienceItem = {
  title?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  customTitle?: string;
};

type EducationItem = {
  degree?: string;
  school?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  min_points: number | null;
};

type Project = {
  id: string;
  title: string;
  description: string;
  repo_url: string | null;
  file_url: string | null;
  upvotes_count: number;
  created_at: string;
};

type CandidateProfile = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  name: string | null;
  headline: string | null;
  location: string | null;
  role: string | null;
  avatar_url: string | null;
  profession: string | null;
  languages: string[] | null;
  intro_video_url: string | null;
  about: string | null;
  skills: string[] | null;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  experience: ExperienceItem[] | string | null;
  education: EducationItem[] | string | null;
  total_points: number | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

function normalizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function safeParseArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Get initials: first letter of first name + first letter of last name
function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function CandidateProfileClient({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    loadProfile();
  }, [candidateId]);

  async function loadProfile() {
    try {
      setLoading(true);

      // 1. Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, username, full_name, name, headline, location, role, avatar_url, profession, languages, intro_video_url, about, skills, website, github, linkedin, experience, education, total_points, created_at")
        .eq("id", candidateId)
        .maybeSingle();

      if (userError || !userData) {
        setNotFound(true);
        return;
      }

      setProfile({
        ...userData,
        languages: safeParseArray(userData.languages),
        skills: safeParseArray(userData.skills),
        experience: safeParseArray<ExperienceItem>(userData.experience),
        education: safeParseArray<EducationItem>(userData.education),
      } as CandidateProfile);

      // 2. Fetch applications (for history)
      const { data: appData } = await supabase
        .from("job_applications")
        .select("id, status, created_at, job_id")
        .eq("applicant_id", candidateId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (appData?.length) {
        const jobIds = appData.map((a: any) => a.job_id).filter(Boolean);
        const { data: jobData } = await supabase
          .from("jobs")
          .select("id, title")
          .in("id", jobIds);
        const jobMap = Object.fromEntries((jobData || []).map((j: any) => [j.id, j.title]));
        setApplications(appData.map((a: any) => ({
          id: a.id,
          job_title: jobMap[a.job_id] || "Unknown job",
          status: a.status,
          created_at: a.created_at,
        })));
      }

      // 3. Fetch badges earned
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", candidateId);
      const badgeIds = (userBadges || []).map(ub => ub.badge_id);
      if (badgeIds.length) {
        const { data: badgesData } = await supabase
          .from("badges")
          .select("*")
          .in("id", badgeIds);
        setBadges(badgesData || []);
      }

      // 4. Fetch leaderboard rank
      if (userData.total_points !== undefined && userData.total_points !== null) {
        const { count } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .gt("total_points", userData.total_points);
        setRank((count || 0) + 1);
      }

      // 5. Fetch projects (submissions)
      const { data: projectsData } = await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", candidateId)
        .order("created_at", { ascending: false });
      setProjects(projectsData || []);
    } catch (err) {
      console.error("Profile load error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  const displayName = profile?.full_name || profile?.name || "Candidate";
  const initials = getInitials(displayName);

  if (loading) {
    return (
      <div style={shell}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={loadBox}>
          <div style={spinner} />
          <p style={{ margin: "14px 0 0", color: "#64748b", fontWeight: 700 }}>Loading professional profile…</p>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={shell}>
        <div style={loadBox}>
          <p style={{ fontSize: 40 }}>🔍</p>
          <h2 style={{ margin: "8px 0 4px", color: "#0f172a" }}>Profile not found</h2>
          <p style={{ color: "#64748b", margin: "0 0 20px" }}>This candidate's account may have been removed or doesn't exist.</p>
          <button style={backBtn} onClick={() => router.back()}>← Go back</button>
        </div>
      </div>
    );
  }

  // Helper renderers
  const renderExperience = () => {
    const exp = profile.experience;
    if (!exp) return null;
    if (typeof exp === "string") return <p style={bodyProse}>{exp}</p>;
    if (Array.isArray(exp) && exp.length) {
      return (
        <div style={timeline}>
          {exp.map((item, idx) => (
            <div key={idx} style={timeItem}>
              <div style={itemHead}>
                <strong style={itemTitle}>{item.title || item.customTitle || "Experience"} – {item.company || ""}</strong>
                <span style={itemDate}>{item.startDate || ""} {item.startDate && item.endDate ? "–" : ""} {item.endDate || "Present"}</span>
              </div>
              {item.description && <p style={itemDesc}>{item.description}</p>}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderEducation = () => {
    const edu = profile.education;
    if (!edu) return null;
    if (typeof edu === "string") return <p style={bodyProse}>{edu}</p>;
    if (Array.isArray(edu) && edu.length) {
      return (
        <div style={timeline}>
          {edu.map((item, idx) => (
            <div key={idx} style={timeItem}>
              <div style={itemHead}>
                <strong style={itemTitle}>{item.degree || "Degree"}</strong>
                <span style={itemDate}>{item.startDate || ""} {item.startDate && item.endDate ? "–" : ""} {item.endDate || ""}</span>
              </div>
              <div style={itemSubTitle}>{item.school || ""}</div>
              {item.description && <p style={itemDesc}>{item.description}</p>}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const visibleBadges = showAllBadges ? badges : badges.slice(0, 3);
  const remainingBadges = badges.length - 3;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        html, body { overflow-x: hidden !important; }
        * { box-sizing: border-box; }

        @media (max-width: 768px) {
          .cv-layout { grid-template-columns: 1fr !important; }
          .cv-banner { height: 100px !important; }
          .cv-avatar { width: 88px !important; height: 88px !important; font-size: 30px !important; bottom: -36px !important; }
          .cv-identity { padding: 50px 16px 18px !important; flex-direction: column !important; gap: 12px !important; }
          .cv-name { font-size: 22px !important; }
          .cv-chips { gap: 6px !important; }
          .cv-chip { font-size: 11px !important; padding: 4px 8px !important; }
          .cv-section { padding: 14px 16px !important; }
          .cv-main { padding: 0 !important; }
          .cv-sidebar { padding: 0 !important; }
          .cv-action-bar { flex-direction: column !important; gap: 8px !important; padding: 14px 16px !important; }
          .cv-action-bar button, .cv-action-bar a { width: 100% !important; text-align: center !important; justify-content: center !important; }
          .badge-grid { justify-content: center !important; }
          .project-card { padding: 12px !important; }
        }
      `}</style>

      <div style={shell}>
        <div style={page}>
          <button style={backBtn} onClick={() => router.back()}>← Back to Dashboard</button>

          <div style={cvCard}>
            {/* Banner with avatar ring (initials only) */}
            <div style={banner} className="cv-banner">
              <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <div style={avatarRing} className="cv-avatar">
                <span style={avatarInitials}>{initials}</span>
              </div>
            </div>

            {/* Identity + action row */}
            <div style={identityRow} className="cv-identity">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h1 style={cvName}>{displayName}</h1>
                  {profile.username && <span style={usernameBadge}>@{profile.username}</span>}
                </div>
                {profile.headline && <p style={headlineText}>{profile.headline}</p>}
                {profile.profession && <p style={professionText}>{profile.profession}</p>}
                <div style={chipRow} className="cv-chips">
                  {profile.location && <span style={infoChip}>📍 {profile.location}</span>}
                  {profile.role && <span style={roleChip}>🔖 {profile.role}</span>}
                  {profile.email && <span style={infoChip}>✉️ {profile.email}</span>}
                  {profile.created_at && <span style={infoChip}>📅 Joined {formatDate(profile.created_at)}</span>}
                  {profile.total_points !== undefined && profile.total_points !== null && (
                    <span style={infoChip}>🏆 {profile.total_points} pts</span>
                  )}
                  {rank && <span style={infoChip}>🎖️ Rank #{rank}</span>}
                </div>
              </div>
              {profile.intro_video_url && (
                <a href={normalizeUrl(profile.intro_video_url)} target="_blank" rel="noreferrer" style={videoBadge}>🎥 Video Intro</a>
              )}
            </div>

            {/* Action Buttons Bar */}
            <div style={actionBar} className="cv-action-bar">
              {profile.email && (
                <button style={actionBtnPrimary} onClick={() => {
                  const win = window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email!)}`, "_blank");
                  if (!win) window.location.href = `mailto:${profile.email}`;
                }}>✉️ Send Email</button>
              )}
              {profile.website && <a href={normalizeUrl(profile.website)} target="_blank" rel="noreferrer" style={actionBtnSecondary}>🌐 Website</a>}
              {profile.linkedin && <a href={normalizeUrl(profile.linkedin)} target="_blank" rel="noreferrer" style={actionBtnLinkedIn}>🔗 LinkedIn</a>}
              {profile.github && <a href={normalizeUrl(profile.github)} target="_blank" rel="noreferrer" style={actionBtnGithub}>💻 GitHub</a>}
              {profile.intro_video_url && <a href={normalizeUrl(profile.intro_video_url)} target="_blank" rel="noreferrer" style={actionBtnVideo}>🎥 Watch Intro</a>}
            </div>

            <div style={{ height: 1, background: "#f1f5f9" }} />

            {/* Two-column CV body */}
            <div style={bodyLayout} className="cv-layout">
              {/* LEFT COLUMN */}
              <div style={mainCol} className="cv-main">
                {profile.about && (
                  <CVSection icon="👤" title="About / Summary">
                    <p style={bodyProse}>{profile.about}</p>
                  </CVSection>
                )}

                {renderExperience() && (
                  <CVSection icon="💼" title="Work Experience">
                    {renderExperience()}
                  </CVSection>
                )}

                {renderEducation() && (
                  <CVSection icon="🎓" title="Education">
                    {renderEducation()}
                  </CVSection>
                )}

                {projects.length > 0 && (
                  <CVSection icon="🚀" title="Projects Portfolio">
                    <div style={{ display: "grid", gap: 14 }}>
                      {projects.map(proj => (
                        <div key={proj.id} style={projectCard}>
                          <h4 style={projectTitle}>{proj.title}</h4>
                          <p style={projectDesc}>{proj.description}</p>
                          <div style={projectLinks}>
                            {proj.repo_url && (
                              <a href={normalizeUrl(proj.repo_url)} target="_blank" rel="noreferrer" style={projectLink}>🔗 View Project / Code</a>
                            )}
                            {proj.file_url && (
                              <a href={normalizeUrl(proj.file_url)} target="_blank" rel="noreferrer" style={projectLink}>📂 Download / Demo</a>
                            )}
                          </div>
                          <div style={projectMeta}>
                            <span>👍 {proj.upvotes_count || 0} upvotes</span>
                            <span>📅 {formatDate(proj.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CVSection>
                )}

                {applications.length > 0 && (
                  <CVSection icon="📋" title="Recent Applications">
                    <div style={{ display: "grid", gap: 10 }}>
                      {applications.map(app => (
                        <div key={app.id} style={appHistoryCard}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 800, color: "#0f172a", fontSize: 14 }}>{app.job_title}</p>
                            <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>Applied {formatDate(app.created_at)}</p>
                          </div>
                          <span style={appStatusBadge(app.status)}>{app.status || "submitted"}</span>
                        </div>
                      ))}
                    </div>
                  </CVSection>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div style={sideCol} className="cv-sidebar">
                {profile.skills && profile.skills.length > 0 && (
                  <SideSection icon="⚡" title="Core Skills">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {profile.skills.map(s => <span key={s} style={skillPill}>{s}</span>)}
                    </div>
                  </SideSection>
                )}

                {profile.languages && profile.languages.length > 0 && (
                  <SideSection icon="🌐" title="Languages">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {profile.languages.map(l => <span key={l} style={langPill}>{l}</span>)}
                    </div>
                  </SideSection>
                )}

                {badges.length > 0 && (
                  <SideSection icon="🏅" title="Badges Earned">
                    <div style={badgeGrid} className="badge-grid">
                      {visibleBadges.map(badge => (
                        <div key={badge.id} style={badgeItem}>
                          <span style={badgeIcon}>{badge.icon || "🏆"}</span>
                          <span style={badgeName}>{badge.name}</span>
                        </div>
                      ))}
                    </div>
                    {remainingBadges > 0 && (
                      <button onClick={() => setShowAllBadges(!showAllBadges)} style={showMoreBtn}>
                        {showAllBadges ? "Show less" : `+ ${remainingBadges} more badges`}
                      </button>
                    )}
                  </SideSection>
                )}

                <SideSection icon="📊" title="Quick Facts">
                  <div style={{ display: "grid", gap: 0 }}>
                    <FactRow label="Role" value={profile.role || "Not specified"} />
                    <FactRow label="Profession" value={profile.profession || "Not specified"} />
                    <FactRow label="Location" value={profile.location || "Not specified"} />
                    <FactRow label="Joined" value={formatDate(profile.created_at)} />
                    <FactRow label="Applications" value={String(applications.length)} />
                    {rank && <FactRow label="Leaderboard Rank" value={`#${rank}`} />}
                  </div>
                </SideSection>

                {(profile.website || profile.linkedin || profile.github) && (
                  <SideSection icon="🔗" title="Online Presence">
                    <div style={{ display: "grid", gap: 8 }}>
                      {profile.website && <LinkRow href={profile.website} icon="🌐" label="Website" />}
                      {profile.linkedin && <LinkRow href={profile.linkedin} icon="🔗" label="LinkedIn" />}
                      {profile.github && <LinkRow href={profile.github} icon="💻" label="GitHub" />}
                    </div>
                  </SideSection>
                )}

                <div style={trustNote}>
                  <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
                    <strong style={{ color: "#0f172a" }}>✅ OfSkillJob verified profile</strong><br />
                    Skill‑first hiring. Review task submissions and Drive folders for proof of capability.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer with logo */}
            <div style={footer}>
              <div style={footerInner}>
                <img src="/favicon.png" alt="OfSkillJob" style={footerLogo} />
                <span style={footerText}>Powered by OfSkillJob — Show Skills. Get Hired.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Reusable Sub‑components ──────────────────────────────────────────────────

function CVSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={cvSection} className="cv-section">
      <div style={sectionHeading}>
        <span style={sectionIcon}>{icon}</span>
        <h2 style={sectionTitle}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SideSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={sideSectionBox}>
      <div style={sectionHeading}>
        <span style={sectionIcon}>{icon}</span>
        <h3 style={sideSectionTitle}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={factRow}>
      <span style={factLabel}>{label}</span>
      <span style={factValue}>{value}</span>
    </div>
  );
}

function LinkRow({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={normalizeUrl(href)} target="_blank" rel="noreferrer" style={linkRow}>
      <span style={linkIcon}>{icon}</span>
      <span style={linkText}>{label}</span>
      <span style={linkArrow}>→</span>
    </a>
  );
}

function appStatusBadge(status: string | null): CSSProperties {
  const base: CSSProperties = { padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 };
  if (status === "shortlisted") return { ...base, background: "#dcfce7", color: "#166534" };
  if (status === "reviewed") return { ...base, background: "#dbeafe", color: "#1d4ed8" };
  if (status === "rejected") return { ...base, background: "#fee2e2", color: "#991b1b" };
  return { ...base, background: "#fef3c7", color: "#92400e" };
}

// ─── Styles (Professional CV) ─────────────────────────────────────────────────
const shell: CSSProperties = { minHeight: "100vh", background: "#f1f5f9", padding: "24px 16px 48px", fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", overflowX: "hidden" };
const page: CSSProperties = { maxWidth: 1000, margin: "0 auto" };
const loadBox: CSSProperties = { maxWidth: 480, margin: "80px auto 0", background: "white", borderRadius: 24, padding: "48px 32px", textAlign: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.08)" };
const spinner: CSSProperties = { width: 38, height: 38, borderRadius: "50%", border: "4px solid #e2e8f0", borderTopColor: "#2563eb", margin: "0 auto", animation: "spin 0.8s linear infinite" };
const backBtn: CSSProperties = { background: "white", border: "1px solid #e2e8f0", color: "#0f172a", padding: "8px 16px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14, marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" };
const cvCard: CSSProperties = { background: "white", borderRadius: 28, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.12)", border: "1px solid #eef2f7" };
const banner: CSSProperties = { height: 130, background: "linear-gradient(135deg, #0f172a 0%, #1e40af 55%, #3b82f6 100%)", position: "relative", overflow: "visible" };
const avatarRing: CSSProperties = { width: 110, height: 110, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #1e40af)", border: "4px solid white", display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", bottom: -44, left: 28, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" };
const avatarInitials: CSSProperties = { fontSize: 36, fontWeight: 900, color: "white", letterSpacing: "1px" };
const identityRow: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 20, padding: "58px 28px 20px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" };
const cvName: CSSProperties = { margin: 0, fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" };
const usernameBadge: CSSProperties = { background: "#eef2ff", color: "#1e40af", border: "1px solid #c7d2fe", padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 };
const headlineText: CSSProperties = { margin: "6px 0 0", color: "#2563eb", fontSize: 16, fontWeight: 700 };
const professionText: CSSProperties = { margin: "4px 0 0", color: "#475569", fontSize: 15, fontWeight: 500 };
const chipRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 };
const infoChip: CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 };
const roleChip: CSSProperties = { background: "#eef2ff", border: "1px solid #c7d2fe", color: "#1e40af", padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 };
const videoBadge: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "white", padding: "8px 16px", borderRadius: 40, fontWeight: 800, fontSize: 14, textDecoration: "none", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" };
const actionBar: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", padding: "16px 28px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" };
const actionBtnPrimary: CSSProperties = { background: "#2563eb", color: "white", border: "none", padding: "10px 18px", borderRadius: 40, cursor: "pointer", fontWeight: 700, fontSize: 14 };
const actionBtnSecondary: CSSProperties = { background: "white", color: "#0f172a", border: "1px solid #e2e8f0", padding: "10px 18px", borderRadius: 40, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center" };
const actionBtnLinkedIn: CSSProperties = { ...actionBtnSecondary, background: "#0a66c2", color: "white", border: "none" };
const actionBtnGithub: CSSProperties = { ...actionBtnSecondary, background: "#0f172a", color: "white", border: "none" };
const actionBtnVideo: CSSProperties = { ...actionBtnSecondary, background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "white", border: "none" };
const bodyLayout: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 320px", gap: 0 };
const mainCol: CSSProperties = { padding: "0", borderRight: "1px solid #f1f5f9" };
const sideCol: CSSProperties = { padding: "0", background: "#fafbfc" };
const cvSection: CSSProperties = { padding: "22px 28px", borderBottom: "1px solid #f1f5f9" };
const sectionHeading: CSSProperties = { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 };
const sectionIcon: CSSProperties = { fontSize: 20, flexShrink: 0 };
const sectionTitle: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" };
const bodyProse: CSSProperties = { margin: 0, color: "#334155", lineHeight: 1.7, fontSize: 15 };
const timeline: CSSProperties = { display: "flex", flexDirection: "column", gap: 20 };
const timeItem: CSSProperties = { marginBottom: 0 };
const itemHead: CSSProperties = { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 };
const itemTitle: CSSProperties = { fontSize: 16, fontWeight: 800, color: "#0f172a" };
const itemDate: CSSProperties = { fontSize: 13, fontWeight: 600, color: "#64748b" };
const itemSubTitle: CSSProperties = { color: "#475569", fontWeight: 600, fontSize: 14, marginTop: 2 };
const itemDesc: CSSProperties = { fontSize: 14, color: "#475569", marginTop: 6, lineHeight: 1.6 };
const projectCard: CSSProperties = { background: "#f8fafc", borderRadius: 16, padding: 16, border: "1px solid #e2e8f0" };
const projectTitle: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" };
const projectDesc: CSSProperties = { margin: "6px 0 8px", color: "#475569", fontSize: 14, lineHeight: 1.6 };
const projectLinks: CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 };
const projectLink: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#2563eb", textDecoration: "none" };
const projectMeta: CSSProperties = { display: "flex", gap: 12, marginTop: 10, fontSize: 12, color: "#64748b" };
const sideSectionBox: CSSProperties = { padding: "20px 22px", borderBottom: "1px solid #f1f5f9" };
const sideSectionTitle: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" };
const skillPill: CSSProperties = { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 };
const langPill: CSSProperties = { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 };
const badgeGrid: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 };
const badgeItem: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "#f8fafc", padding: "8px 12px", borderRadius: 12, border: "1px solid #e2e8f0", minWidth: 70 };
const badgeIcon: CSSProperties = { fontSize: 24 };
const badgeName: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#0f172a", textAlign: "center" };
const showMoreBtn: CSSProperties = { background: "transparent", border: "1px solid #cbd5e1", borderRadius: 40, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 6, width: "100%" };
const factRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid #f1f5f9" };
const factLabel: CSSProperties = { color: "#64748b", fontWeight: 700, fontSize: 13 };
const factValue: CSSProperties = { color: "#0f172a", fontWeight: 700, fontSize: 13, textAlign: "right" };
const linkRow: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "white", border: "1px solid #e2e8f0", borderRadius: 12, textDecoration: "none" };
const linkIcon: CSSProperties = { fontSize: 16 };
const linkText: CSSProperties = { flex: 1, color: "#0f172a", fontWeight: 700, fontSize: 14 };
const linkArrow: CSSProperties = { color: "#94a3b8", fontWeight: 700 };
const trustNote: CSSProperties = { margin: "16px 16px 20px", padding: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14 };
const footer: CSSProperties = { borderTop: "1px solid #f1f5f9", padding: "16px 28px", background: "white" };
const footerInner: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" };
const footerLogo: CSSProperties = { width: 28, height: 28, objectFit: "contain" };
const footerText: CSSProperties = { fontSize: 13, color: "#64748b", fontWeight: 500 };
const appHistoryCard: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e8eef5", borderRadius: 14 };