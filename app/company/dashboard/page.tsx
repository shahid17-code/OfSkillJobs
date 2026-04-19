"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";


type ToastType = "success" | "error" | "info";
type ViewTab = "overview" | "jobs" | "applications";

type Company = {
  id: string;
  company_name?: string | null;
  username?: string | null;
  industry?: string | null;
  location?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
};

type Job = {
  id: string;
  title: string;
  slug: string;
  role_type: string | null;
  location: string | null;
  is_remote: boolean | null;
  description: string;
  task_required: boolean | null;
  task_title: string | null;
  expires_at: string | null;
  status: string | null;
  created_at: string | null;
};

type JobApplication = {
  id: string;
  job_id: string;
  applicant_id?: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  resume_link: string | null;
  drive_link: string;
  note: string | null;
  status: string | null;
  created_at: string | null;
  drive_opened_at?: string | null;
  resume_opened_at?: string | null;
  profile_viewed_at?: string | null;
};

type ApplicationItem = JobApplication & {
  job_title: string;
  job_slug: string;
  job_status: string | null;
  job_expires_at: string | null;
};

type ApplicantProfile = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  name: string | null;
  headline: string | null;
  location: string | null;
  role: string | null;
  avatar_url: string | null;
  profession?: string | null;
  languages?: string[] | null;
  intro_video_url?: string | null;
};

