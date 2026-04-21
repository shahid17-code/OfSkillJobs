"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type Application = {
  id: string;
  status: string;
  created_at: string;
  drive_opened_at: string | null;
  resume_opened_at: string | null;
  profile_viewed_at: string | null;
  last_communication_at: string | null;
  communication_note: string | null;
  job_id: string;
  job?: {
    title: string;
    slug: string;
    company?: {
      company_name: string;
      logo_url: string | null;
    };
  };
};

export default function ApplicationsByIdPage() {
  return (
    <ProtectedRoute role="developer">
      <ApplicationsByIdInner />
    </ProtectedRoute>
  );
}

function ApplicationsByIdInner() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) loadApplications();
  }, [userId]);

  async function loadApplications() {
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;
    if (currentUser?.id !== userId) {
      setError("You can only view your own applications.");
      setLoading(false);
      return;
    }

    const { data: rawApps, error: rawError } = await supabase
      .from("job_applications")
      .select("*")
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false });

    if (rawError) {
      setError("Failed to load applications.");
      setLoading(false);
      return;
    }

    if (!rawApps || rawApps.length === 0) {
      setApplications([]);
      setLoading(false);
      return;
    }

    const jobIds = rawApps.map(app => app.job_id).filter(Boolean);
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, title, slug, company_id")
      .in("id", jobIds);
    
    const companyIds = jobsData?.map(job => job.company_id).filter(Boolean) || [];
    const { data: companiesData } = await supabase
      .from("users")
      .select("id, company_name, logo_url")
      .in("id", companyIds);

    const jobsMap = new Map(jobsData?.map(j => [j.id, j]) || []);
    const companiesMap = new Map(companiesData?.map(c => [c.id, c]) || []);

    const enrichedApps = rawApps.map(app => {
      const job = jobsMap.get(app.job_id);
      const company = job ? companiesMap.get(job.company_id) : null;
      return {
        ...app,
        job: job ? {
          title: job.title,
          slug: job.slug,
          company: company ? {
            company_name: company.company_name,
            logo_url: company.logo_url,
          } : undefined,
        } : undefined,
      };
    });

    setApplications(enrichedApps as any);
    setLoading(false);
  }

  const formatDate = (date: string) => new Date(date).toLocaleString();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "shortlisted":
        return { label: "⭐ Shortlisted", bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" };
      case "reviewed":
        return { label: "📋 Reviewed", bg: "#faf5ff", text: "#6b21a5", border: "#e9d5ff" };
      case "rejected":
        return { label: "❌ Rejected", bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
      default:
        return { label: "⏳ Submitted", bg: "#fefce8", text: "#854d0e", border: "#fef08a" };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        Loading applications…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#ef4444" }}>
        <p>{error}</p>
      </div>
    );
  }

  const totalApps = applications.length;
  const reviewedApps = applications.filter(a => a.status === "reviewed").length;
  const shortlistedApps = applications.filter(a => a.status === "shortlisted").length;

  const containerStyle = {
    maxWidth: 1120,
    margin: "0 auto",
    padding: 20,
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto",
    background: "#f8fafc",
    minHeight: "100vh",
  };

  const cardStyle = {
    background: "white",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
    transition: "background 0.2s ease",
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @media (max-width: 640px) {
          .stats-grid-mobile {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
        }
      `}</style>

      {/* Hero Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #eef2ff, #f8fafc, #e0f2fe)",
          borderRadius: 20,
          padding: 24,
          marginBottom: 24,
          boxShadow: "0 18px 45px rgba(2,6,23,0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "#0f172a" }}>📬 Application Tracker</h1>
            <p style={{ color: "#475569", marginTop: 6 }}>Real‑time status of every job you've applied for</p>
          </div>
        </div>

        {/* Stats Grid - now 2x2 on mobile */}
        <div
          className="stats-grid-mobile"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          <div style={{ background: "white", borderRadius: 16, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#2563eb" }}>{totalApps}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Total Applications</div>
          </div>
          <div style={{ background: "white", borderRadius: 16, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#9333ea" }}>{reviewedApps}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Reviewed</div>
          </div>
          <div style={{ background: "white", borderRadius: 16, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a" }}>{shortlistedApps}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Shortlisted</div>
          </div>
        </div>
      </div>

      {/* Applications List (unchanged) */}
      {applications.length === 0 ? (
        <div style={cardStyle}>
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No applications yet</h3>
            <p style={{ color: "#64748b", marginBottom: 24 }}>You haven't applied to any jobs. Start exploring!</p>
            <button
              onClick={() => router.push("/jobs")}
              style={{
                background: "#2563eb",
                color: "white",
                padding: "10px 20px",
                borderRadius: 12,
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Browse Jobs
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {applications.map((app) => {
            const statusConfig = getStatusConfig(app.status);
            const isRejected = app.status === "rejected";
            const isShortlisted = app.status === "shortlisted";
            const isReviewed = app.status === "reviewed";

            const steps = [
              { name: "Submitted", completed: true, date: app.created_at },
              { name: "Reviewed", completed: isReviewed || isShortlisted || isRejected, date: app.profile_viewed_at || null },
              { name: "Decision", completed: isShortlisted || isRejected, date: null },
            ];

            return (
              <div key={app.id} style={cardStyle}>
                {/* Header */}
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    {app.job?.company?.logo_url ? (
                      <img
                        src={app.job.company.logo_url}
                        alt="Company logo"
                        style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: "1px solid #e2e8f0" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          background: "#eef2ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                          fontWeight: 700,
                          color: "#2563eb",
                        }}
                      >
                        {app.job?.company?.company_name?.charAt(0) || "C"}
                      </div>
                    )}
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                        {app.job?.title || "Unknown Job"}
                      </h2>
                      <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0 0" }}>
                        {app.job?.company?.company_name || "Unknown Company"}
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      background: statusConfig.bg,
                      color: statusConfig.text,
                      border: `1px solid ${statusConfig.border}`,
                      borderRadius: 40,
                      padding: "6px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 24 }}>Applied on {formatDate(app.created_at)}</p>

                {/* Progress Timeline */}
                <div style={{ background: "#f8fafc", borderRadius: 16, padding: 20, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#64748b", marginBottom: 16 }}>
                    Application Progress
                  </h3>
                  <div style={{ position: "relative" }}>
                    {steps.map((step, idx) => (
                      <div key={step.name} style={{ display: "flex", gap: 16, marginBottom: idx === steps.length - 1 ? 0 : 24 }}>
                        <div style={{ position: "relative" }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: step.completed
                                ? idx === 2 && isShortlisted
                                  ? "#16a34a"
                                  : idx === 2 && isRejected
                                  ? "#ef4444"
                                  : "#16a34a"
                                : "#e2e8f0",
                              color: step.completed ? "white" : "#94a3b8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {step.completed ? "✓" : idx + 1}
                          </div>
                          {idx < steps.length - 1 && (
                            <div
                              style={{
                                position: "absolute",
                                top: 32,
                                left: 15,
                                width: 2,
                                height: 40,
                                background: step.completed && steps[idx + 1].completed ? "#86efac" : "#e2e8f0",
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: step.completed ? "#0f172a" : "#94a3b8", margin: 0 }}>
                            {step.name}
                          </p>
                          {step.date && (
                            <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0 0" }}>
                              {formatDate(step.date)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Message */}
                <div
                  style={{
                    background: isShortlisted ? "#f0fdf4" : isRejected ? "#fef2f2" : isReviewed ? "#faf5ff" : "#fefce8",
                    border: `1px solid ${
                      isShortlisted ? "#bbf7d0" : isRejected ? "#fecaca" : isReviewed ? "#e9d5ff" : "#fef08a"
                    }`,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 24,
                  }}
                >
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>
                      {isShortlisted ? "🎉" : isRejected ? "💔" : isReviewed ? "📋" : "⏳"}
                    </span>
                    <div>
                      <h4
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          margin: 0,
                          color: isShortlisted ? "#166534" : isRejected ? "#991b1b" : isReviewed ? "#6b21a5" : "#854d0e",
                        }}
                      >
                        {isShortlisted && "Congratulations! You've been shortlisted."}
                        {isRejected && "Not selected this time."}
                        {isReviewed && "Your application has been reviewed."}
                        {!isShortlisted && !isRejected && !isReviewed && "Application submitted successfully!"}
                      </h4>
                      <p style={{ fontSize: 14, color: "#475569", marginTop: 6 }}>
                        {isShortlisted && "The company is impressed with your skills. Expect further communication."}
                        {isRejected && "Every rejection is a redirection. Keep improving – the right opportunity is waiting."}
                        {isReviewed && "The recruiter has evaluated your profile. A decision is coming soon."}
                        {!isShortlisted && !isRejected && !isReviewed &&
                          "Your application is now with the company. We'll notify you as soon as there's an update."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#64748b", marginBottom: 16 }}>
                    📋 Activity Timeline
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", fontSize: 16 }}>
                        ✅
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, margin: 0 }}>Application submitted</p>
                        <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{formatDate(app.created_at)}</p>
                      </div>
                    </div>

                    {app.profile_viewed_at && (
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", fontSize: 16 }}>
                          👁️
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, margin: 0 }}>Profile viewed by company</p>
                          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{formatDate(app.profile_viewed_at)}</p>
                        </div>
                      </div>
                    )}

                    {app.drive_opened_at && (
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5", fontSize: 16 }}>
                          📂
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, margin: 0 }}>Google Drive folder opened</p>
                          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{formatDate(app.drive_opened_at)}</p>
                        </div>
                      </div>
                    )}

                    {app.resume_opened_at && (
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#9333ea", fontSize: 16 }}>
                          📄
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, margin: 0 }}>Resume viewed/downloaded</p>
                          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{formatDate(app.resume_opened_at)}</p>
                        </div>
                      </div>
                    )}

                    {app.status === "reviewed" && (
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#9333ea", fontSize: 16 }}>
                          📋
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, margin: 0 }}>Application reviewed</p>
                          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Status updated by company</p>
                        </div>
                      </div>
                    )}

                    {isShortlisted && (
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", fontSize: 16 }}>
                          ⭐
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, margin: 0 }}>Shortlisted!</p>
                          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Congratulations! Next steps coming soon.</p>
                        </div>
                      </div>
                    )}

                    {isRejected && (
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", fontSize: 16 }}>
                          ❌
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, margin: 0 }}>Not selected</p>
                          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>The company has moved forward with other candidates.</p>
                        </div>
                      </div>
                    )}

                    {app.last_communication_at && (
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ffedd5", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c", fontSize: 16 }}>
                          📞
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, margin: 0 }}>Company contacted you</p>
                          <p style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{app.communication_note || "No details"}</p>
                          <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{formatDate(app.last_communication_at)}</p>
                        </div>
                      </div>
                    )}

                    {!app.profile_viewed_at &&
                      !app.drive_opened_at &&
                      !app.resume_opened_at &&
                      app.status !== "reviewed" &&
                      !isShortlisted &&
                      !isRejected && (
                        <div style={{ display: "flex", gap: 12, opacity: 0.7 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 16 }}>
                            ⏳
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, margin: 0, color: "#475569" }}>Awaiting company action</p>
                            <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>The recruiter will review your application soon</p>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button
                    onClick={() => router.push(`/jobs/${app.job?.slug}`)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 14,
                    }}
                  >
                    View job details <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}