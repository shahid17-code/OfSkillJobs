"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getTierFromPoints, getTierColor } from "@/lib/tiers";

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
  deleted_at?: string | null;
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
  capsule_ids?: string[] | null;
};

type ApplicationItem = JobApplication & {
  job_title: string;
  job_slug: string;
  job_status: string | null;
  job_expires_at: string | null;
  job_deleted?: boolean;
  capsules?: { id: string; title: string; link_url?: string | null }[];
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
  total_points?: number;
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
  const [allJobsRaw, setAllJobsRaw] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [applicantProfiles, setApplicantProfiles] = useState<Record<string, ApplicantProfile>>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ViewTab>("overview");
  const [selectedApplication, setSelectedApplication] = useState<ApplicationItem | null>(null);
  const [filterJobId, setFilterJobId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    loadDashboard();
    return () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); };
  }, []);

  function showToast(message: string, type: ToastType = "info", duration = 2800) {
    setToast({ message, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), duration);
  }

  function copyToClipboard(value: string, okMessage: string, failMessage: string) {
    if (!value) { showToast(failMessage, "error"); return; }
    navigator.clipboard.writeText(value).then(
      () => showToast(okMessage, "success"),
      () => showToast(failMessage, "error")
    );
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setFilterJobId(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: companyData, error: companyError } = await supabase
        .from("users").select("id, company_name, username, industry, location, phone, logo_url, cover_url")
        .eq("id", user.id).maybeSingle();
      if (companyError) { showToast("Failed to load company profile", "error"); return; }
      if (!companyData) { showToast("Company profile not found", "error"); return; }
      setCompany(companyData as Company);

      const { data: jobRows, error: jobError } = await supabase
        .from("jobs").select("*").eq("company_id", user.id).order("created_at", { ascending: false });
      if (jobError) { showToast("Failed to load jobs", "error"); setAllJobsRaw([]); }
      else setAllJobsRaw((jobRows || []) as Job[]);

      const jobIds = (jobRows || []).map((job: Job) => job.id);
      if (!jobIds.length) { setApplications([]); setApplicantProfiles({}); return; }

      const { data: appRows, error: appError } = await supabase
        .from("job_applications").select("*").in("job_id", jobIds).order("created_at", { ascending: false });
      if (appError) { showToast("Failed to load applications", "error"); setApplications([]); setApplicantProfiles({}); return; }

      const items = (appRows || []) as JobApplication[];
      
      const allCapsuleIds = items.flatMap(app => app.capsule_ids || []);
      let capsulesMap: Record<string, { id: string; title: string; link_url?: string | null }> = {};
      if (allCapsuleIds.length) {
        const { data: capsules } = await supabase
          .from("skill_capsules")
          .select("id, title, link_url")
          .in("id", allCapsuleIds);
        if (capsules) {
          capsulesMap = capsules.reduce((acc, cap) => {
            acc[cap.id] = cap;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const mapped: ApplicationItem[] = items.map((app) => {
        const matchedJob = (jobRows as Job[]).find((job) => job.id === app.job_id);
        const capsuleList = (app.capsule_ids || []).map(id => capsulesMap[id]).filter(Boolean);
        return { 
          ...app, 
          job_title: matchedJob?.title || "Deleted job", 
          job_slug: matchedJob?.slug || "", 
          job_status: matchedJob?.status || null, 
          job_expires_at: matchedJob?.expires_at || null, 
          job_deleted: !!matchedJob?.deleted_at,
          capsules: capsuleList,
        };
      });
      setApplications(mapped);

      const profileMap: Record<string, ApplicantProfile> = {};
      const ids = Array.from(new Set(items.map(a => a.applicant_id?.trim()).filter((v): v is string => Boolean(v))));
      if (ids.length) {
        const { data: usersById } = await supabase.from("users")
          .select("id, email, username, full_name, name, headline, location, role, avatar_url, profession, languages, intro_video_url, total_points")
          .in("id", ids);
        (usersById || []).forEach((u: any) => {
          const p: ApplicantProfile = { 
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
            total_points: u.total_points || 0,
          };
          if (p.id) profileMap[p.id] = p;
          if (p.email) profileMap[p.email.toLowerCase()] = p;
        });
      }
      const missingEmails = Array.from(new Set(items.map(a => a.applicant_email.trim().toLowerCase()).filter(e => e && !profileMap[e])));
      if (missingEmails.length) {
        const { data: usersByEmail } = await supabase.from("users")
          .select("id, email, username, full_name, name, headline, location, role, avatar_url, profession, languages, intro_video_url, total_points")
          .in("email", missingEmails);
        (usersByEmail || []).forEach((u: any) => {
          const p: ApplicantProfile = { 
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
            total_points: u.total_points || 0,
          };
          if (p.id) profileMap[p.id] = p;
          if (p.email) profileMap[p.email.toLowerCase()] = p;
        });
      }
      setApplicantProfiles(profileMap);
    } catch (err) { console.error(err); showToast("Something went wrong", "error"); }
    finally { setLoading(false); }
  }

  async function deleteJob(jobId: string) {
    if (!window.confirm("Delete this job permanently? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (error) {
        console.error("Delete job error:", error);
        showToast("Failed to delete job — " + (error.message || "unknown error"), "error");
        return;
      }
      setAllJobsRaw(prev => prev.filter(j => j.id !== jobId));
      setApplications(prev => prev.filter(a => a.job_id !== jobId));
      showToast("Job deleted successfully", "success");
    } catch (err) {
      console.error("Unexpected delete error:", err);
      showToast("Something went wrong while deleting", "error");
    }
  }

  function editJob(jobId: string) { router.push(`/company/jobs/edit/${jobId}`); }

  async function deleteApplication(applicationId: string) {
    if (!window.confirm("Delete this application permanently?")) return;
    try {
      setSavingStatusId(applicationId);
      const { error } = await supabase.from("job_applications").delete().eq("id", applicationId);
      if (error) { showToast("Failed to delete application", "error"); return; }
      setApplications(prev => prev.filter(a => a.id !== applicationId));
      setSelectedApplication(prev => prev?.id === applicationId ? null : prev);
      showToast("Application deleted", "success");
    } catch { showToast("Something went wrong", "error"); }
    finally { setSavingStatusId(null); }
  }

  async function updateApplicationStatus(applicationId: string, newStatus: string) {
    try {
      setSavingStatusId(applicationId);
      const { error } = await supabase.from("job_applications").update({ status: newStatus }).eq("id", applicationId);
      if (error) { showToast("Failed to update status", "error"); return; }
      setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, status: newStatus } : a));
      setSelectedApplication(prev => prev?.id === applicationId ? { ...prev, status: newStatus } : prev);
      showToast("Status updated", "success");
    } catch { showToast("Something went wrong", "error"); }
    finally { setSavingStatusId(null); }
  }

  function getApplicantProfile(app: ApplicationItem): ApplicantProfile | null {
    const emailKey = app.applicant_email.trim().toLowerCase();
    const idKey = app.applicant_id?.trim() || "";
    return applicantProfiles[idKey] || applicantProfiles[emailKey] || null;
  }

  async function handleOpenDrive(app: ApplicationItem) {
    if (!app.drive_opened_at) {
      await supabase.from("job_applications").update({ drive_opened_at: new Date().toISOString() }).eq("id", app.id);
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, drive_opened_at: new Date().toISOString() } : a));
    }
    window.open(normalizeUrl(app.drive_link), "_blank", "noopener,noreferrer");
  }

  async function handleOpenResume(app: ApplicationItem) {
    if (!app.resume_link) { showToast("Resume not available", "error"); return; }
    if (!app.resume_opened_at) {
      await supabase.from("job_applications").update({ resume_opened_at: new Date().toISOString() }).eq("id", app.id);
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, resume_opened_at: new Date().toISOString() } : a));
    }
    window.open(normalizeUrl(app.resume_link), "_blank", "noopener,noreferrer");
  }

  async function openApplicantProfile(app: ApplicationItem) {
    if (!app.profile_viewed_at) {
      await supabase.from("job_applications").update({ profile_viewed_at: new Date().toISOString() }).eq("id", app.id);
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, profile_viewed_at: new Date().toISOString() } : a));
    }
    if (app.applicant_id) { router.push(`/candidate/${app.applicant_id}`); return; }
    if (app.applicant_email) {
      const { data } = await supabase.from("users").select("id").ilike("email", app.applicant_email).maybeSingle();
      if (data?.id) { await supabase.from("job_applications").update({ applicant_id: data.id }).eq("id", app.id); router.push(`/candidate/${data.id}`); return; }
    }
    showToast(`Account for ${app.applicant_name} no longer exists.`, "error");
  }

  function openEmailComposer(email: string) {
    if (!email.trim()) { showToast("Applicant email not found", "error"); return; }
    const win = window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email.trim())}`, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = `mailto:${email.trim()}`;
  }

  function openCall(phone: string) { if (phone) window.location.href = `tel:${phone}`; }

  function openPublicJobPage(slug: string) {
    if (!slug) { showToast("Job link not available", "error"); return; }
    router.push(`/jobs/${slug}`);
  }

  function openPublicCompanyPage() {
    if (company?.username) { router.push(`/company/${company.username}`); return; }
    showToast("Please set a username in your company profile", "error");
    router.push("/company/profile/edit");
  }

  function shareVia(platform: "twitter" | "linkedin" | "whatsapp" | "facebook" | "email") {
    if (!company?.username) return;
    const url = `${window.location.origin}/company/${company.username}`;
    const text = `Check out ${company.company_name || "our company"} on OfSkillJob – Show Skills. Get Hired.`;
    const map: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      email: `mailto:?subject=${encodeURIComponent(`Join ${company.company_name} on OfSkillJob`)}&body=${encodeURIComponent(text + "\n" + url)}`,
    };
    window.open(map[platform], "_blank", "noopener,noreferrer");
    setShowShareModal(false);
  }

  const activeJobs = useMemo(() => allJobsRaw.filter(j => !j.deleted_at), [allJobsRaw]);
  const deletedJobsCount = useMemo(() => allJobsRaw.filter(j => j.deleted_at).length, [allJobsRaw]);

  const appStatsByJob = useMemo(() => {
    const map = new Map<string, { count: number; latest: string | null; pending: number; shortlisted: number; reviewed: number; rejected: number }>();
    for (const job of activeJobs) map.set(job.id, { count: 0, latest: null, pending: 0, shortlisted: 0, reviewed: 0, rejected: 0 });
    for (const app of applications) {
      const cur = map.get(app.job_id) || { count: 0, latest: null, pending: 0, shortlisted: 0, reviewed: 0, rejected: 0 };
      cur.count += 1;
      if (!cur.latest || (app.created_at && new Date(app.created_at) > new Date(cur.latest))) cur.latest = app.created_at;
      const s = app.status || "submitted";
      if (s === "submitted") cur.pending += 1;
      if (s === "reviewed") cur.reviewed += 1;
      if (s === "shortlisted") cur.shortlisted += 1;
      if (s === "rejected") cur.rejected += 1;
      map.set(app.job_id, cur);
    }
    return map;
  }, [activeJobs, applications]);

  const stats = useMemo(() => ({
    totalJobs: activeJobs.length,
    activeJobs: activeJobs.filter(j => !isExpired(j.expires_at, j.status)).length,
    deletedJobs: deletedJobsCount,
    totalApplications: applications.length,
    pendingApplications: applications.filter(a => (a.status || "submitted") === "submitted").length,
    shortlistedApplications: applications.filter(a => a.status === "shortlisted").length,
  }), [activeJobs, applications, deletedJobsCount]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeJobs;
    return activeJobs.filter(j => [j.title, j.role_type, j.location, j.description, j.task_title, j.status].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [activeJobs, search]);

  const filteredApplications = useMemo(() => {
    let apps = filterJobId ? applications.filter(a => a.job_id === filterJobId) : applications;
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(a => [a.applicant_name, a.applicant_email, a.applicant_phone, a.job_title, a.note, a.status, a.drive_link, a.resume_link].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [applications, search, filterJobId]);

  const recentJobs = filteredJobs.slice(0, 4);
  const recentApplications = filteredApplications.slice(0, 6);

  function viewJobApplications(jobId: string) { setFilterJobId(jobId); setTab("applications"); }
  function clearJobFilter() { setFilterJobId(null); }

  if (loading) {
    return (
      <div style={pageShell}>
        <div style={loadingCard}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", border: "4px solid #dbe3ee", borderTopColor: "#2563eb", margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ margin: 0, color: "#475569", fontWeight: 700 }}>Loading your hiring dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Application card ──────────────────────────────────
  function renderApplicationCard(app: ApplicationItem) {
    const profile = getApplicantProfile(app);
    const tier = profile?.total_points !== undefined ? getTierFromPoints(profile.total_points) : null;
    // ✅ FIX: fallback color if tierColor is null
    const tierColor = tier ? getTierColor(tier) : "#64748b";
    const hasCapsules = app.capsules && app.capsules.length > 0;
    return (
      <div key={app.id} style={applicationCard}>
        <div style={appTopRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={applicantName}>{app.applicant_name}</h3>
              {tier && (
                <span style={{
                  background: tierColor + "20",
                  color: tierColor,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  lineHeight: 1.3,
                }}>
                  {tier}
                </span>
              )}
            </div>
            <p style={applicantMeta}>
              <span style={jobTagPill}>{app.job_title}</span>
              {" "}{app.applicant_email}
              {app.applicant_phone ? ` · ${app.applicant_phone}` : ""}
            </p>
          </div>
          <span style={statusPillForApplication(app.status)}>{app.status || "submitted"}</span>
        </div>
        {hasCapsules && (
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {app.capsules!.map(cap => (
              <span key={cap.id} style={pillSmall}>
                📦 {cap.title}
                {cap.link_url && (
                  <a href={normalizeUrl(cap.link_url)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6, color: "#2563eb", textDecoration: "none" }}>🔗</a>
                )}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {app.drive_opened_at && <span style={trackerBadge("blue")}>📂 Drive viewed</span>}
          {app.resume_opened_at && <span style={trackerBadge("green")}>📄 Resume viewed</span>}
          {app.profile_viewed_at && <span style={trackerBadge("purple")}>👤 Profile viewed</span>}
        </div>
        {app.note && <p style={appNote}>💬 {app.note}</p>}
        <div style={appLinkBox} className="cd-app-links">
          <button type="button" style={driveBtn} onClick={() => handleOpenDrive(app)}>📂 Open Drive</button>
          <button type="button" style={copyLinkBtn} onClick={() => copyToClipboard(app.drive_link, "Drive link copied!", "Nothing to copy")}>📋 Copy Drive</button>
          <button type="button" style={viewProfileBtn} onClick={() => openApplicantProfile(app)}>👤 Profile</button>
          <button type="button" style={viewProfileBtn} onClick={() => openEmailComposer(app.applicant_email)}>✉️ Email</button>
          {app.applicant_phone && <button type="button" style={callBtn} onClick={() => openCall(app.applicant_phone!)}>📞 Call</button>}
          <button type="button" style={resumeBtn} onClick={() => handleOpenResume(app)} disabled={!app.resume_link}>📄 Resume</button>
          {profile?.intro_video_url && <button type="button" style={videoBtn} onClick={() => window.open(profile.intro_video_url!, "_blank")}>🎥 Video</button>}
        </div>
        <div style={actionRow} className="cd-action-row">
          <button type="button" style={statusBtn} onClick={() => setSelectedApplication(app)}>🔍 Details</button>
          <button type="button" style={reviewedBtn} onClick={() => updateApplicationStatus(app.id, "reviewed")}>✓ Reviewed</button>
          <button type="button" style={shortlistBtn} onClick={() => updateApplicationStatus(app.id, "shortlisted")}>⭐ Shortlist</button>
          <button type="button" style={dangerBtn} onClick={() => updateApplicationStatus(app.id, "rejected")}>✗ Reject</button>
          <button type="button" style={deleteBtn} onClick={() => deleteApplication(app.id)}>🗑 Delete</button>
        </div>
      </div>
    );
  }

  // ── Job card ───────────────────────────────────────
  function renderJobCard(job: Job) {
    const expired = isExpired(job.expires_at, job.status);
    const appInfo = appStatsByJob.get(job.id);
    const appCount = appInfo?.count || 0;
    return (
      <div key={job.id} style={jobCard}>
        <div style={jobTopRow}>
          <div>
            <h3 style={jobTitleSmall}>{job.title}</h3>
            <p style={jobMeta}>{job.role_type || "Role"} · {job.location || "Location not set"} · {job.is_remote ? "Remote" : "On-site"}</p>
          </div>
          <span style={statusPill(expired ? "closed" : "open")}>{expired ? "Expired" : "Open"}</span>
        </div>
        <p style={jobDesc}>{job.description.length > 180 ? `${job.description.slice(0, 180)}…` : job.description}</p>
        <div style={pillRow}>
          <span style={pill}>{appCount} application{appCount !== 1 ? "s" : ""}</span>
          <span style={pill}>{job.task_required ? "✓ Task required" : "No task"}</span>
          <span style={pill}>{job.expires_at ? `Expires ${new Date(job.expires_at).toLocaleDateString()}` : "No expiry"}</span>
          {appInfo?.latest && <span style={pill}>Last: {formatDateTime(appInfo.latest)}</span>}
        </div>
        <div style={jobActions} className="cd-job-actions">
          <button type="button" style={secondaryBtnDark} onClick={() => openPublicJobPage(job.slug)}>🌐 Public Page</button>
          <button type="button" style={ghostBtn} onClick={() => viewJobApplications(job.id)}>📋 Applications ({appCount})</button>
          <button type="button" style={ghostBtn} onClick={() => editJob(job.id)}>✏️ Edit</button>
          <button type="button" style={deleteBtn} onClick={() => deleteJob(job.id)}>🗑 Delete</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        html, body, #__next { overflow-x: hidden !important; }
        * { box-sizing: border-box; }

        /* ══════════════════ MOBILE ══════════════════ */
        @media (max-width: 768px) {
          .cd-shell        { padding: 12px !important; }
          .cd-hero-overlay { padding: 14px 14px 18px !important; }
          .cd-hero-top     { flex-direction: column !important; gap: 14px !important; }
          .cd-brand-block  { min-width: 0 !important; width: 100% !important; gap: 12px !important; }
          .cd-page-title   { font-size: 22px !important; }

          .cd-hero-actions {
            width: 100% !important; display: grid !important;
            grid-template-columns: 1fr 1fr !important; gap: 8px !important;
          }
          .cd-hero-actions button { width: 100% !important; text-align: center !important; }

          /* Stats: 2-col grid */
          .cd-meta-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important; margin-top: 14px !important;
          }
          .cd-meta-pill {
            text-align: center !important; padding: 10px 6px !important;
            border-radius: 14px !important; font-size: 12px !important;
            white-space: normal !important;
          }

          .cd-toolbar { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .cd-search  { min-width: 0 !important; width: 100% !important; }

          .cd-tabs-wrap { display: flex !important; flex-direction: column !important; gap: 8px !important; width: 100% !important; }
          .cd-tabs {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 6px !important;
            width: 100% !important;
            overflow: visible !important;
          }
          .cd-tabs button {
            width: 100% !important;
            text-align: center !important;
            padding: 10px 6px !important;
            font-size: 12px !important;
            white-space: normal !important;
            line-height: 1.3 !important;
          }
          .cd-refresh { width: 100% !important; }

          .cd-overview-grid { grid-template-columns: 1fr !important; }

          .cd-job-actions {
            display: grid !important; grid-template-columns: 1fr 1fr !important;
            gap: 8px !important; margin-top: 12px !important;
          }
          .cd-job-actions button { width: 100% !important; text-align: center !important; }

          .cd-app-links {
            display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important;
          }
          .cd-app-links button { width: 100% !important; text-align: center !important; }

          .cd-action-row {
            display: grid !important; grid-template-columns: 1fr 1fr !important;
            gap: 8px !important; margin-top: 12px !important;
          }
          .cd-action-row button { width: 100% !important; text-align: center !important; }

          .cd-modal-card  { padding: 14px !important; border-radius: 20px !important; }
          .cd-modal-grid  { grid-template-columns: 1fr !important; }
          .cd-detail-row  { flex-direction: column !important; gap: 2px !important; }
          .cd-detail-value{ text-align: left !important; }
          .cd-cv-header   { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .cd-overview-grid { grid-template-columns: 1.1fr 0.9fr !important; }
        }
      `}</style>

      <div style={pageShell} className="cd-shell">

        {/* HERO */}
        <div style={heroCard}>
          <div style={heroOverlay} className="cd-hero-overlay">
            <div style={heroTop} className="cd-hero-top">
              <div style={brandBlock} className="cd-brand-block">
                <div style={brandLogo}>
                  {company?.logo_url
                    ? <img src={company.logo_url} alt={company?.company_name || "Company"} style={brandLogoImg} />
                    : <div style={brandFallback}>{(company?.company_name || "C").charAt(0).toUpperCase()}</div>}
                </div>
                <div>
                  <p style={eyebrow}>OfSkillJob · Company Dashboard</p>
                  <h1 style={pageTitle} className="cd-page-title">{company?.company_name || "Company Dashboard"}</h1>
                  <p style={pageSubtitle}>Manage listings, review skill-based applications, and hire with confidence.</p>
                </div>
              </div>
              <div style={heroActions} className="cd-hero-actions">
                <button type="button" style={secondaryBtnLight} onClick={() => setShowShareModal(true)}>📢 Share Profile</button>
                <button type="button" style={primaryBtnLight} onClick={() => router.push("/company/jobs/new")}>＋ Post a Job</button>
              </div>
            </div>
            <div style={metaRow} className="cd-meta-row">
              <span style={metaPill} className="cd-meta-pill">📋 Jobs: {stats.totalJobs}</span>
              <span style={metaPill} className="cd-meta-pill">✅ Active: {stats.activeJobs}</span>
              <span style={metaPill} className="cd-meta-pill">🗑️ Deleted: {stats.deletedJobs}</span>
              <span style={metaPill} className="cd-meta-pill">📥 Apps: {stats.totalApplications}</span>
              <span style={metaPill} className="cd-meta-pill">⏳ Pending: {stats.pendingApplications}</span>
              <span style={metaPill} className="cd-meta-pill">⭐ Shortlisted: {stats.shortlistedApplications}</span>
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div style={toolbar} className="cd-toolbar">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs, applicants, emails, drive links…" style={searchInput} className="cd-search" />
          <div className="cd-tabs-wrap" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={tabRow} className="cd-tabs">
              <button type="button" onClick={() => { setTab("overview"); setFilterJobId(null); }} style={tab === "overview" ? tabBtnActive : tabBtn}>Overview</button>
              <button type="button" onClick={() => { setTab("jobs"); setFilterJobId(null); }} style={tab === "jobs" ? tabBtnActive : tabBtn}>Jobs ({stats.totalJobs})</button>
              <button type="button" onClick={() => setTab("applications")} style={tab === "applications" ? tabBtnActive : tabBtn}>Applications ({stats.totalApplications})</button>
            </div>
            <button type="button" onClick={loadDashboard} style={refreshBtn} className="cd-refresh">↻ Refresh</button>
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div style={overviewGrid} className="cd-overview-grid">
            <section style={mainColumn}>
              <div style={card}>
                <SectionHeader title="Recent Jobs" subtitle="Your latest skill-based listings on OfSkillJob" />
                {recentJobs.length
                  ? <div style={{ display: "grid", gap: 14 }}>{recentJobs.map(renderJobCard)}</div>
                  : <EmptyState title="No jobs posted yet" text="Post your first skill-based job to start receiving applications." />}
              </div>
              <div style={card}>
                <SectionHeader title="Recent Applications" subtitle="Candidates who applied to your jobs on OfSkillJob" />
                {recentApplications.length
                  ? <div style={{ display: "grid", gap: 14 }}>{recentApplications.map(renderApplicationCard)}</div>
                  : <EmptyState title="No applications yet" text="Once candidates apply, their Drive submissions will appear here." />}
              </div>
            </section>
            <aside style={sideColumn}>
              <div style={card}>
                <SectionHeader title="Company Profile" subtitle="Your OfSkillJob presence" />
                <Detail label="Company" value={company?.company_name || "—"} />
                <Detail label="Industry" value={company?.industry || "—"} />
                <Detail label="Location" value={company?.location || "—"} />
                <Detail label="Phone" value={company?.phone || "—"} />
                <Detail label="Username" value={company?.username ? `@${company.username}` : "—"} />
                <div style={trustBadge}>✔ No hidden fees · Manual review · Skill-first hiring · Encrypted data</div>
              </div>
              <div style={card}>
                <SectionHeader title="Hiring Workflow" subtitle="How OfSkillJob works for employers" />
                <div style={guideStack}>
                  <GuideStep index="01" text="Post a job with a clear skill task for candidates." />
                  <GuideStep index="02" text="Candidates submit Drive links, resume, and notes." />
                  <GuideStep index="03" text="Review task output — not just CVs or credentials." />
                  <GuideStep index="04" text="Shortlist the best. Reject or delete the rest." />
                </div>
                <div style={tipBox}>💡 Use "Applications (N)" on a job card to filter by that role.</div>
              </div>
              <div style={card}>
                <SectionHeader title="Quick Actions" subtitle="Manage your hiring fast" />
                <div style={{ display: "grid", gap: 10 }}>
                  <button type="button" style={primaryBtnFull} onClick={() => router.push("/company/jobs/new")}>＋ Post New Job</button>
                  <button type="button" style={secondaryBtnFull} onClick={openPublicCompanyPage}>🌐 View Public Profile</button>
                  <button type="button" style={secondaryBtnFull} onClick={() => router.push("/company/profile/edit")}>✏️ Edit Company Profile</button>
                  <button type="button" style={secondaryBtnFull} onClick={() => { setFilterJobId(null); setTab("applications"); }}>📥 All Applications</button>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* JOBS TAB */}
        {tab === "jobs" && (
          <div style={singleColumn}>
            <div style={card}>
              <SectionHeader title="All Jobs" subtitle="Edit, manage, or delete any of your listings" />
              {filteredJobs.length
                ? <div style={{ display: "grid", gap: 14 }}>{filteredJobs.map(renderJobCard)}</div>
                : <EmptyState title="No matching jobs" text="Try a different search term or post a new job." />}
            </div>
          </div>
        )}

        {/* APPLICATIONS TAB */}
        {tab === "applications" && (
          <div style={singleColumn}>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <SectionHeader
                  title={filterJobId ? `Applications: ${activeJobs.find(j => j.id === filterJobId)?.title || "Job"}` : "All Applications"}
                  subtitle="Review Drive submissions, resumes, and update candidate status"
                />
                {filterJobId && <button type="button" style={clearFilterBtn} onClick={clearJobFilter}>✕ Show all</button>}
              </div>
              {filteredApplications.length
                ? <div style={{ display: "grid", gap: 14 }}>{filteredApplications.map(renderApplicationCard)}</div>
                : <EmptyState title="No applications found" text={filterJobId ? "No applications for this job yet." : "Candidates will appear here once they apply."} />}
            </div>
          </div>
        )}

        {/* SHARE MODAL */}
        {showShareModal && (
          <div style={modalOverlay} onClick={() => setShowShareModal(false)}>
            <div style={{ ...modalCard, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900, color: "#0f172a" }}>Share Your Profile</h3>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 14 }}>Let top talent know you're hiring on OfSkillJob.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(["twitter", "linkedin", "whatsapp", "facebook", "email"] as const).map((k) => (
                  <button key={k} style={shareBtn} onClick={() => shareVia(k)}>
                    {{ twitter: "🐦 Twitter / X", linkedin: "🔗 LinkedIn", whatsapp: "💬 WhatsApp", facebook: "📘 Facebook", email: "✉️ Email" }[k]}
                  </button>
                ))}
              </div>
              <button style={{ ...deleteBtn, marginTop: 14, width: "100%" }} onClick={() => setShowShareModal(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* CANDIDATE DETAIL MODAL */}
        {selectedApplication && (
          <div style={modalOverlay} onClick={() => setSelectedApplication(null)}>
            <div style={modalCard} className="cd-modal-card" onClick={e => e.stopPropagation()}>
              <div style={modalHeader}>
                <div>
                  <p style={modalEyebrow}>OfSkillJob · Candidate Review</p>
                  <h2 style={modalTitle}>{selectedApplication.applicant_name}</h2>
                  <p style={modalSub}>{selectedApplication.applicant_email}{selectedApplication.applicant_phone ? ` · ${selectedApplication.applicant_phone}` : ""}</p>
                </div>
                <button type="button" style={modalCloseBtn} onClick={() => setSelectedApplication(null)}>✕</button>
              </div>

              <div style={modalGrid} className="cd-modal-grid">
                <div style={{ display: "grid", gap: 16 }}>
                  {(() => {
                    const profile = getApplicantProfile(selectedApplication);
                    const displayName = profile?.full_name || profile?.name || selectedApplication.applicant_name;
                    const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                    const capsules = selectedApplication.capsules || [];
                    const tier = profile?.total_points !== undefined ? getTierFromPoints(profile.total_points) : null;
                    // ✅ FIX: fallback color
                    const tierColor = tier ? getTierColor(tier) : "#64748b";
                    return (
                      <div style={cvCard}>

                        {/* Banner + Avatar */}
                        <div style={cvBanner}>
                          <div style={cvAvatarRing}>
                            {profile?.avatar_url
                              ? <img src={profile.avatar_url} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                              : <span style={{ fontSize: 30, fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>{initials}</span>}
                          </div>
                        </div>

                        {/* Identity block */}
                        <div style={cvIdentity} className="cd-cv-header">
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <h3 style={cvName}>{displayName}</h3>
                              {tier && (
                                <span style={{
                                  background: tierColor + "20",
                                  color: tierColor,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                }}>
                                  {tier}
                                </span>
                              )}
                            </div>
                            {profile?.headline && <p style={cvHeadline}>{profile.headline}</p>}
                            {profile?.profession && (
                              <span style={cvProfessionBadge}>{profile.profession}</span>
                            )}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                              {profile?.location && <span style={cvInfoChip}>📍 {profile.location}</span>}
                              {profile?.role && <span style={cvInfoChip}>🔖 {profile.role}</span>}
                              {selectedApplication.applicant_phone && <span style={cvInfoChip}>📞 {selectedApplication.applicant_phone}</span>}
                              <span style={cvInfoChip}>✉️ {selectedApplication.applicant_email}</span>
                            </div>
                          </div>
                          <span style={{ ...statusPillForApplication(selectedApplication.status), alignSelf: "flex-start", flexShrink: 0 }}>
                            {selectedApplication.status || "submitted"}
                          </span>
                        </div>

                        {/* SkillCapsules attached */}
                        {capsules.length > 0 && (
                          <div style={cvSectionBlock}>
                            <p style={cvSectionLabel}>📦 SkillCapsules attached</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {capsules.map(cap => (
                                <div key={cap.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span>▪️</span>
                                  <strong>{cap.title}</strong>
                                  {cap.link_url && (
                                    <a href={normalizeUrl(cap.link_url)} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none", fontSize: 12 }}>🔗 View</a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Languages */}
                        {profile?.languages && profile.languages.length > 0 && (
                          <div style={cvSectionBlock}>
                            <p style={cvSectionLabel}>🌐 Languages</p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {profile.languages.map(l => <span key={l} style={langPill}>{l}</span>)}
                            </div>
                          </div>
                        )}

                        {/* Application timeline */}
                        <div style={cvSectionBlock}>
                          <p style={cvSectionLabel}>📋 Application Details</p>
                          <div style={cvTimelineGrid}>
                            <CVRow icon="💼" label="Applied for" value={selectedApplication.job_title} />
                            <CVRow icon="📅" label="Submitted on" value={formatDateTime(selectedApplication.created_at)} />
                            <CVRow icon="📊" label="Current status" value={selectedApplication.status || "submitted"} />
                            {selectedApplication.drive_opened_at && <CVRow icon="📂" label="Drive opened" value={formatDateTime(selectedApplication.drive_opened_at)} />}
                            {selectedApplication.resume_opened_at && <CVRow icon="📄" label="Resume opened" value={formatDateTime(selectedApplication.resume_opened_at)} />}
                            {selectedApplication.profile_viewed_at && <CVRow icon="👤" label="Profile viewed" value={formatDateTime(selectedApplication.profile_viewed_at)} />}
                          </div>
                        </div>

                        {/* Note */}
                        {selectedApplication.note && (
                          <div style={cvNoteBox}>
                            <p style={cvSectionLabel}>💬 Candidate Note</p>
                            <p style={{ margin: 0, color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{selectedApplication.note}</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={cvActionsRow}>
                          <button type="button" style={driveBtn} onClick={() => handleOpenDrive(selectedApplication)}>📂 Open Drive</button>
                          <button type="button" style={copyLinkBtn} onClick={() => copyToClipboard(selectedApplication.drive_link, "Copied!", "Nothing to copy")}>📋 Copy</button>
                          <button type="button" style={resumeBtn} onClick={() => handleOpenResume(selectedApplication)} disabled={!selectedApplication.resume_link}>📄 Resume</button>
                          <button type="button" style={viewProfileBtn} onClick={() => openApplicantProfile(selectedApplication)}>🌐 Profile</button>
                          <button type="button" style={viewProfileBtn} onClick={() => openEmailComposer(selectedApplication.applicant_email)}>✉️ Email</button>
                          {selectedApplication.applicant_phone && <button type="button" style={callBtn} onClick={() => openCall(selectedApplication.applicant_phone!)}>📞 Call</button>}
                          {profile?.intro_video_url && <button type="button" style={videoBtn} onClick={() => window.open(profile.intro_video_url!, "_blank")}>🎥 Video</button>}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* RIGHT: actions + OfSkillJob profile */}
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={modalSection}>
                    <SectionHeader title="Update Status" subtitle="Move this candidate through your pipeline" />
                    <div style={modalActionStack}>
                      <button type="button" style={reviewedBtnWide} onClick={() => updateApplicationStatus(selectedApplication.id, "reviewed")}>✓ Mark as Reviewed</button>
                      <button type="button" style={shortlistBtnWide} onClick={() => updateApplicationStatus(selectedApplication.id, "shortlisted")}>⭐ Shortlist Candidate</button>
                      <button type="button" style={dangerBtnWide} onClick={() => updateApplicationStatus(selectedApplication.id, "rejected")}>✗ Reject Candidate</button>
                      <button type="button" style={deleteBtnWide} onClick={() => deleteApplication(selectedApplication.id)}>🗑 Delete Application</button>
                    </div>
                  </div>

                  <div style={modalSection}>
                    <SectionHeader title="OfSkillJob Profile" subtitle="Candidate's public page on OfSkillJob" />
                    {(() => {
                      const profile = getApplicantProfile(selectedApplication);
                      if (profile?.username) {
                        const tier = profile.total_points !== undefined ? getTierFromPoints(profile.total_points) : null;
                        // ✅ FIX: fallback color
                        const tierColor = tier ? getTierColor(tier) : "#64748b";
                        return (
                          <div style={cvProfileBox}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                              {profile.avatar_url
                                ? <img src={profile.avatar_url} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} alt="" />
                                : <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>{(profile.full_name || profile.name || "?").charAt(0).toUpperCase()}</div>}
                              <div>
                                <p style={{ margin: 0, fontWeight: 900, color: "#0f172a", fontSize: 15 }}>{profile.full_name || profile.name}</p>
                                <p style={{ margin: 0, color: "#2563eb", fontSize: 13, fontWeight: 700 }}>@{profile.username}</p>
                              </div>
                              {tier && (
                                <span style={{
                                  background: tierColor + "20",
                                  color: tierColor,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                  marginLeft: 4,
                                }}>
                                  {tier}
                                </span>
                              )}
                            </div>
                            {profile.headline && <p style={{ margin: "0 0 4px", color: "#475569", fontSize: 14 }}>{profile.headline}</p>}
                            {profile.profession && <p style={{ margin: "0 0 10px", color: "#0f172a", fontSize: 13, fontWeight: 700 }}>{profile.profession}</p>}
                            {profile.intro_video_url && (
                              <a href={profile.intro_video_url} target="_blank" rel="noreferrer"
                                style={{ ...videoBtn, display: "inline-flex", textDecoration: "none", marginBottom: 10 }}>🎥 Watch Video Intro</a>
                            )}
                            <br />
                            <button type="button" style={{ ...primaryBtnDark, marginTop: 8 }} onClick={() => openApplicantProfile(selectedApplication)}>Open Full Profile →</button>
                          </div>
                        );
                      }
                      return (
                        <div>
                          <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>This candidate hasn't linked an OfSkillJob profile yet. You can still try a lookup by email.</p>
                          <button type="button" style={secondaryBtnDark} onClick={() => openApplicantProfile(selectedApplication)}>Try Profile Lookup</button>
                        </div>
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
    </>
  );
}

// ─── Helper components ────────────────────────────────────────
function CVRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ color: "#64748b", fontWeight: 700, fontSize: 12, minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#0f172a", fontWeight: 600, fontSize: 13, lineHeight: 1.5 }}>{value}</span>
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
    <div style={detailRow} className="cd-detail-row">
      <span style={detailLabel}>{label}</span>
      <span style={detailValue} className="cd-detail-value">{value}</span>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div style={emptyCard}>
      <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>{title}</h3>
      <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>{text}</p>
    </div>
  );
}

function GuideStep({ index, text }: { index: string; text: string }) {
  return (
    <div style={guideStep}>
      <div style={guideIndex}>{index}</div>
      <p style={guideText}>{text}</p>
    </div>
  );
}

function statusPillForApplication(status: string | null): CSSProperties {
  if (status === "shortlisted") return { ...statusPill("open"), background: "#dcfce7", color: "#166534" };
  if (status === "reviewed")   return { ...statusPill("open"), background: "#dbeafe", color: "#1d4ed8" };
  if (status === "rejected")   return { ...statusPill("closed"), background: "#fee2e2", color: "#991b1b" };
  return { ...statusPill("closed"), background: "#fef3c7", color: "#92400e" };
}

function trackerBadge(color: "blue" | "green" | "purple"): CSSProperties {
  const map = {
    blue:   { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    green:  { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
    purple: { background: "#faf5ff", color: "#6b21a8", border: "1px solid #e9d5ff" },
  };
  return { ...map[color], padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 };
}

// ─── Styles ──────────────────────────────────────────────────
const pillSmall: CSSProperties = {
  background: "#f1f5f9",
  padding: "4px 8px",
  borderRadius: 16,
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const pageShell: CSSProperties = { maxWidth: 1380, margin: "0 auto", padding: 20, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", overflowX: "hidden", width: "100%" };
const loadingCard: CSSProperties = { background: "white", borderRadius: 24, padding: 48, textAlign: "center", boxShadow: "0 10px 30px rgba(2,6,23,0.06)" };
const heroCard: CSSProperties = { borderRadius: 28, overflow: "hidden", boxShadow: "0 20px 50px rgba(2,6,23,0.18)", marginBottom: 18, background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" };
const heroOverlay: CSSProperties = { padding: 24, background: "rgba(2,6,23,0.25)", backdropFilter: "blur(12px)" };
const heroTop: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const brandBlock: CSSProperties = { display: "flex", alignItems: "center", gap: 16, minWidth: 360, flex: 1 };
const brandLogo: CSSProperties = { width: 72, height: 72, borderRadius: 20, overflow: "hidden", background: "rgba(255,255,255,0.12)", flexShrink: 0, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" };
const brandLogoImg: CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const brandFallback: CSSProperties = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg, #475569, #0f172a)" };
const eyebrow: CSSProperties = { margin: 0, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11, fontWeight: 800 };
const pageTitle: CSSProperties = { margin: "6px 0 0", fontSize: 36, color: "white", fontWeight: 900, letterSpacing: "-0.04em" };
const pageSubtitle: CSSProperties = { margin: "8px 0 0", color: "#bfdbfe", lineHeight: 1.6, fontSize: 14 };
const heroActions: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" };
const primaryBtnLight: CSSProperties = { background: "#2563eb", color: "white", border: "none", padding: "12px 18px", borderRadius: 14, cursor: "pointer", fontWeight: 800, boxShadow: "0 8px 20px rgba(37,99,235,0.3)" };
const secondaryBtnLight: CSSProperties = { background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 18px", borderRadius: 14, cursor: "pointer", fontWeight: 800 };
const metaRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 };
const metaPill: CSSProperties = { background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.15)", padding: "8px 12px", borderRadius: 12, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" };
const toolbar: CSSProperties = { display: "flex", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" };
const searchInput: CSSProperties = { flex: 1, minWidth: 280, border: "1px solid #dbe3ee", borderRadius: 14, padding: "12px 14px", outline: "none", fontSize: 14, background: "white", color: "#0f172a", boxSizing: "border-box" };
const tabRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "nowrap" };
const tabBtn: CSSProperties = { background: "white", border: "1px solid #e2e8f0", color: "#0f172a", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 800, whiteSpace: "nowrap", fontSize: 14 };
const tabBtnActive: CSSProperties = { background: "#0f172a", border: "1px solid #0f172a", color: "white", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 800, whiteSpace: "nowrap", fontSize: 14 };
const refreshBtn: CSSProperties = { background: "#2563eb", color: "white", border: "none", padding: "10px 16px", borderRadius: 12, cursor: "pointer", fontWeight: 800, whiteSpace: "nowrap" };
const overviewGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1.35fr 0.75fr", gap: 18, alignItems: "start" };
const mainColumn: CSSProperties = { display: "grid", gap: 18 };
const sideColumn: CSSProperties = { display: "grid", gap: 18, position: "sticky", top: 20 };
const singleColumn: CSSProperties = { display: "grid", gap: 18 };
const card: CSSProperties = { background: "white", borderRadius: 24, padding: 22, boxShadow: "0 8px 24px rgba(2,6,23,0.05)", border: "1px solid #eef2f7" };
const sectionTitle: CSSProperties = { margin: 0, fontSize: 19, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" };
const sectionSubtitle: CSSProperties = { margin: "5px 0 0", color: "#64748b", lineHeight: 1.6, fontSize: 14 };
const jobCard: CSSProperties = { border: "1px solid #e8eef5", borderRadius: 18, padding: 18, background: "#fff", boxShadow: "0 4px 16px rgba(15,23,42,0.04)" };
const jobTopRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap" };
const jobTitleSmall: CSSProperties = { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em" };
const jobMeta: CSSProperties = { margin: "5px 0 0", color: "#64748b", fontWeight: 700, fontSize: 13 };
const jobDesc: CSSProperties = { margin: "8px 0 0", color: "#475569", lineHeight: 1.75, fontSize: 14 };
const statusPill = (mode: "open" | "closed"): CSSProperties => ({ background: mode === "open" ? "#dcfce7" : "#fee2e2", color: mode === "open" ? "#166534" : "#991b1b", padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" });
const pillRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 };
const pill: CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 };
const jobActions: CSSProperties = { marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" };
const applicationCard: CSSProperties = { border: "1px solid #e8eef5", borderRadius: 18, padding: 18, background: "#fff", boxShadow: "0 4px 16px rgba(15,23,42,0.04)" };
const appTopRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap" };
const applicantName: CSSProperties = { margin: 0, color: "#0f172a", fontSize: 17, fontWeight: 900 };
const applicantMeta: CSSProperties = { margin: "4px 0 0", color: "#64748b", fontWeight: 600, fontSize: 13, lineHeight: 1.5 };
const jobTagPill: CSSProperties = { background: "#eef2ff", color: "#3730a3", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 };
const appNote: CSSProperties = { margin: "8px 0 0", color: "#475569", lineHeight: 1.7, fontSize: 14, background: "#f8fafc", padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0" };
const appLinkBox: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 };
const driveBtn: CSSProperties = { background: "#2563eb", color: "white", padding: "9px 13px", borderRadius: 10, fontWeight: 800, border: "none", cursor: "pointer", fontSize: 13 };
const resumeBtn: CSSProperties = { background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const copyLinkBtn: CSSProperties = { background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const viewProfileBtn: CSSProperties = { background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const callBtn: CSSProperties = { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const videoBtn: CSSProperties = { background: "#fdf4ff", color: "#7e22ce", border: "1px solid #e9d5ff", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const actionRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 };
const statusBtn: CSSProperties = { background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const reviewedBtn: CSSProperties = { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const shortlistBtn: CSSProperties = { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const dangerBtn: CSSProperties = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const deleteBtn: CSSProperties = { background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", padding: "9px 13px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 13 };
const detailRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px dashed #e5e7eb" };
const detailLabel: CSSProperties = { color: "#64748b", fontWeight: 700, fontSize: 14 };
const detailValue: CSSProperties = { color: "#0f172a", fontWeight: 700, textAlign: "right", fontSize: 14 };
const trustBadge: CSSProperties = { marginTop: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "8px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, lineHeight: 1.6 };
const tipBox: CSSProperties = { marginTop: 12, background: "#fefce8", border: "1px solid #fde68a", color: "#854d0e", padding: "8px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, lineHeight: 1.6 };
const emptyCard: CSSProperties = { background: "#f8fafc", border: "1px dashed #dbe3ee", borderRadius: 16, padding: 28, textAlign: "center" };
const guideStack: CSSProperties = { display: "grid", gap: 10 };
const guideStep: CSSProperties = { display: "flex", gap: 12, alignItems: "flex-start", padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14 };
const guideIndex: CSSProperties = { width: 28, height: 28, borderRadius: 999, background: "#0f172a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 };
const guideText: CSSProperties = { margin: 0, color: "#334155", lineHeight: 1.6, fontWeight: 600, fontSize: 14 };
const toastStyle = (type: ToastType): CSSProperties => ({ position: "fixed", top: 18, right: 18, zIndex: 1400, background: type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#2563eb", color: "white", padding: "10px 16px", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", fontWeight: 700, fontSize: 14 });
const modalOverlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalCard: CSSProperties = { width: "min(1080px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "white", borderRadius: 28, boxShadow: "0 30px 80px rgba(0,0,0,0.28)", padding: 24 };
const modalHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 20 };
const modalEyebrow: CSSProperties = { margin: 0, color: "#2563eb", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" };
const modalTitle: CSSProperties = { margin: "6px 0 0", fontSize: 26, fontWeight: 900, color: "#0f172a" };
const modalSub: CSSProperties = { margin: "6px 0 0", color: "#64748b", lineHeight: 1.5, fontSize: 14 };
const modalCloseBtn: CSSProperties = { width: 38, height: 38, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 800, color: "#0f172a", flexShrink: 0 };
const modalGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18, alignItems: "start" };
const modalSection: CSSProperties = { background: "#fff", borderRadius: 20, border: "1px solid #eef2f7", padding: 18 };
const modalActionStack: CSSProperties = { display: "grid", gap: 10, marginBottom: 16 };
const reviewedBtnWide: CSSProperties = { width: "100%", background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "12px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const shortlistBtnWide: CSSProperties = { width: "100%", background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a", padding: "12px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const dangerBtnWide: CSSProperties = { width: "100%", background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "12px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const deleteBtnWide: CSSProperties = { width: "100%", background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", padding: "12px", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
const secondaryBtnDark: CSSProperties = { background: "#0f172a", color: "white", border: "none", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13 };
const ghostBtn: CSSProperties = { background: "transparent", color: "#0f172a", border: "1px solid #e2e8f0", padding: "9px 13px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13 };
const primaryBtnFull: CSSProperties = { background: "#2563eb", color: "white", border: "none", padding: "12px 16px", borderRadius: 12, cursor: "pointer", fontWeight: 800, textAlign: "center" };
const secondaryBtnFull: CSSProperties = { background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: 12, cursor: "pointer", fontWeight: 800, textAlign: "center" };
const primaryBtnDark: CSSProperties = { background: "#0f172a", color: "white", border: "none", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13 };
const clearFilterBtn: CSSProperties = { background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#475569" };
const shareBtn: CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "11px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 700, textAlign: "center", fontSize: 14 };
const infoRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: "1px solid #f1f5f9" };
const infoLabel: CSSProperties = { color: "#475569", fontWeight: 700, fontSize: 14 };
const infoValue: CSSProperties = { color: "#0f172a", fontWeight: 600, textAlign: "right", fontSize: 14 };

// CV card styles
const cvCard: CSSProperties = { background: "white", borderRadius: 22, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 8px 24px rgba(2,6,23,0.08)" };
const cvBanner: CSSProperties = { height: 72, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)", position: "relative", display: "flex", alignItems: "flex-end", padding: "0 20px" };
const cvAvatarRing: CSSProperties = { width: 80, height: 80, borderRadius: "50%", border: "4px solid white", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "absolute", bottom: -32, left: 20, boxShadow: "0 8px 20px rgba(37,99,235,0.3)", flexShrink: 0 };
const cvIdentity: CSSProperties = { display: "flex", gap: 16, alignItems: "flex-start", padding: "44px 20px 16px", borderBottom: "1px solid #f1f5f9" };
const cvName: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em", lineHeight: 1.2 };
const cvHeadline: CSSProperties = { margin: "5px 0 0", color: "#2563eb", fontSize: 14, fontWeight: 700, lineHeight: 1.4 };
const cvProfessionBadge: CSSProperties = { display: "inline-block", marginTop: 6, background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 };
const cvInfoChip: CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 };
const cvSectionBlock: CSSProperties = { padding: "14px 20px", borderBottom: "1px solid #f1f5f9" };
const cvSectionLabel: CSSProperties = { margin: "0 0 10px", fontSize: 10, fontWeight: 900, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em" };
const cvTimelineGrid: CSSProperties = { display: "grid", gap: 0 };
const cvNoteBox: CSSProperties = { margin: "0", padding: "14px 20px", background: "#fefce8", borderBottom: "1px solid #fde68a" };
const cvActionsRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, padding: "14px 20px" };
const langPill: CSSProperties = { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 };
const cvProfileBox: CSSProperties = { padding: 14, background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" };