function isExpired(expiresAt: string | null, status: string | null) {
  if (status && status !== "active") return true;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function normalizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export default function CompanyDashboardPage() {
  return (
    <ProtectedRoute role="company">
      <CompanyDashboardInner />
    </ProtectedRoute>
  );
}

function CompanyDashboardInner() {
  const router = useRouter();
  const toastTimer = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [applicantProfiles, setApplicantProfiles] = useState<Record<string, ApplicantProfile>>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ViewTab>("overview");
  const [selectedApplication, setSelectedApplication] = useState<ApplicationItem | null>(null);

  useEffect(() => {
    loadDashboard();
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string, type: ToastType = "info", duration = 2800) {
    setToast({ message, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), duration);
  }

  async function loadDashboard() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from("users")
        .select("id, company_name, username, industry, location, phone, logo_url, cover_url")
        .eq("id", user.id)
        .maybeSingle();

      if (companyError) {
        console.error("Company load error:", companyError);
        showToast("Failed to load company profile", "error");
        return;
      }

      if (!companyData) {
        showToast("Company profile not found", "error");
        return;
      }

      setCompany(companyData as Company);

      const { data: jobRows, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false });

      if (jobError) {
        console.error("Jobs load error:", jobError);
        showToast("Failed to load jobs", "error");
        setJobs([]);
      } else {
        setJobs((jobRows || []) as Job[]);
      }

      const rows = (jobRows || []) as Job[];
      const jobIds = rows.map((job) => job.id);

      if (!jobIds.length) {
        setApplications([]);
        setApplicantProfiles({});
        return;
      }

      const { data: appRows, error: appError } = await supabase
        .from("job_applications")
        .select("*")
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });

      if (appError) {
        console.error("Applications load error:", appError);
        showToast("Failed to load applications", "error");
        setApplications([]);
        setApplicantProfiles({});
        return;
      }

      const items = (appRows || []) as ApplicationItem[];
      const mapped: ApplicationItem[] = items.map((app) => {
        const matchedJob = rows.find((job) => job.id === app.job_id);
        return {
          ...app,
          job_title: matchedJob?.title || "Unknown job",
          job_slug: matchedJob?.slug || "",
          job_status: matchedJob?.status || null,
          job_expires_at: matchedJob?.expires_at || null,
        };
      });

      setApplications(mapped);

      const profileMap: Record<string, ApplicantProfile> = {};

      const ids = Array.from(
        new Set(
          items
            .map((app) => app.applicant_id?.trim())
            .filter((v): v is string => Boolean(v))
        )
      );

      if (ids.length) {
        const { data: usersById, error: usersByIdError } = await supabase
          .from("users")
          .select("id, email, username, full_name, name, headline, location, role, avatar_url, profession, languages, intro_video_url")
          .in("id", ids);

        if (usersByIdError) {
          console.error("Applicant profile fetch by id error:", usersByIdError);
        } else {
          (usersById || []).forEach((u: any) => {
            const profile: ApplicantProfile = {
              id: String(u.id || ""),
              email: u.email || null,
              username: u.username || null,
              full_name: u.full_name || null,
              name: u.name || null,
              headline: u.headline || null,
              location: u.location || null,
              role: u.role || null,
              avatar_url: u.avatar_url || null,
              profession: u.profession || null,
              languages: Array.isArray(u.languages) ? u.languages : (u.languages ? [u.languages] : []),
              intro_video_url: u.intro_video_url || null,
            };
            if (profile.id) profileMap[profile.id] = profile;
            if (profile.email) profileMap[profile.email.toLowerCase()] = profile;
          });
        }
      }

      const missingEmails = Array.from(
        new Set(
          items
            .map((app) => app.applicant_email.trim().toLowerCase())
            .filter((email) => email && !profileMap[email])
        )
      );

      if (missingEmails.length) {
        const { data: usersByEmail, error: usersByEmailError } = await supabase
          .from("users")
          .select("id, email, username, full_name, name, headline, location, role, avatar_url, profession, languages, intro_video_url")
          .in("email", missingEmails);

        if (usersByEmailError) {
          console.error("Applicant profile fetch by email error:", usersByEmailError);
        } else {
          (usersByEmail || []).forEach((u: any) => {
            const profile: ApplicantProfile = {
              id: String(u.id || ""),
              email: u.email || null,
              username: u.username || null,
              full_name: u.full_name || null,
              name: u.name || null,
              headline: u.headline || null,
              location: u.location || null,
              role: u.role || null,
              avatar_url: u.avatar_url || null,
              profession: u.profession || null,
              languages: Array.isArray(u.languages) ? u.languages : (u.languages ? [u.languages] : []),
              intro_video_url: u.intro_video_url || null,
            };
            if (profile.id) profileMap[profile.id] = profile;
            if (profile.email) profileMap[profile.email.toLowerCase()] = profile;
          });
        }
      }

      setApplicantProfiles(profileMap);
    } catch (err) {
      console.error("Unexpected dashboard error:", err);
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(value: string, okMessage: string, failMessage: string) {
    if (!value) {
      showToast(failMessage, "error");
      return;
    }
    navigator.clipboard.writeText(value).then(
      () => showToast(okMessage, "success"),
      () => showToast(failMessage, "error")
    );
  }

  async function copyCompanyLink() {
    if (!company?.username || typeof window === "undefined") {
      showToast("Public profile not available", "error");
      return;
    }
    const url = `${window.location.origin}/company/profile/${company.username}`;
    copyToClipboard(url, "Public profile link copied", "Failed to copy link");
  }

  async function copyJobLink(slug: string) {
    if (typeof window === "undefined" || !slug) return;
    const url = `${window.location.origin}/jobs/${slug}`;
    copyToClipboard(url, "Job link copied", "Failed to copy job link");
  }

  async function deleteJob(jobId: string) {
    const ok = window.confirm("Delete this job permanently?");
    if (!ok) return;
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) {
        console.error("Delete job error:", error);
        showToast("Failed to delete job", "error");
        return;
      }
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      setApplications((prev) => prev.filter((app) => app.job_id !== jobId));
      showToast("Job deleted", "success");
    } catch (err) {
      console.error("Unexpected delete error:", err);
      showToast("Something went wrong", "error");
    }
  }

  // Edit job navigation
  function editJob(jobId: string) {
    router.push(`/company/jobs/edit/${jobId}`);
  }

  async function deleteApplication(applicationId: string) {
    const ok = window.confirm("Delete this application permanently?");
    if (!ok) return;
    try {
      setSavingStatusId(applicationId);
      const { error } = await supabase.from("job_applications").delete().eq("id", applicationId);
      if (error) {
        console.error("Delete application error:", error);
        showToast("Failed to delete application", "error");
        return;
      }
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));
      setSelectedApplication((prev) => (prev?.id === applicationId ? null : prev));
      showToast("Application deleted", "success");
    } catch (err) {
      console.error("Unexpected delete error:", err);
      showToast("Something went wrong", "error");
    } finally {
      setSavingStatusId(null);
    }
  }

  async function updateApplicationStatus(applicationId: string, newStatus: string) {
    try {
      setSavingStatusId(applicationId);
      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus })
        .eq("id", applicationId);
      if (error) {
        console.error("Application update error:", error);
        showToast("Failed to update application", "error");
        return;
      }
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus } : app))
      );
      setSelectedApplication((prev) =>
        prev?.id === applicationId ? { ...prev, status: newStatus } : prev
      );
      showToast("Application status updated", "success");
    } catch (err) {
      console.error("Unexpected application update error:", err);
      showToast("Something went wrong", "error");
    } finally {
      setSavingStatusId(null);
    }
  }

  function getApplicantProfile(app: ApplicationItem): ApplicantProfile | null {
    const emailKey = app.applicant_email.trim().toLowerCase();
    const idKey = app.applicant_id?.trim() || "";
    return applicantProfiles[idKey] || applicantProfiles[emailKey] || null;
  }

  // Track Drive open
  async function handleOpenDrive(app: ApplicationItem) {
    if (!app.drive_opened_at) {
      await supabase
        .from("job_applications")
        .update({ drive_opened_at: new Date().toISOString() })
        .eq("id", app.id);
      setApplications(prev =>
        prev.map(a => a.id === app.id ? { ...a, drive_opened_at: new Date().toISOString() } : a)
      );
    }
    window.open(normalizeUrl(app.drive_link), "_blank", "noopener,noreferrer");
  }

  // Track Resume open
  async function handleOpenResume(app: ApplicationItem) {
    if (!app.resume_link) {
      showToast("Resume not available", "error");
      return;
    }
    if (!app.resume_opened_at) {
      await supabase
        .from("job_applications")
        .update({ resume_opened_at: new Date().toISOString() })
        .eq("id", app.id);
      setApplications(prev =>
        prev.map(a => a.id === app.id ? { ...a, resume_opened_at: new Date().toISOString() } : a)
      );
    }
    window.open(normalizeUrl(app.resume_link), "_blank", "noopener,noreferrer");
  }

  // Track profile view and redirect
  async function openApplicantProfile(app: ApplicationItem) {
    if (!app.profile_viewed_at) {
      await supabase
        .from("job_applications")
        .update({ profile_viewed_at: new Date().toISOString() })
        .eq("id", app.id);
      setApplications(prev =>
        prev.map(a => a.id === app.id ? { ...a, profile_viewed_at: new Date().toISOString() } : a)
      );
    }
    if (app.applicant_id) {
      router.push(`/candidate/${app.applicant_id}`);
      return;
    }
    if (app.applicant_email) {
      const { data } = await supabase
        .from("users")
        .select("id")
        .ilike("email", app.applicant_email)
        .maybeSingle();
      if (data?.id) {
        await supabase.from("job_applications").update({ applicant_id: data.id }).eq("id", app.id);
        router.push(`/candidate/${data.id}`);
        return;
      }
    }
    showToast(`Account for ${app.applicant_name} no longer exists.`, "error");
  }

  function openEmailComposer(applicantEmail: string) {
    const email = applicantEmail.trim();
    if (!email) {
      showToast("Applicant email not found", "error");
      return;
    }
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
    const win = window.open(gmailUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      window.location.href = `mailto:${email}`;
    }
  }

  function openPublicJobPage(slug: string) {
    if (!slug) {
      showToast("Job link not available", "error");
      return;
    }
    router.push(`/jobs/${slug}`);
  }

  function openPublicCompanyPage() {
    if (company?.username) {
      router.push(`/company/profile/${company.username}`);
      return;
    }
    showToast("Please set a username in your company profile", "error");
    router.push("/company/profile/edit");
  }

  const appStatsByJob = useMemo(() => {
    const map = new Map<string, { count: number; latest: string | null; pending: number; shortlisted: number; reviewed: number; rejected: number }>();
    for (const job of jobs) {
      map.set(job.id, { count: 0, latest: null, pending: 0, shortlisted: 0, reviewed: 0, rejected: 0 });
    }
    for (const app of applications) {
      const current = map.get(app.job_id) || { count: 0, latest: null, pending: 0, shortlisted: 0, reviewed: 0, rejected: 0 };
      current.count += 1;
      if (!current.latest || (app.created_at && new Date(app.created_at) > new Date(current.latest))) {
        current.latest = app.created_at;
      }
      const status = app.status || "submitted";
      if (status === "submitted") current.pending += 1;
      if (status === "reviewed") current.reviewed += 1;
      if (status === "shortlisted") current.shortlisted += 1;
      if (status === "rejected") current.rejected += 1;
      map.set(app.job_id, current);
    }
    return map;
  }, [jobs, applications]);

  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((job) => !isExpired(job.expires_at, job.status)).length;
    const closedJobs = jobs.filter((job) => isExpired(job.expires_at, job.status)).length;
    const totalApplications = applications.length;
    const pendingApplications = applications.filter((app) => (app.status || "submitted") === "submitted").length;
    const shortlistedApplications = applications.filter((app) => app.status === "shortlisted").length;
    return { totalJobs, activeJobs, closedJobs, totalApplications, pendingApplications, shortlistedApplications };
  }, [jobs, applications]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) => [job.title, job.role_type, job.location, job.description, job.task_title, job.status].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [jobs, search]);

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) => [app.applicant_name, app.applicant_email, app.applicant_phone, app.job_title, app.note, app.status, app.drive_link, app.resume_link].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [applications, search]);

  const recentJobs = filteredJobs.slice(0, 4);
  const recentApplications = filteredApplications.slice(0, 6);

  if (loading) {
    return <div style={pageShell}><div style={loadingCard}>Loading company dashboard...</div></div>;
  }

  return (
    <div style={pageShell}>
      <div style={heroCard}>
        <div style={heroOverlay}>
          <div style={heroTop}>
            <div style={brandBlock}>
              <div style={brandLogo}>
                {company?.logo_url ? (
                  <img src={company.logo_url} alt={company?.company_name || "Company"} style={brandLogoImg} />
                ) : (
                  <div style={brandFallback}>{(company?.company_name || "C").charAt(0).toUpperCase()}</div>
                )}
              </div>
              <div>
                <p style={eyebrow}>Company dashboard</p>
                <h1 style={pageTitle}>{company?.company_name || "Company Dashboard"}</h1>
                <p style={pageSubtitle}>Track jobs, review skill-based applications, and move fast with a clean hiring workflow.</p>
              </div>
            </div>
            <div style={heroActions}>
              <button type="button" style={secondaryBtnLight} onClick={copyCompanyLink}>Copy Public Profile</button>
              <button type="button" style={primaryBtnLight} onClick={() => router.push("/company/jobs/new")}>+ Post Job</button>
            </div>
          </div>
          <div style={metaRow}>
            <span style={metaPill}>Total Jobs: {stats.totalJobs}</span>
            <span style={metaPill}>Active: {stats.activeJobs}</span>
            <span style={metaPill}>Closed: {stats.closedJobs}</span>
            <span style={metaPill}>Applications: {stats.totalApplications}</span>
            <span style={metaPill}>Pending: {stats.pendingApplications}</span>
            <span style={metaPill}>Shortlisted: {stats.shortlistedApplications}</span>
          </div>
        </div>
      </div>

      <div style={toolbar}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs, applicants, emails, drive links..." style={searchInput} />
        <div style={tabRow}>
          <button type="button" onClick={() => setTab("overview")} style={tab === "overview" ? tabBtnActive : tabBtn}>Overview</button>
          <button type="button" onClick={() => setTab("jobs")} style={tab === "jobs" ? tabBtnActive : tabBtn}>Jobs</button>
          <button type="button" onClick={() => setTab("applications")} style={tab === "applications" ? tabBtnActive : tabBtn}>Applications</button>
        </div>
        <button type="button" onClick={loadDashboard} style={refreshBtn}>Refresh</button>
      </div>

      {tab === "overview" && (
        <div style={overviewGrid}>
          <section style={mainColumn}>
            <div style={card}>
              <SectionHeader title="Recent jobs" subtitle="Your latest live and closed listings" />
              {recentJobs.length ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {recentJobs.map((job) => {
                    const expired = isExpired(job.expires_at, job.status);
                    const appInfo = appStatsByJob.get(job.id);
                    const appCount = appInfo?.count || 0;
                    return (
                      <div key={job.id} style={jobCard}>
                        <div style={jobTopRow}>
                          <div>
                            <h3 style={jobTitleSmall}>{job.title}</h3>
                            <p style={jobMeta}>{job.role_type || "Role"} • {job.location || "Location not set"} {job.is_remote ? "• Remote" : "• On-site / Hybrid"}</p>
                          </div>
                          <span style={statusPill(expired ? "closed" : "open")}>{expired ? "Closed" : "Open"}</span>
                        </div>
                        <p style={jobDesc}>{job.description.length > 180 ? `${job.description.slice(0, 180)}...` : job.description}</p>
                        <div style={pillRow}>
                          <span style={pill}>{appCount} applications</span>
                          <span style={pill}>{job.task_required ? "Task required" : "No task"}</span>
                          <span style={pill}>{job.expires_at ? `Expires ${new Date(job.expires_at).toLocaleDateString()}` : "No expiry"}</span>
                          <span style={pill}>Last applicant: {formatDateTime(appInfo?.latest || null)}</span>
                        </div>
                        <div style={jobActions}>
                          <button type="button" style={secondaryBtnDark} onClick={() => openPublicJobPage(job.slug)}>View Public Page</button>
                          <button type="button" style={ghostBtn} onClick={() => copyJobLink(job.slug)}>Copy Job Link</button>
                          <button type="button" style={deleteBtn} onClick={() => deleteJob(job.id)}>Delete</button>
                          {/* Edit Job button */}
                          <button type="button" style={ghostBtn} onClick={() => editJob(job.id)}>Edit</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No jobs yet" text="Post your first job to start receiving skill-based applications." />
              )}
            </div>

            <div style={card}>
              <SectionHeader title="Recent applications" subtitle="Review resume, profile, and update candidate status" />
              {recentApplications.length ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {recentApplications.map((app) => {
                    const profile = getApplicantProfile(app);
                    return (
                      <div key={app.id} style={applicationCard}>
                        <div style={appTopRow}>
                          <div>
                            <h3 style={applicantName}>{app.applicant_name}</h3>
                            <p style={applicantMeta}>{app.job_title} • {app.applicant_email}{app.applicant_phone ? ` • ${app.applicant_phone}` : ""}</p>
                          </div>
                          <span style={statusPillForApplication(app.status)}>{app.status || "submitted"}</span>
                        </div>
                        {app.note && <p style={appNote}>{app.note}</p>}
                        <div style={appLinkBox}>
                          <button type="button" style={driveLink} onClick={() => handleOpenDrive(app)}>Open Google Drive</button>
                          <button type="button" style={copyLinkBtn} onClick={() => copyToClipboard(app.drive_link, "Drive link copied", "Failed to copy drive link")}>Copy Drive Link</button>
                          <button type="button" style={viewProfileBtn} onClick={() => openApplicantProfile(app)}>View Profile</button>
                          <button type="button" style={viewProfileBtn} onClick={() => openEmailComposer(app.applicant_email)}>Email Applicant</button>
                          <button type="button" style={resumeBtn} onClick={() => handleOpenResume(app)} disabled={!app.resume_link}>View Resume</button>
                          {profile?.intro_video_url && (
                            <button type="button" style={viewProfileBtn} onClick={() => window.open(profile.intro_video_url!, "_blank")}>🎥 Video Intro</button>
                          )}
                        </div>
                        <div style={actionRow}>
                          <button type="button" style={statusBtn} onClick={() => setSelectedApplication(app)}>View Details</button>
                          <button type="button" style={statusBtn} onClick={() => updateApplicationStatus(app.id, "reviewed")}>Reviewed</button>
                          <button type="button" style={statusBtn} onClick={() => updateApplicationStatus(app.id, "shortlisted")}>Shortlist</button>
                          <button type="button" style={dangerBtn} onClick={() => updateApplicationStatus(app.id, "rejected")}>Reject</button>
                          <button type="button" style={deleteBtn} onClick={() => deleteApplication(app.id)}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No applications yet" text="Candidate responses will appear here after they submit their Drive links." />
              )}
            </div>
          </section>

          <aside style={sideColumn}>
            <div style={card}>
              <SectionHeader title="Hiring summary" subtitle="Quick snapshot" />
              <Detail label="Company" value={company?.company_name || "—"} />
              <Detail label="Industry" value={company?.industry || "—"} />
              <Detail label="Location" value={company?.location || "—"} />
              <Detail label="Phone" value={company?.phone || "—"} />
              <Detail label="Username" value={company?.username || "—"} />
            </div>
            <div style={card}>
              <SectionHeader title="Your process" subtitle="Skill-first hiring flow" />
              <div style={guideStack}>
                <GuideStep index="01" text="Review the task submission carefully." />
                <GuideStep index="02" text="Check resume, notes, and Drive folder." />
                <GuideStep index="03" text="Shortlist or reject based on skill proof." />
                <GuideStep index="04" text="Delete stale applications if needed." />
              </div>
            </div>
            <div style={card}>
              <SectionHeader title="Fast actions" subtitle="Move quickly" />
              <div style={{ display: "grid", gap: 10 }}>
                <button type="button" style={primaryBtnFull} onClick={() => router.push("/company/jobs/new")}>Post New Job</button>
                <button type="button" style={secondaryBtnFull} onClick={openPublicCompanyPage}>View Public Profile</button>
                <button type="button" style={secondaryBtnFull} onClick={() => router.push("/jobs")}>Browse Public Jobs</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === "jobs" && (
        <div style={singleColumn}>
          <div style={card}>
            <SectionHeader title="All jobs" subtitle="Manage every listing from here" />
            {filteredJobs.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {filteredJobs.map((job) => {
                  const expired = isExpired(job.expires_at, job.status);
                  const appInfo = appStatsByJob.get(job.id);
                  const appCount = appInfo?.count || 0;
                  return (
                    <div key={job.id} style={jobCard}>
                      <div style={jobTopRow}>
                        <div>
                          <h3 style={jobTitleSmall}>{job.title}</h3>
                          <p style={jobMeta}>{job.role_type || "Role"} • {job.location || "Location not set"} {job.is_remote ? "• Remote" : "• On-site / Hybrid"}</p>
                        </div>
                        <span style={statusPill(expired ? "closed" : "open")}>{expired ? "Closed" : "Open"}</span>
                      </div>
                      <p style={jobDesc}>{job.description.length > 180 ? `${job.description.slice(0, 180)}...` : job.description}</p>
                      <div style={pillRow}>
                        <span style={pill}>{appCount} applications</span>
                        <span style={pill}>{job.task_required ? "Task required" : "No task"}</span>
                        <span style={pill}>{job.expires_at ? `Expires ${new Date(job.expires_at).toLocaleDateString()}` : "No expiry"}</span>
                        <span style={pill}>Last applicant: {formatDateTime(appInfo?.latest || null)}</span>
                      </div>
                      <div style={jobActions}>
                        <button type="button" style={secondaryBtnDark} onClick={() => openPublicJobPage(job.slug)}>View Public Page</button>
                        <button type="button" style={ghostBtn} onClick={() => copyJobLink(job.slug)}>Copy Job Link</button>
                        <button type="button" style={deleteBtn} onClick={() => deleteJob(job.id)}>Delete</button>
                        <button type="button" style={ghostBtn} onClick={() => editJob(job.id)}>Edit</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No matching jobs" text="Try another search term or post a new job." />
            )}
          </div>
        </div>
      )}

      {tab === "applications" && (
        <div style={singleColumn}>
          <div style={card}>
            <SectionHeader title="All applications" subtitle="Review resume, profile, shortlist candidates, and manage hiring" />
            {filteredApplications.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {filteredApplications.map((app) => {
                  const profile = getApplicantProfile(app);
                  return (
                    <div key={app.id} style={applicationCard}>
                      <div style={appTopRow}>
                        <div>
                          <h3 style={applicantName}>{app.applicant_name}</h3>
                          <p style={applicantMeta}>{app.job_title} • {app.applicant_email}{app.applicant_phone ? ` • ${app.applicant_phone}` : ""}</p>
                        </div>
                        <span style={statusPillForApplication(app.status)}>{app.status || "submitted"}</span>
                      </div>
                      {app.note && <p style={appNote}>{app.note}</p>}
                      <div style={appLinkBox}>
                        <button type="button" style={driveLink} onClick={() => handleOpenDrive(app)}>Open Google Drive</button>
                        <button type="button" style={copyLinkBtn} onClick={() => copyToClipboard(app.drive_link, "Drive link copied", "Failed to copy drive link")}>Copy Drive Link</button>
                        <button type="button" style={viewProfileBtn} onClick={() => openApplicantProfile(app)}>View Profile</button>
                        <button type="button" style={viewProfileBtn} onClick={() => openEmailComposer(app.applicant_email)}>Email Applicant</button>
                        <button type="button" style={resumeBtn} onClick={() => handleOpenResume(app)} disabled={!app.resume_link}>View Resume</button>
                        {profile?.intro_video_url && (
                          <button type="button" style={viewProfileBtn} onClick={() => window.open(profile.intro_video_url!, "_blank")}>🎥 Video Intro</button>
                        )}
                      </div>
                      <div style={actionRow}>
                        <button type="button" style={statusBtn} onClick={() => setSelectedApplication(app)}>View Details</button>
                        <button type="button" style={statusBtn} onClick={() => updateApplicationStatus(app.id, "reviewed")}>Reviewed</button>
                        <button type="button" style={statusBtn} onClick={() => updateApplicationStatus(app.id, "shortlisted")}>Shortlist</button>
                        <button type="button" style={dangerBtn} onClick={() => updateApplicationStatus(app.id, "rejected")}>Reject</button>
                        <button type="button" style={deleteBtn} onClick={() => deleteApplication(app.id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No applications found" text="As candidates submit their Drive links, they will appear here." />
            )}
          </div>
        </div>
      )}

      {selectedApplication && (
        <div style={modalOverlay} onClick={() => setSelectedApplication(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <p style={modalEyebrow}>Candidate detail</p>
                <h2 style={modalTitle}>{selectedApplication.applicant_name}</h2>
                <p style={modalSub}>{selectedApplication.applicant_email}{selectedApplication.applicant_phone ? ` • ${selectedApplication.applicant_phone}` : ""}</p>
              </div>
              <button type="button" style={modalCloseBtn} onClick={() => setSelectedApplication(null)}>✕</button>
            </div>
            <div style={modalGrid}>
              <div style={modalSection}>
                <SectionHeader title="Submission" subtitle="Review the candidate's work" />
                <div style={modalInfoBox}>
                  <InfoRow label="Status" value={selectedApplication.status || "submitted"} />
                  <InfoRow label="Applied at" value={formatDateTime(selectedApplication.created_at)} />
                  <InfoRow label="Job" value={selectedApplication.job_title || "—"} />
                  <InfoRow label="Drive" value="Google Drive submission" />
                </div>
                <div style={modalButtonRow}>
                  <button type="button" style={driveLink} onClick={() => handleOpenDrive(selectedApplication)}>Open Google Drive</button>
                  <button type="button" style={copyLinkBtn} onClick={() => copyToClipboard(selectedApplication.drive_link, "Drive link copied", "Failed to copy drive link")}>Copy Drive Link</button>
                  <button type="button" style={viewProfileBtn} onClick={() => openApplicantProfile(selectedApplication)}>View Profile</button>
                  <button type="button" style={viewProfileBtn} onClick={() => openEmailComposer(selectedApplication.applicant_email)}>Email Applicant</button>
                  <button type="button" style={resumeBtn} onClick={() => handleOpenResume(selectedApplication)} disabled={!selectedApplication.resume_link}>View Resume</button>
                  {(() => {
                    const profile = getApplicantProfile(selectedApplication);
                    return profile?.intro_video_url ? (
                      <button type="button" style={viewProfileBtn} onClick={() => window.open(profile.intro_video_url!, "_blank")}>🎥 Video Intro</button>
                    ) : null;
                  })()}
                </div>
                {selectedApplication.note && (
                  <div style={modalNoteBox}>
                    <strong style={{ color: "#0f172a" }}>Candidate note</strong>
                    <p style={modalNoteText}>{selectedApplication.note}</p>
                  </div>
                )}
              </div>
              <div style={modalSection}>
                <SectionHeader title="Actions" subtitle="Update the candidate stage" />
                <div style={modalActionStack}>
                  <button type="button" style={statusBtnWide} onClick={() => updateApplicationStatus(selectedApplication.id, "reviewed")}>Mark Reviewed</button>
                  <button type="button" style={statusBtnWide} onClick={() => updateApplicationStatus(selectedApplication.id, "shortlisted")}>Shortlist Candidate</button>
                  <button type="button" style={dangerBtnWide} onClick={() => updateApplicationStatus(selectedApplication.id, "rejected")}>Reject Candidate</button>
                  <button type="button" style={deleteBtnWide} onClick={() => deleteApplication(selectedApplication.id)}>Delete Application</button>
                </div>
                <div style={modalProfileBox}>
                  <SectionHeader title="Public profile" subtitle="Open the candidate's profile if available" />
                  {(() => {
                    const profile = getApplicantProfile(selectedApplication);
                    if (profile?.username) {
                      return (
                        <>
                          <p style={profileLine}>/profile/<strong>{profile.username}</strong></p>
                          <p style={profileLine}>{profile.full_name || profile.name || "Name not set"}</p>
                          <p style={profileLine}>{profile.headline || "No headline added"}</p>
                          {profile.profession && <p style={profileLine}>Profession: {profile.profession}</p>}
                          {profile.languages && profile.languages.length > 0 && (
                            <p style={profileLine}>Languages: {profile.languages.join(", ")}</p>
                          )}
                          {profile.intro_video_url && (
                            <p style={profileLine}>
                              Video Intro: <a href={profile.intro_video_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>Watch</a>
                            </p>
                          )}
                          <button type="button" style={primaryBtnDark} onClick={() => openApplicantProfile(selectedApplication)}>Open Public Profile</button>
                        </>
                      );
                    }
                    return (
                      <>
                        <p style={mutedText}>No public profile username is linked for this applicant yet.</p>
                        <button type="button" style={secondaryBtnDark} onClick={() => openApplicantProfile(selectedApplication)}>Try Open Profile</button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={toastStyle(toast.type)}>{toast.message}</div>}
    </div>
  );
}

// Helper components (unchanged)
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>{label}</span>
      <span style={infoValue}>{value}</span>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={sectionTitle}>{title}</h2>
      {subtitle && <p style={sectionSubtitle}>{subtitle}</p>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailRow}>
      <span style={detailLabel}>{label}</span>
      <span style={detailValue}>{value}</span>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div style={emptyCard}>
      <h3 style={{ margin: 0, color: "#0f172a" }}>{title}</h3>
      <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} style={active ? tabBtnActive : tabBtn}>{label}</button>;
}

function GuideStep({ index, text }: { index: string; text: string }) {
  return (
    <div style={guideStep}>
      <div style={guideIndex}>{index}</div>
      <p style={guideText}>{text}</p>
    </div>
  );
}

function statusPillForApplication(status: string | null): React.CSSProperties {
  if (status === "shortlisted") return { ...statusPill("open"), background: "#dcfce7", color: "#166534" };
  if (status === "reviewed") return { ...statusPill("open"), background: "#dbeafe", color: "#1d4ed8" };
  if (status === "rejected") return { ...statusPill("closed"), background: "#fee2e2", color: "#991b1b" };
  return { ...statusPill("closed"), background: "#fef3c7", color: "#92400e" };
}

// Styles (unchanged from original – only new style for the Video Intro button already uses existing viewProfileBtn)
const pageShell: CSSProperties = { maxWidth: 1380, margin: "0 auto", padding: 20, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" };
const loadingCard: CSSProperties = { background: "white", borderRadius: 24, padding: 40, textAlign: "center", boxShadow: "0 10px 30px rgba(2,6,23,0.06)" };
const heroCard: CSSProperties = { borderRadius: 28, overflow: "hidden", boxShadow: "0 20px 50px rgba(2,6,23,0.18)", marginBottom: 18, backgroundSize: "cover", backgroundPosition: "center" };
const heroOverlay: CSSProperties = { padding: 24, background: "rgba(2,6,23,0.35)", backdropFilter: "blur(10px)" };
const heroTop: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const brandBlock: CSSProperties = { display: "flex", alignItems: "center", gap: 16, minWidth: 360, flex: 1 };
const brandLogo: CSSProperties = { width: 72, height: 72, borderRadius: 20, overflow: "hidden", background: "rgba(255,255,255,0.12)", flexShrink: 0, boxShadow: "0 10px 30px rgba(0,0,0,0.18)" };
const brandLogoImg: CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const brandFallback: CSSProperties = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg, #475569, #0f172a)" };
const eyebrow: CSSProperties = { margin: 0, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, fontWeight: 800 };
const pageTitle: CSSProperties = { margin: "8px 0 0", fontSize: 36, color: "white", fontWeight: 800, letterSpacing: "-0.04em" };
const pageSubtitle: CSSProperties = { margin: "10px 0 0", color: "#dbeafe", lineHeight: 1.7, maxWidth: 900 };
const heroActions: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" };
const primaryBtnLight: CSSProperties = { background: "#2563eb", color: "white", border: "none", padding: "12px 16px", borderRadius: 14, cursor: "pointer", fontWeight: 800, boxShadow: "0 10px 25px rgba(37,99,235,0.24)" };
const secondaryBtnLight: CSSProperties = { background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.18)", padding: "12px 16px", borderRadius: 14, cursor: "pointer", fontWeight: 800 };
const metaRow: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 };
const metaPill: CSSProperties = { background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.14)", padding: "8px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 };
const toolbar: CSSProperties = { display: "flex", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" };
const searchInput: CSSProperties = { flex: 1, minWidth: 280, border: "1px solid #dbe3ee", borderRadius: 14, padding: "12px 14px", outline: "none", fontSize: 14, background: "white", color: "#0f172a", boxSizing: "border-box" };
const tabRow: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const tabBtn: CSSProperties = { background: "white", border: "1px solid #e2e8f0", color: "#0f172a", padding: "11px 14px", borderRadius: 14, cursor: "pointer", fontWeight: 800 };
const tabBtnActive: CSSProperties = { background: "#0f172a", border: "1px solid #0f172a", color: "white", padding: "11px 14px", borderRadius: 14, cursor: "pointer", fontWeight: 800 };
const refreshBtn: CSSProperties = { background: "#2563eb", color: "white", border: "none", padding: "12px 16px", borderRadius: 14, cursor: "pointer", fontWeight: 800, boxShadow: "0 10px 25px rgba(37,99,235,0.20)" };
const overviewGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1.35fr 0.75fr", gap: 18, alignItems: "start" };
const mainColumn: CSSProperties = { display: "grid", gap: 18 };
const sideColumn: CSSProperties = { display: "grid", gap: 18 };
const singleColumn: CSSProperties = { display: "grid", gap: 18 };
const card: CSSProperties = { background: "white", borderRadius: 24, padding: 22, boxShadow: "0 10px 30px rgba(2,6,23,0.06)", border: "1px solid #eef2f7" };
const sectionTitle: CSSProperties = { margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" };
const sectionSubtitle: CSSProperties = { margin: "6px 0 0", color: "#64748b", lineHeight: 1.6 };
const jobCard: CSSProperties = { border: "1px solid #e8eef5", borderRadius: 20, padding: 18, background: "#fff", boxShadow: "0 8px 20px rgba(15,23,42,0.03)" };
const jobTopRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" };
const jobTitleSmall: CSSProperties = { margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" };
const jobMeta: CSSProperties = { margin: "6px 0 0", color: "#64748b", fontWeight: 700, fontSize: 13, lineHeight: 1.6 };
const jobDesc: CSSProperties = { margin: 0, color: "#475569", lineHeight: 1.75 };
const statusPill = (mode: "open" | "closed"): CSSProperties => ({ background: mode === "open" ? "#dcfce7" : "#fee2e2", color: mode === "open" ? "#166534" : "#991b1b", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" });
const pillRow: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 };
const pill: CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", color: "#0f172a", padding: "7px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 };
const jobActions: CSSProperties = { marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" };
const applicationCard: CSSProperties = { border: "1px solid #e8eef5", borderRadius: 20, padding: 18, background: "#fff", boxShadow: "0 8px 20px rgba(15,23,42,0.03)" };
const appTopRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" };
const applicantName: CSSProperties = { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 800 };
const applicantMeta: CSSProperties = { margin: "6px 0 0", color: "#64748b", fontWeight: 700, fontSize: 13, lineHeight: 1.6 };
const appNote: CSSProperties = { margin: 0, color: "#475569", lineHeight: 1.75 };
const appLinkBox: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 };
const driveLink: CSSProperties = { background: "#2563eb", color: "white", textDecoration: "none", padding: "10px 14px", borderRadius: 12, fontWeight: 800, border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const resumeBtn: CSSProperties = { background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const copyLinkBtn: CSSProperties = { background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const viewProfileBtn: CSSProperties = { background: "#eef2ff", color: "#3730a3", border: "1px solid #dbeafe", padding: "10px 14px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const actionRow: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 };
const statusBtn: CSSProperties = { background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const dangerBtn: CSSProperties = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const deleteBtn: CSSProperties = { background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", padding: "10px 14px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const detailRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px dashed #e5e7eb" };
const detailLabel: CSSProperties = { color: "#64748b", fontWeight: 700 };
const detailValue: CSSProperties = { color: "#0f172a", fontWeight: 700, textAlign: "right" };
const emptyCard: CSSProperties = { background: "#f8fafc", border: "1px dashed #dbe3ee", borderRadius: 18, padding: 24, textAlign: "center" };
const guideStack: CSSProperties = { display: "grid", gap: 10 };
const guideStep: CSSProperties = { display: "flex", gap: 12, alignItems: "flex-start", padding: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16 };
const guideIndex: CSSProperties = { width: 30, height: 30, borderRadius: 999, background: "#0f172a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 };
const guideText: CSSProperties = { margin: 0, color: "#334155", lineHeight: 1.7, fontWeight: 600 };
const toastStyle = (type: ToastType): CSSProperties => ({ position: "fixed", top: 18, right: 18, zIndex: 1400, background: type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#2563eb", color: "white", padding: "10px 14px", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.16)", fontWeight: 700 });
const modalOverlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.58)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modalCard: CSSProperties = { width: "min(1100px, 100%)", maxHeight: "90vh", overflowY: "auto", background: "white", borderRadius: 28, boxShadow: "0 30px 80px rgba(0,0,0,0.28)", padding: 22 };
const modalHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 18 };
const modalEyebrow: CSSProperties = { margin: 0, color: "#2563eb", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" };
const modalTitle: CSSProperties = { margin: "6px 0 0", fontSize: 28, fontWeight: 800, color: "#0f172a" };
const modalSub: CSSProperties = { margin: "8px 0 0", color: "#64748b", lineHeight: 1.6 };
const modalCloseBtn: CSSProperties = { width: 40, height: 40, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 800, color: "#0f172a" };
const modalGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18, alignItems: "start" };
const modalSection: CSSProperties = { background: "#fff", borderRadius: 24, border: "1px solid #eef2f7", padding: 18, boxShadow: "0 10px 30px rgba(2,6,23,0.04)" };
const modalInfoBox: CSSProperties = { display: "grid", gap: 10 };
const modalButtonRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 };
const modalNoteBox: CSSProperties = { marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 };
const modalNoteText: CSSProperties = { margin: "8px 0 0", color: "#475569", lineHeight: 1.75 };
const modalActionStack: CSSProperties = { display: "grid", gap: 10 };
const statusBtnWide: CSSProperties = { width: "100%", background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", padding: "12px 14px", borderRadius: 14, fontWeight: 800, cursor: "pointer" };
const dangerBtnWide: CSSProperties = { width: "100%", background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 14, fontWeight: 800, cursor: "pointer" };
const deleteBtnWide: CSSProperties = { width: "100%", background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", padding: "12px 14px", borderRadius: 14, fontWeight: 800, cursor: "pointer" };
const modalProfileBox: CSSProperties = { marginTop: 16, borderRadius: 20, padding: 18, background: "#f8fafc", border: "1px solid #e2e8f0" };
const profileLine: CSSProperties = { margin: "0 0 8px", color: "#334155", lineHeight: 1.7 };
const mutedText: CSSProperties = { margin: 0, color: "#64748b" };
const secondaryBtnDark: CSSProperties = { background: "#0f172a", color: "white", border: "none", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 800 };
const ghostBtn: CSSProperties = { background: "transparent", color: "#0f172a", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 800 };
const primaryBtnFull: CSSProperties = { background: "#2563eb", color: "white", border: "none", padding: "12px 16px", borderRadius: 14, cursor: "pointer", fontWeight: 800, textAlign: "center" };
const secondaryBtnFull: CSSProperties = { background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: 14, cursor: "pointer", fontWeight: 800, textAlign: "center" };
const primaryBtnDark: CSSProperties = { background: "#0f172a", color: "white", border: "none", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 800 };
const infoRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #eef2f5" };
const infoLabel: CSSProperties = { color: "#475569", fontWeight: 700 };
const infoValue: CSSProperties = { color: "#0f172a", fontWeight: 600, textAlign: "right" };