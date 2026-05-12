"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { supabase } from "@/lib/supabase";

type JobRow = {
  id: string;
  company_id: string | null;
  title: string;
  slug: string;
  role_type: string | null;
  location: string | null;
  is_remote: boolean | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  task_required: boolean | null;
  task_title: string | null;
  task_instructions: string | null;
  task_type: string | null;
  expires_at: string | null;
  status: string | null;
  created_at: string | null;
  source?: string | null;
  external_apply_url?: string | null;
  company_name?: string | null;
};

type JobItem = JobRow & {
  company_name_display: string;
  company_username: string | null;
  company_industry: string | null;
  company_logo_url: string | null;
  is_curated: boolean;
};

function timeAgo(dateString: string | null): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function cleanDescription(html: string): string {
  if (!html) return "";
  let text = html.replace(/<[^>]*>/g, " ");
  const entities: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
    "&#39;": "'", "&nbsp;": " ", "&copy;": "©", "&reg;": "®", "&trade;": "™",
  };
  text = text.replace(/&[#\w]+;/g, (m) => entities[m] || m);
  return text.replace(/\s+/g, " ").trim().replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");
}

function getBadges(job: JobItem) {
  const now = new Date();
  const created = job.created_at ? new Date(job.created_at) : null;
  const daysSince = created ? Math.floor((now.getTime() - created.getTime()) / 86400000) : 999;
  const expires = job.expires_at ? new Date(job.expires_at) : null;
  const daysLeft = expires ? Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / 86400000)) : null;

  const badges: Array<{ text: string; color: string; bg: string }> = [];
  if (daysSince <= 3) badges.push({ text: "New", color: "#fff", bg: "#10b981" });
  if (job.is_remote) badges.push({ text: "Remote", color: "#fff", bg: "#8b5cf6" });
  if (job.task_required) badges.push({ text: "Task-based", color: "#fff", bg: "#2563eb" });
  if (job.is_curated) badges.push({ text: "External", color: "#fff", bg: "#f59e0b" });
  if (daysLeft !== null && daysLeft <= 3 && daysLeft > 0) badges.push({ text: "Closing soon", color: "#fff", bg: "#ef4444" });
  if (job.source === "remotive") badges.push({ text: "Trending", color: "#fff", bg: "#ec4899" });
  return badges;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "task" | "remote" | "external">("all");

  useEffect(() => {
    async function redirectCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (userData?.role === "company") router.replace("/company/dashboard");
      }
    }
    redirectCompany();
  }, [router]);

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    try {
      setLoading(true);
      setAppliedJobIds([]);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: jobRows, error: jobError } = await supabase
        .from("jobs").select("*").eq("status", "active").order("created_at", { ascending: false });

      if (jobError) { console.error(jobError); setJobs([]); return; }

      const rows = (jobRows || []) as JobRow[];
      const companyJobs = rows.filter(j => j.company_id);
      const curatedJobs = rows.filter(j => !j.company_id);

      const companyIds = Array.from(new Set(companyJobs.map(j => j.company_id!).filter(Boolean)));
      let companyMap: Record<string, { company_name: string | null; username: string | null; industry: string | null; logo_url: string | null }> = {};

      if (companyIds.length) {
        const { data: companies } = await supabase.from("users").select("id, company_name, username, industry, logo_url").in("id", companyIds);
        companyMap = (companies || []).reduce((acc: any, c: any) => {
          acc[c.id] = { company_name: c.company_name || "Company", username: c.username || null, industry: c.industry || null, logo_url: c.logo_url || null };
          return acc;
        }, {});
      }

      const merged: JobItem[] = [
        ...companyJobs.map(job => {
          const co = companyMap[job.company_id!] || { company_name: "Company", username: null, industry: null, logo_url: null };
          return { ...job, company_name_display: co.company_name || "Company", company_username: co.username, company_industry: co.industry, company_logo_url: co.logo_url, is_curated: false };
        }),
        ...curatedJobs.map(job => ({ ...job, company_name_display: job.company_name || "External Employer", company_username: null, company_industry: null, company_logo_url: null, is_curated: true })),
      ];

      setJobs(merged);

      if (user?.email) {
        const { data: appRows } = await supabase.from("job_applications").select("job_id").ilike("applicant_email", user.email.toLowerCase());
        setAppliedJobIds(Array.from(new Set((appRows || []).map((a: any) => a.job_id).filter(Boolean))));
      }
    } catch (err) {
      console.error(err); setJobs([]); setAppliedJobIds([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (activeFilter === "task") result = result.filter(j => j.task_required);
    if (activeFilter === "remote") result = result.filter(j => j.is_remote);
    if (activeFilter === "external") result = result.filter(j => j.is_curated);
    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter(j =>
      [j.title, j.role_type, j.location, j.description, j.company_name_display, j.company_industry, j.task_title]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [jobs, search, activeFilter]);

  const stats = useMemo(() => ({
    total: jobs.length,
    taskBased: jobs.filter(j => j.task_required).length,
    remote: jobs.filter(j => j.is_remote).length,
    external: jobs.filter(j => j.is_curated).length,
    companies: new Set(jobs.map(j => j.company_id).filter(Boolean)).size,
  }), [jobs]);

  // ── SEO schemas (unchanged) ──
  const listSchema = useMemo(() => {
    if (!jobs.length) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Jobs on OfSkillJob",
      description: "Skill-based job listings on OfSkillJob. Complete a task, apply with a Drive link, and get hired.",
      url: "https://ofskilljobs.vercel.app/jobs",
      numberOfItems: jobs.length,
      itemListElement: jobs.slice(0, 20).map((job, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `https://ofskilljobs.vercel.app/jobs/${job.slug}`,
        name: job.title,
      })),
    };
  }, [jobs]);

  const jobPostingSchemas = useMemo(() => {
    return jobs.slice(0, 10).map(job => {
      const desc = cleanDescription(job.description);
      const schema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: desc || `${job.title} position at ${job.company_name_display}. Apply on OfSkillJob with a skill task submission.`,
        datePosted: job.created_at ? new Date(job.created_at).toISOString().split("T")[0] : undefined,
        validThrough: job.expires_at ? new Date(job.expires_at).toISOString().split("T")[0] : undefined,
        employmentType: job.role_type?.toUpperCase().replace(/\s+/g, "_") || "FULL_TIME",
        jobLocationType: job.is_remote ? "TELECOMMUTE" : undefined,
        hiringOrganization: {
          "@type": "Organization",
          name: job.company_name_display,
          sameAs: job.company_username ? `https://ofskilljobs.vercel.app/company/${job.company_username}` : undefined,
        },
        jobLocation: job.is_remote
          ? { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "IN" } }
          : job.location
            ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "IN" } }
            : undefined,
        baseSalary: job.salary_min || job.salary_max
          ? {
              "@type": "MonetaryAmount",
              currency: "INR",
              value: {
                "@type": "QuantitativeValue",
                minValue: job.salary_min || undefined,
                maxValue: job.salary_max || undefined,
                unitText: "YEAR",
              },
            }
          : undefined,
        url: `https://ofskilljobs.vercel.app/jobs/${job.slug}`,
        directApply: !job.is_curated,
      };
      return JSON.parse(JSON.stringify(schema));
    });
  }, [jobs]);

  return (
    <>
      <Head>
        <title>Jobs – OfSkillJob | Skill-based Hiring in India</title>
        <meta name="description" content={`Browse ${stats.total}+ active skill-based job listings on OfSkillJob. Complete a real task, submit via Google Drive, and get hired. No fees. ${stats.remote} remote jobs available.`} />
        <meta name="keywords" content="skill based jobs India, task based hiring, remote jobs India, IT jobs, developer jobs, design jobs, marketing jobs, OfSkillJob" />
        <link rel="canonical" href="https://ofskilljobs.vercel.app/jobs" />
        <meta property="og:title" content="Browse Jobs – OfSkillJob | Show Skills. Get Hired." />
        <meta property="og:description" content="Task-based job listings for developers, designers, marketers and more. Apply by submitting real work — not just a resume." />
        <meta property="og:url" content="https://ofskilljobs.vercel.app/jobs" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://ofskilljobs.vercel.app/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Browse Jobs – OfSkillJob" />
        <meta name="twitter:description" content="Skill-based jobs in India. Complete a task, apply via Drive. No fees." />
        <meta name="twitter:image" content="https://ofskilljobs.vercel.app/og-image.png" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />

        {listSchema && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />
        )}
        {jobPostingSchemas.map((schema, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        ))}
      </Head>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        *, *::before, *::after { box-sizing: border-box; }
        html, body { overflow-x: hidden !important; }
        .job-card-anim { animation: fadeUp 0.4s ease both; }
        .osj-btn { transition: transform .15s ease, box-shadow .15s ease; }
        .osj-btn:hover { transform: translateY(-2px); }
        .osj-btn:active { transform: scale(.97); }
        .job-card-inner:hover { box-shadow: 0 16px 44px rgba(2,6,23,.12) !important; transform: translateY(-2px); }
        .job-card-inner { transition: box-shadow .2s ease, transform .2s ease; }

        @media (max-width: 768px) {
          .hero-grid  { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .jobs-grid  { grid-template-columns: 1fr !important; }
          .toolbar-row { flex-direction: column !important; }
          /* Filter chips become 2×2 grid on mobile */
          .filter-row { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; flex-wrap: unset !important; }
          .filter-row button { width: 100% !important; text-align: center !important; }
          .hero-title { font-size: 28px !important; }
          .hero-sub   { font-size: 14px !important; }
          .stat-val   { font-size: 24px !important; }
          .hero-btns  { flex-direction: column !important; }
          .hero-btns button, .hero-btns a { width: 100% !important; text-align: center !important; }
        }
        @media (min-width: 769px) {
          .jobs-grid { grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)) !important; }
        }
      `}</style>

      <div style={shell}>

        {/* HERO – removed "Post a Job" button */}
        <div style={heroCard} className="hero-grid">
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4338ca", padding: "5px 13px", borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 16, alignSelf: "flex-start" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4f46e5", display: "inline-block" }} />
              OfSkillJob · Live Job Board
            </div>
            <h1 className="hero-title" style={{ margin: "0 0 14px", fontSize: 40, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              Show Skills.{" "}
              <span style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Get Hired.</span>
            </h1>
            <p className="hero-sub" style={{ margin: "0 0 22px", color: "#475569", lineHeight: 1.75, fontSize: 15, maxWidth: 480 }}>
              Browse active listings, complete the skill task, and apply with a Google Drive link. No black-hole resumes. No fees. Ever.
            </p>
            <div className="hero-btns" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="osj-btn" style={{ background: "#0f172a", color: "white", border: "none", padding: "11px 20px", borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 14 }} onClick={() => router.push("/")}>
                ← Back to Home
              </button>
            </div>
          </div>

          {/* Stat boxes */}
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "center" }}>
            {[
              { icon: "💼", val: stats.total, label: "Active Jobs", bg: "#eef2ff" },
              { icon: "✅", val: stats.taskBased, label: "Task-based", bg: "#f0fdf4" },
              { icon: "🌐", val: stats.remote, label: "Remote Jobs", bg: "#fdf4ff" },
              { icon: "🏢", val: stats.companies, label: "Companies Hiring", bg: "#fefce8" },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", borderRadius: 18, padding: "18px 16px", border: "1px solid #f1f5f9", boxShadow: "0 4px 14px rgba(2,6,23,.05)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginBottom: 10 }}>{s.icon}</div>
                <div className="stat-val" style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {loading ? "—" : s.val}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TOOLBAR */}
        <div style={{ marginBottom: 18 }}>
          <div className="toolbar-row" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none", color: "#94a3b8" }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, company, location, role…"
                style={{ width: "100%", border: "1px solid #dbe3ee", borderRadius: 14, padding: "12px 14px 12px 40px", outline: "none", fontSize: 14, background: "white", color: "#0f172a", boxSizing: "border-box", boxShadow: "0 4px 12px rgba(2,6,23,.04)" }}
              />
            </div>
            <button type="button" className="osj-btn" onClick={loadJobs}
              style={{ background: "#2563eb", color: "white", border: "none", padding: "12px 18px", borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(37,99,235,.28)" }}>
              ↻ Refresh
            </button>
          </div>

          {/* Filter chips – now with "All Jobs", "Task-based", "Remote", "External" exactly as requested */}
          <div className="filter-row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "all", label: `All Jobs (${stats.total})` },
              { key: "task", label: `✅ Task-based (${stats.taskBased})` },
              { key: "remote", label: `🌐 Remote (${stats.remote})` },
              { key: "external", label: `📎 External (${stats.external})` },
            ].map(f => (
              <button key={f.key} type="button" onClick={() => setActiveFilter(f.key as any)}
                style={{ padding: "8px 16px", borderRadius: 999, border: "1.5px solid", borderColor: activeFilter === f.key ? "#2563eb" : "#e2e8f0", background: activeFilter === f.key ? "#eef2ff" : "white", color: activeFilter === f.key ? "#2563eb" : "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "all .15s ease" }}>
                {f.label}
              </button>
            ))}
            {search && (
              <button type="button" onClick={() => setSearch("")}
                style={{ padding: "8px 14px", borderRadius: 999, border: "1.5px solid #fecaca", background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                ✕ Clear search
              </button>
            )}
          </div>
        </div>

        {/* RESULTS COUNT */}
        {!loading && (
          <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 14, fontWeight: 600 }}>
            {filteredJobs.length === 0
              ? "No jobs found"
              : `Showing ${filteredJobs.length} of ${jobs.length} job${jobs.length !== 1 ? "s" : ""}`}
            {search && <span style={{ color: "#2563eb" }}> · &ldquo;${search}&rdquo;</span>}
          </p>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div style={loadingCard}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", border: "4px solid #dbe3ee", borderTopColor: "#2563eb", margin: "0 auto", animation: "spin 0.8s linear infinite" }} />
            <h2 style={{ margin: "16px 0 6px", color: "#0f172a", fontSize: 18 }}>Finding opportunities…</h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Loading the latest skill-based jobs for you.</p>
          </div>
        )}

        {/* JOB GRID */}
        {!loading && filteredJobs.length > 0 && (
          <div className="jobs-grid" style={{ display: "grid", gap: 16 }}>
            {filteredJobs.map((job, idx) => {
              const expired = !!job.expires_at && new Date(job.expires_at).getTime() <= Date.now();
              const alreadyApplied = appliedJobIds.includes(job.id);
              const badges = getBadges(job);
              const desc = cleanDescription(job.description);
              const descPreview = desc.length > 160 ? desc.slice(0, 160) + "…" : desc;
              
              // ✅ Salary shown as raw numbers (rupees) instead of lakhs
              const salary = job.salary_min || job.salary_max
                ? `${job.salary_min ? `₹${job.salary_min.toLocaleString("en-IN")}` : "₹—"} – ${job.salary_max ? `₹${job.salary_max.toLocaleString("en-IN")}` : "₹—"}`
                : null;

              return (
                <div key={job.id} className="job-card-anim" style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}>
                  <article className="job-card-inner" style={jobCard}>

                    {/* Company row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                        {!job.is_curated && job.company_logo_url
                          ? <img src={job.company_logo_url} alt={job.company_name_display} style={{ width: 44, height: 44, borderRadius: 13, objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 12px rgba(2,6,23,.1)" }} />
                          : (
                            <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg,#e2e8f0,#f8fafc)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0f172a", fontSize: 18, flexShrink: 0 }}>
                              {job.company_name_display.charAt(0).toUpperCase()}
                            </div>
                          )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 800, color: "#0f172a", fontSize: 14, lineHeight: 1.2 }}>{job.company_name_display}</span>
                            {job.is_curated && (
                              <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, border: "1px solid #fde68a" }}>External</span>
                            )}
                          </div>
                          <p style={{ margin: "3px 0 0", color: "#94a3b8", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>
                            {job.company_industry || (job.is_curated ? "External listing" : "Company")}
                            {job.location ? ` · ${job.location}` : ""}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        <span style={{ background: expired ? "#fee2e2" : "#dcfce7", color: expired ? "#991b1b" : "#166534", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 900 }}>
                          {expired ? "Expired" : "● Open"}
                        </span>
                        {alreadyApplied && !job.is_curated && (
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>Applied ✓</span>
                        )}
                      </div>
                    </div>

                    {/* Job title */}
                    <h2 style={{ margin: "0 0 5px", fontSize: 20, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1.25 }}>{job.title}</h2>

                    {/* Role + location */}
                    <p style={{ margin: "0 0 10px", color: "#64748b", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      {job.role_type && <span>{job.role_type}</span>}
                      {job.role_type && <span style={{ color: "#cbd5e1" }}>·</span>}
                      <span>{job.is_remote ? "🌐 Remote" : "📍 On-site / Hybrid"}</span>
                      {job.location && (
                        <>
                          <span style={{ color: "#cbd5e1" }}>·</span>
                          <span>{job.location}</span>
                        </>
                      )}
                    </p>

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {badges.map((b, i) => (
                          <span key={i} style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: b.bg, color: b.color, letterSpacing: "0.02em" }}>{b.text}</span>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    <p style={{ margin: "0 0 14px", color: "#64748b", lineHeight: 1.75, fontSize: 14, flexGrow: 1 }}>{descPreview}</p>

                    {/* Meta pills */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                      {salary && <span style={metaPill}>{salary}</span>}
                      <span style={metaPill}>{job.task_required ? "✅ Task required" : job.is_curated ? "📎 External apply" : "No task"}</span>
                      {job.expires_at && (
                        <span style={metaPill}>Expires {new Date(job.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      )}
                      <span style={{ ...metaPill, color: "#94a3b8" }}>🕐 {timeAgo(job.created_at)}</span>
                    </div>

                    {/* CTA */}
                    <button
                      type="button"
                      className="osj-btn"
                      style={{
                        width: "100%",
                        background: alreadyApplied && !job.is_curated ? "#f1f5f9" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                        color: alreadyApplied && !job.is_curated ? "#64748b" : "white",
                        border: "none",
                        padding: "13px",
                        borderRadius: 14,
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 15,
                        boxShadow: alreadyApplied && !job.is_curated ? "none" : "0 8px 20px rgba(37,99,235,.25)",
                      }}
                      onClick={() => router.push(`/jobs/${job.slug}`)}>
                      {alreadyApplied && !job.is_curated
                        ? "✓ Already Applied"
                        : job.is_curated
                          ? "View & Apply Externally →"
                          : "View & Apply →"}
                    </button>
                  </article>
                </div>
              );
            })}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filteredJobs.length === 0 && (
          <div style={{ background: "white", borderRadius: 24, padding: "48px 24px", textAlign: "center", border: "1px dashed #dbe3ee" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
            <h2 style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 20, fontWeight: 900 }}>No matching jobs found</h2>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 15, lineHeight: 1.7 }}>
              {search
                ? `No results for "${search}". Try a broader term or clear your filters.`
                : "No jobs match the selected filter. Try switching to All Jobs."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button"
                style={{ background: "#0f172a", color: "white", border: "none", padding: "11px 20px", borderRadius: 14, fontWeight: 800, cursor: "pointer" }}
                onClick={() => { setSearch(""); setActiveFilter("all"); }}>
                Clear filters
              </button>
              <button type="button"
                style={{ background: "white", color: "#0f172a", border: "1px solid #e2e8f0", padding: "11px 20px", borderRadius: 14, fontWeight: 800, cursor: "pointer" }}
                onClick={loadJobs}>
                Refresh jobs
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// ─── Styles (unchanged) ───────────────────────────────────────────────────────
const shell: React.CSSProperties = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: "24px 20px 48px",
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  overflowX: "hidden",
};

const heroCard: React.CSSProperties = {
  background: "linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)",
  borderRadius: 28,
  padding: "28px",
  boxShadow: "0 16px 48px rgba(2,6,23,.08)",
  display: "grid",
  gridTemplateColumns: "1.3fr 0.9fr",
  gap: 28,
  alignItems: "center",
  marginBottom: 20,
  border: "1px solid rgba(37,99,235,.1)",
};

const loadingCard: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: "48px 24px",
  textAlign: "center",
  boxShadow: "0 8px 24px rgba(2,6,23,.06)",
  border: "1px solid #eef2f7",
};

const jobCard: React.CSSProperties = {
  background: "white",
  borderRadius: 22,
  padding: "22px 20px",
  boxShadow: "0 8px 28px rgba(2,6,23,.06)",
  border: "1px solid #eef2f7",
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

const metaPill: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e8eef5",
  color: "#334155",
  padding: "5px 11px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};