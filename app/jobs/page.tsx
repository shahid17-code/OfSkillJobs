"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type JobRow = {
  id: string;
  company_id: string;
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
};

type JobItem = JobRow & {
  company_name: string;
  company_username: string | null;
  company_industry: string | null;
  company_logo_url: string | null;
};

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadJobs() {
    try {
      setLoading(true);
      setAppliedJobIds([]);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: jobRows, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (jobError) {
        console.error("Jobs fetch error:", jobError);
        setJobs([]);
        return;
      }

      const rows = (jobRows || []) as JobRow[];

      const companyIds = Array.from(
        new Set(rows.map((job) => job.company_id).filter(Boolean))
      );

      let companyMap: Record<
        string,
        {
          company_name: string | null;
          username: string | null;
          industry: string | null;
          logo_url: string | null;
        }
      > = {};

      if (companyIds.length) {
        const { data: companies, error: companyError } = await supabase
          .from("users")
          .select("id, company_name, username, industry, logo_url")
          .in("id", companyIds);

        if (companyError) {
          console.error("Company fetch error:", companyError);
        }

        companyMap =
          (companies || []).reduce(
            (
              acc: Record<
                string,
                {
                  company_name: string | null;
                  username: string | null;
                  industry: string | null;
                  logo_url: string | null;
                }
              >,
              company: any
            ) => {
              acc[company.id] = {
                company_name: company.company_name || "Company",
                username: company.username || null,
                industry: company.industry || null,
                logo_url: company.logo_url || null,
              };
              return acc;
            },
            {} as Record<
              string,
              {
                company_name: string | null;
                username: string | null;
                industry: string | null;
                logo_url: string | null;
              }
            >
          ) || {};
      }

      const merged: JobItem[] = rows.map((job) => {
        const company = companyMap[job.company_id] || {
          company_name: "Company",
          username: null,
          industry: null,
          logo_url: null,
        };

        return {
          ...job,
          company_name: company.company_name || "Company",
          company_username: company.username,
          company_industry: company.industry,
          company_logo_url: company.logo_url,
        };
      });

      setJobs(merged);

      if (user?.email) {
        const normalizedEmail = user.email.toLowerCase();

        const { data: appRows, error: appError } = await supabase
          .from("job_applications")
          .select("job_id")
          .ilike("applicant_email", normalizedEmail);

        if (appError) {
          console.error("Application fetch error:", appError);
          setAppliedJobIds([]);
        } else {
          const appliedIds = Array.from(
            new Set((appRows || []).map((app: any) => app.job_id).filter(Boolean))
          );
          setAppliedJobIds(appliedIds);
        }
      } else {
        setAppliedJobIds([]);
      }
    } catch (err) {
      console.error("Unexpected jobs page error:", err);
      setJobs([]);
      setAppliedJobIds([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((job) => {
      const haystack = [
        job.title,
        job.role_type,
        job.location,
        job.description,
        job.company_name,
        job.company_industry,
        job.task_title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [jobs, search]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const taskBased = jobs.filter((job) => job.task_required).length;
    const remote = jobs.filter((job) => job.is_remote).length;
    const companies = new Set(jobs.map((job) => job.company_id)).size;

    return { total, taskBased, remote, companies };
  }, [jobs]);

  function handleViewAndApply(slug: string) {
    router.push(`/jobs/${slug}`);
  }

  return (
    <div style={pageShell}>
      <div className="hero-card" style={heroCard}>
        <div style={heroLeft}>
          <p style={eyebrow}>Public jobs</p>
          <h1 style={pageTitle}>Show skills, get hired</h1>
          <p style={pageSubtitle}>
            Browse active job posts, review task requirements, and apply with a Google
            Drive submission link. Clean, task-based hiring for modern companies.
          </p>

          <div style={heroActions}>
            <button type="button" style={ghostHeroBtn} onClick={() => router.push("/")}>
              Back to home
            </button>
          </div>
        </div>

        <div className="stats-grid" style={heroStats}>
          <StatBox label="Active jobs" value={String(stats.total)} />
          <StatBox label="Task-based roles" value={String(stats.taskBased)} />
          <StatBox label="Remote jobs" value={String(stats.remote)} />
          <StatBox label="Companies hiring" value={String(stats.companies)} />
        </div>
      </div>

      <div style={toolbar}>
        <div style={searchWrap}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, role, location, company..."
            style={searchInput}
          />
        </div>

        <button type="button" onClick={loadJobs} style={refreshBtn}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={loadingCard}>
          <div style={loadingSpinner} />
          <h2 style={{ margin: "16px 0 0", color: "#0f172a" }}>Loading jobs...</h2>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
            Finding the latest active opportunities.
          </p>
        </div>
      ) : filteredJobs.length ? (
        <div style={grid}>
          {filteredJobs.map((job) => {
            const expired =
              !!job.expires_at && new Date(job.expires_at).getTime() <= Date.now();
            const alreadyApplied = appliedJobIds.includes(job.id);

            return (
              <div key={job.id} style={jobCard}>
                <div style={jobTopRow}>
                  <div style={companyBadge}>
                    {job.company_logo_url ? (
                      <img
                        src={job.company_logo_url}
                        alt={job.company_name}
                        style={companyLogo}
                      />
                    ) : (
                      <div style={companyLogoFallback}>
                        {job.company_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div style={{ minWidth: 0 }}>
                      <p style={companyName}>{job.company_name}</p>
                      <p style={companyMeta}>
                        {job.company_industry || "Company"}
                        {job.location ? ` • ${job.location}` : ""}
                      </p>
                    </div>
                  </div>

                  <span style={statusPill(expired ? "closed" : "open")}>
                    {expired ? "Expired" : "Open"}
                  </span>
                </div>

                <h2 style={jobTitle}>{job.title}</h2>

                <p style={jobRole}>
                  {job.role_type || "Role"}{" "}
                  {job.is_remote ? "• Remote" : "• On-site / Hybrid"}
                </p>

                <p style={jobDescription}>
                  {job.description.length > 180
                    ? `${job.description.slice(0, 180)}...`
                    : job.description}
                </p>

                <div style={pillRow}>
                  <span style={pill}>
                    {job.salary_min || job.salary_max
                      ? `${job.salary_min ? `₹${job.salary_min}` : "₹—"} - ${
                          job.salary_max ? `₹${job.salary_max}` : "₹—"
                        }`
                      : "Salary confidential"}
                  </span>

                  <span style={pill}>
                    {job.task_required ? "Task required" : "No task"}
                  </span>

                  <span style={pill}>
                    {job.expires_at
                      ? `Expires ${new Date(job.expires_at).toLocaleDateString()}`
                      : "No expiry set"}
                  </span>

                  {alreadyApplied && <span style={appliedPill}>Applied ✓</span>}
                </div>

                <div style={cardActions}>
                  <button
                    type="button"
                    style={primaryBtn}
                    onClick={() => handleViewAndApply(job.slug)}
                  >
                    {alreadyApplied ? "Already Applied" : "View & Apply"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={emptyCard}>
          <h2 style={{ margin: 0, color: "#0f172a" }}>No matching jobs found</h2>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
            Try a different search term or check back later.
          </p>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .hero-card {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
          .stats-grid {
            width: 100% !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            min-height: 110px;
          }
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={statBox}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

const pageShell: React.CSSProperties = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: 20,
  fontFamily:
    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
};

const heroCard: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 48%, #eef4ff 100%)",
  borderRadius: 28,
  padding: 24,
  boxShadow: "0 18px 50px rgba(2, 6, 23, 0.08)",
  display: "grid",
  gridTemplateColumns: "1.3fr 0.8fr",
  gap: 20,
  alignItems: "stretch",
  marginBottom: 18,
  border: "1px solid rgba(37, 99, 235, 0.08)",
};

const heroLeft: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const pageTitle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 40,
  lineHeight: 1.05,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.04em",
};

const pageSubtitle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#475569",
  lineHeight: 1.8,
  maxWidth: 820,
  fontSize: 15,
};

const heroActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 18,
};

const ghostHeroBtn: React.CSSProperties = {
  background: "white",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
};

const heroStats: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
  gap: 12,
};

const statBox: React.CSSProperties = {
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(226, 232, 240, 0.9)",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.04)",
};

const statValue: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#0f172a",
};

const statLabel: React.CSSProperties = {
  marginTop: 5,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 600,
};

const toolbar: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginBottom: 18,
  flexWrap: "wrap",
};

const searchWrap: React.CSSProperties = {
  flex: 1,
  minWidth: 280,
};

const searchInput: React.CSSProperties = {
  width: "100%",
  border: "1px solid #dbe3ee",
  borderRadius: 14,
  padding: "12px 14px",
  outline: "none",
  fontSize: 14,
  background: "white",
  color: "#0f172a",
  boxSizing: "border-box",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.03)",
};

const refreshBtn: React.CSSProperties = {
  background: "#0f172a",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.14)",
};

const loadingCard: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: 40,
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
  border: "1px solid #eef2f7",
};

const loadingSpinner: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "4px solid #dbe3ee",
  borderTopColor: "#2563eb",
  margin: "0 auto",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
};

const jobCard: React.CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 12px 35px rgba(2, 6, 23, 0.06)",
  border: "1px solid #eef2f7",
};

const jobTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
};

const companyBadge: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};

