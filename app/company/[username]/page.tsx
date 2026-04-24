"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ToastType = "success" | "error" | "info";

type SocialLink = {
  label: string;
  href: string;
};

type Viewer = {
  id: string;
  role?: string | null;
  username?: string | null;
};

type CompanyProfile = {
  id: string;
  username?: string | null;
  company_name?: string | null;
  role?: string | null;
  industry?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  about?: string | null;
  company_size?: string | null;
  founded_date?: string | null;
  website?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  specialties?: string[] | string | null;
  is_verified?: boolean | null;
  is_hiring?: boolean | null;
  hiring_preferences?: string | null;
  [key: string]: any;
};

const RESERVED_SLUGS = new Set([
  "profile",
  "me",
  "self",
  "dashboard",
  "home",
  "settings",
]);

export default function CompanyPublicProfile() {
  const router = useRouter();
  const params = useParams();

  const rawSlug =
    typeof params?.username === "string"
      ? params.username
      : Array.isArray(params?.username)
      ? params.username[0]
      : "";

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null
  );
  const toastTimer = useRef<number | null>(null);

  // State for "Read more" on company bio
  const [bioExpanded, setBioExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadProfile();

    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [rawSlug]);

  function showToast(
    message: string,
    type: ToastType = "info",
    duration = 2800
  ) {
    setToast({ message, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), duration);
  }

  function normalizeArray(value: any): string[] {
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === "string") {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }

  async function resolveCanonicalCompanySlug() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("users")
      .select("username, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to resolve company slug:", error);
      return null;
    }

    if (!data || data.role !== "company" || !data.username) {
      return null;
    }

    return data.username as string;
  }

  async function loadProfile() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setViewer(
        user
          ? {
              id: user.id,
              username: user.email ?? null,
            }
          : null
      );

      const slug = (rawSlug || "").trim().toLowerCase();

      if (!slug || RESERVED_SLUGS.has(slug)) {
        const canonicalSlug = await resolveCanonicalCompanySlug();
        if (canonicalSlug) {
          router.replace(`/company/${canonicalSlug}`);
          return;
        }
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("username", slug)
        .eq("role", "company")
        .maybeSingle();

      if (error || !data) {
        setProfile(null);
        return;
      }

      setProfile({
        ...data,
        specialties: normalizeArray(data.specialties),
        is_hiring: data.is_hiring === true || data.is_hiring === 'true' || data.is_hiring === 1
      });
    } catch (err) {
      console.error("Unexpected error loading company profile:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!profile) return;
    const shareData = {
      title: profile.company_name || "Company Profile",
      text: `Check out ${profile.company_name} on OfSkillJobs!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Link copied to clipboard", "success");
      }
    } catch (err) {
      console.log("Share failed", err);
    }
  }

  const isOwner =
    !!viewer?.id && !!profile?.id && viewer.id === profile.id && profile.role === "company";

  const socialLinks = [
    profile?.website && { label: "Website", href: profile.website },
    profile?.linkedin && { label: "LinkedIn", href: profile.linkedin },
    profile?.twitter && { label: "Twitter", href: profile.twitter },
    profile?.facebook && { label: "Facebook", href: profile.facebook },
    profile?.instagram && { label: "Instagram", href: profile.instagram },
  ].filter(Boolean) as SocialLink[];

  const companyName = profile?.company_name || "Company Name";
  const specialties = Array.isArray(profile?.specialties)
    ? profile.specialties
    : normalizeArray(profile?.specialties);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center" }}>Loading company profile...</div>;
  }

  if (!profile) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <h2 style={{ marginBottom: 8 }}>Company not found</h2>
        <p style={{ color: "#64748b" }}>This profile may not exist or is not public yet.</p>
        <button onClick={() => router.push("/jobs")} style={{marginTop: 20, cursor: 'pointer'}}>Back to Jobs</button>
      </div>
    );
  }

  const isCurrentlyHiring = profile.is_hiring === true;

  // Helper for bio truncation
  const fullBio = profile.about || "This company profile has not been completed yet.";
  const getBioDisplay = () => {
    if (!isMobile) return fullBio;
    if (bioExpanded) return fullBio;
    if (fullBio.length <= 100) return fullBio;
    return fullBio.slice(0, 100) + "...";
  };
  const showReadMore = isMobile && fullBio.length > 100;

  return (
    <div style={container}>
      <div style={heroWrap}>
        <div
          style={{
            ...heroBanner,
            background: "linear-gradient(135deg, #eef2ff, #f8fafc, #e0f2fe)",
          }}
        >
          <div style={heroTopRow}>
            <div style={logoWrap}>
              {profile.logo_url ? (
                <img src={profile.logo_url} alt={companyName} style={logoImg} />
              ) : (
                <div style={logoFallback}>{companyName.charAt(0).toUpperCase()}</div>
              )}
            </div>

            <div style={heroActions} className="hero-actions">
              <button onClick={handleShare} style={secondaryBtn}>Share Profile</button>
              {isOwner && (
                <button onClick={() => router.push("/company/profile/edit")} style={editBtn}>
                  Edit Profile
                </button>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" style={primaryBtn}>
                  Visit Website
                </a>
              )}
            </div>
          </div>

          <div style={heroContent}>
            <div style={titleRow}>
              <h1 style={companyNameStyle}>{companyName}</h1>
              {profile.is_verified && <span style={verifiedBadge}>Verified</span>}
              {isCurrentlyHiring && <span style={hiringBadge}>Hiring Now</span>}
            </div>

            <div style={metaRow}>
              <span style={metaBold}>{profile.industry || "Industry not set"}</span>
              <span style={metaDot}>•</span>
              <span style={metaBold}>{profile.location || "Location not set"}</span>
              <span style={metaDot}>•</span>
              <span style={metaBold}>{profile.phone || "Phone not added"}</span>
            </div>

            {/* Bio with Read more toggle */}
            <div>
              <p style={subText}>{getBioDisplay()}</p>
              {showReadMore && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 6,
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  {bioExpanded ? "Read less" : "Read more"}
                </button>
              )}
            </div>

            <div style={heroButtons} className="contact-copy-row">
              {profile.email && <a href={`mailto:${profile.email}`} style={ghostBtn}>Contact</a>}
              <button onClick={handleShare} style={ghostBtn}>Copy Link</button>
            </div>
          </div>
        </div>
      </div>

      <div style={statsGrid}>
        <div style={statCard}>
          <div style={statValue}>{profile.industry || "—"}</div>
          <div style={statLabel}>Industry</div>
        </div>
        <div style={statCard}>
          <div style={statValue}>{profile.company_size || "—"}</div>
          <div style={statLabel}>Company Size</div>
        </div>
        <div style={statCard}>
          <div style={statValue}>{profile.founded_date || "—"}</div>
          <div style={statLabel}>Founded</div>
        </div>
        <div style={statCard}>
          <div style={statValue}>{socialLinks.length}</div>
          <div style={statLabel}>Social Links</div>
        </div>
      </div>

      <div style={mainGrid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section style={card}>
            <SectionHeader title="About the Company" subtitle="Who they are and what they do" />
            {/* Full bio already shown above, but keep this section too for consistency (no change) */}
            <p style={bodyText}>{profile.about || "No company description added yet."}</p>
          </section>

          <section style={card}>
            <SectionHeader title="Specialties" subtitle="What this company focuses on" />
            <div style={tagWrap}>
              {specialties.length ? (
                specialties.map((s, i) => <span key={i} style={tag}>{s}</span>)
              ) : (
                <p style={mutedText}>No specialties added.</p>
              )}
            </div>
          </section>

          <section style={card}>
            <SectionHeader title="Company Details" subtitle="More information at a glance" />
            <div style={{ display: "grid", gap: 6 }}>
              <DetailRow label="Industry" value={profile.industry} />
              <DetailRow label="Location" value={profile.location} />
              <DetailRow label="Phone" value={profile.phone} />
              <DetailRow label="Email" value={profile.email} />
              <DetailRow label="Founded" value={profile.founded_date} />
              <DetailRow label="Size" value={profile.company_size} />
            </div>
          </section>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section style={card}>
            <SectionHeader title="Connect" subtitle="Find them across the web" />
            <div style={linkWrap}>
              {socialLinks.length ? (
                socialLinks.map((l, i) => (
                  <a key={i} href={l.href} target="_blank" rel="noreferrer" style={linkBadge}>
                    {l.label}
                  </a>
                ))
              ) : (
                <p style={mutedText}>No social links added.</p>
              )}
            </div>
          </section>

          <section style={card}>
            <SectionHeader title="Related Information" subtitle="Verification and status" />
            <div style={{ display: "grid", gap: 6 }}>
              <DetailRow label="Status" value={profile.is_verified ? "Verified Enterprise" : "Standard Profile"} />
              <DetailRow label="Hiring" value={isCurrentlyHiring ? "Actively Recruiting" : "Not Hiring"} />
              <DetailRow label="Last Update" value={new Date().toLocaleDateString()} />
            </div>
          </section>
        </aside>
      </div>

      <footer style={footer}>
        <div>
          <strong style={{ fontSize: 16 }}>OfSkillJobs — Connect organizations with talent</strong>
          <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>
            Showcase your company and connect with professionals.
          </p>
        </div>
      </footer>

      {toast && <div style={toastStyle(toast.type)}>{toast.message}</div>}

      <style>{`
        @media (max-width: 768px) {
          .hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .hero-actions button,
          .hero-actions a {
            flex: 1 1 auto;
            min-width: calc(33% - 8px);
            text-align: center;
            justify-content: center;
          }
          .contact-copy-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .contact-copy-row a,
          .contact-copy-row button {
            margin: 0;
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
      {subtitle && <p style={{ margin: "6px 0 0", color: "#64748b" }}>{subtitle}</p>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={detailRow}>
      <span style={detailLabel}>{label}</span>
      <span style={detailValue}>{value || "—"}</span>
    </div>
  );
}

// All styles (unchanged from original)
const container: React.CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: 20, fontFamily: "Inter, system-ui, sans-serif" };
const heroWrap: React.CSSProperties = { marginBottom: 18 };
const heroBanner: React.CSSProperties = { borderRadius: 20, overflow: "hidden", minHeight: 340, backgroundSize: "cover", backgroundPosition: "center", boxShadow: "0 18px 45px rgba(2, 6, 23, 0.12)", padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" };
const heroTopRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const logoWrap: React.CSSProperties = { width: 92, height: 92, borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.92)", boxShadow: "0 10px 30px rgba(0,0,0,0.10)" };
const logoImg: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const logoFallback: React.CSSProperties = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 800, color: "#0f172a", background: "linear-gradient(135deg, #f8fafc, #e2e8f0)" };
const heroActions: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" };
const heroContent: React.CSSProperties = { marginTop: 16, background: "rgba(255,255,255,0.80)", backdropFilter: "blur(8px)", borderRadius: 18, padding: 18 };
const titleRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
const companyNameStyle: React.CSSProperties = { margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", color: "#0f172a" };
const verifiedBadge: React.CSSProperties = { background: "#d1fae5", color: "#065f46", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 };
const hiringBadge: React.CSSProperties = { background: "#dbeafe", color: "#1d4ed8", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 };
const metaRow: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, color: "#334155", fontSize: 14 };
const metaBold: React.CSSProperties = { fontWeight: 800, color: "#0f172a" };
const metaDot: React.CSSProperties = { color: "#94a3b8" };
const subText: React.CSSProperties = { marginTop: 14, marginBottom: 0, color: "#334155", lineHeight: 1.75, maxWidth: 900 };
const heroButtons: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 };
const primaryBtn: React.CSSProperties = { background: "#2563eb", color: "white", padding: "10px 14px", borderRadius: 12, textDecoration: "none", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
const secondaryBtn: React.CSSProperties = { background: "rgba(255,255,255,0.92)", color: "#0f172a", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(15,23,42,0.08)", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const editBtn: React.CSSProperties = { background: "#0f172a", color: "white", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const ghostBtn: React.CSSProperties = { background: "rgba(255,255,255,0.82)", color: "#0f172a", padding: "10px 14px", borderRadius: 12, textDecoration: "none", border: "1px solid rgba(15,23,42,0.08)", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const statsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 };
const statCard: React.CSSProperties = { background: "white", borderRadius: 16, padding: 16, boxShadow: "0 10px 30px rgba(2,6,23,0.06)" };
const statValue: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: "#0f172a" };
const statLabel: React.CSSProperties = { marginTop: 6, fontSize: 13, color: "#64748b" };
const mainGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1.6fr 0.9fr", gap: 18, alignItems: "start" };
const card: React.CSSProperties = { background: "white", borderRadius: 18, padding: 18, boxShadow: "0 10px 30px rgba(2,6,23,0.06)" };
const bodyText: React.CSSProperties = { color: "#475569", lineHeight: 1.75, margin: 0 };
const mutedText: React.CSSProperties = { color: "#64748b", margin: 0 };
const tagWrap: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const tag: React.CSSProperties = { background: "#eef2ff", color: "#3730a3", padding: "7px 12px", borderRadius: 999, fontWeight: 700, fontSize: 13 };
const linkWrap: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const linkBadge: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: 12, textDecoration: "none", color: "#0f172a", fontWeight: 700 };
const footer: React.CSSProperties = { marginTop: 20, background: "#0f172a", color: "white", padding: 20, borderRadius: 18 };
const detailRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px dashed #e5e7eb" };
const detailLabel: React.CSSProperties = { color: "#64748b", fontWeight: 700 };
const detailValue: React.CSSProperties = { color: "#0f172a", fontWeight: 700, textAlign: "right" };
const toastStyle = (type: ToastType): React.CSSProperties => ({ position: "fixed", top: 18, right: 18, zIndex: 1400, background: type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#2563eb", color: "white", padding: "10px 14px", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.16)", fontWeight: 700 });