const companyLogo: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 14,
  objectFit: "cover",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
};

const companyLogoFallback: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 14,
  background: "linear-gradient(135deg, #e2e8f0, #f8fafc)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  color: "#0f172a",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
};

const companyName: React.CSSProperties = {
  margin: 0,
  fontWeight: 900,
  color: "#0f172a",
  lineHeight: 1.2,
};

const companyMeta: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.5,
};

const statusPill = (mode: "open" | "closed"): React.CSSProperties => ({
  background:
    mode === "open"
      ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
      : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
  color: mode === "open" ? "#166534" : "#991b1b",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
});

const jobTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.03em",
  lineHeight: 1.25,
};

const jobRole: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#475569",
  fontWeight: 700,
};

const jobDescription: React.CSSProperties = {
  margin: "14px 0 0",
  color: "#475569",
  lineHeight: 1.8,
  minHeight: 62,
};

const pillRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const pill: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#0f172a",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
};

const appliedPill: React.CSSProperties = {
  background: "#dbeafe",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 800,
};

const cardActions: React.CSSProperties = {
  marginTop: 18,
};

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "white",
  border: "none",
  padding: "12px 14px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 900,
  width: "100%",
  boxShadow: "0 10px 25px rgba(37,99,235,0.20)",
};

const emptyCard: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: 36,
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
  border: "1px solid #eef2f7",
};