"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type ToastType = "success" | "error" | "info";
type AppFilter = "all" | "submitted" | "reviewed" | "shortlisted" | "rejected";

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
  company_id: string;
  title: string;
  slug: string;
  role_type: string | null;
  location: string | null;
  is_remote: boolean | null;
  description: string;
  task_required: boolean | null;
  task_title: string | null;
  task_instructions: string | null;
  task_type: string | null;
  expires_at: string | null;
  status: string | null;
  created_at: string | null;
};

type Application = {
  id: string;
  job_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  resume_link: string | null;
  drive_link: string;
  note: string | null;
  status: string | null;
  created_at: string | null;
};

type ApplicantProfile = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  name: string | null;
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
  role: string | null;
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

export default function JobApplicationsPage() {
  return (
    <ProtectedRoute role="company">
      <JobApplicationsInner />
    </ProtectedRoute>
  );
}

function JobApplicationsInner() {
  const router = useRouter();
  const params = useParams();

  const jobId =
    typeof params?.jobsId === "string"
      ? params.jobsId
      : Array.isArray(params?.jobsId)
      ? params.jobsId[0]
      : typeof params?.jobId === "string"
      ? params.jobId
      : Array.isArray(params?.jobId)
      ? params.jobId[0]
      : "";

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicantProfiles, setApplicantProfiles] = useState<
    Record<string, ApplicantProfile>
  >({});
  const [filter, setFilter] = useState<AppFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [resumePreview, setResumePreview] = useState<{
    title: string;
    url: string;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    loadPage();
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  function showToast(message: string, type: ToastType = "info", duration = 2800) {
    setToast({ message, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), duration);
  }

  async function loadPage() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        router.replace("/");
        return;
      }

      setCompany(companyData as Company);

      if (!jobId) {
        setJob(null);
        showToast("Job not found", "error");
        return;
      }

      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (jobError) {
        console.error("Job load error:", jobError);
        showToast("Failed to load job", "error");
        return;
      }

      if (!jobData) {
        setJob(null);
        showToast("Job not found", "error");
        return;
      }

      const typedJob = jobData as Job;

      if (typedJob.company_id !== user.id) {
        showToast("You do not have access to this job", "error");
        router.replace("/company/dashboard");
        return;
      }

      setJob(typedJob);

      const { data: appRows, error: appError } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", typedJob.id)
        .order("created_at", { ascending: false });

      if (appError) {
        console.error("Applications load error:", appError);
        showToast("Failed to load applications", "error");
        setApplications([]);
        setApplicantProfiles({});
        return;
      }

      const items = (appRows || []) as Application[];
      setApplications(items);

      const emails = Array.from(
        new Set(
          items
            .map((app) => (app.applicant_email || "").trim().toLowerCase())
            .filter(Boolean)
        )
      );

      if (emails.length) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, email, username, full_name, name, avatar_url, headline, location, role")
          .in("email", emails);

        if (usersError) {
          console.error("Applicant profile fetch error:", usersError);
          setApplicantProfiles({});
        } else {
          const map: Record<string, ApplicantProfile> = {};
          (usersData || []).forEach((u: any) => {
            const key = String(u.email || "").trim().toLowerCase();
            if (!key) return;
            map[key] = {
              id: String(u.id || ""),
              email: key,
              username: u.username || null,
              full_name: u.full_name || null,
              name: u.name || null,
              avatar_url: u.avatar_url || null,
              headline: u.headline || null,
              location: u.location || null,
              role: u.role || null,
            };
          });
          setApplicantProfiles(map);
        }
      } else {
        setApplicantProfiles({});
      }
    } catch (err) {
      console.error("Unexpected applications page error:", err);
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  function getProfileByEmail(email: string) {
    return applicantProfiles[email.trim().toLowerCase()] || null;
  }

  async function openApplicantProfile(email: string) {
    const normalized = email.trim().toLowerCase();
    let profile = getProfileByEmail(normalized);

    if (!profile) {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, username, full_name, name, avatar_url, headline, location, role")
        .eq("email", normalized)
        .maybeSingle();

      if (error) {
        console.error("Profile lookup error:", error);
        showToast("Unable to find profile", "error");
        return;
      }

      if (!data) {
        showToast("Public profile not available", "error");
        return;
      }

      profile = {
        id: String(data.id || ""),
        email: String(data.email || normalized).toLowerCase(),
        username: data.username || null,
        full_name: data.full_name || null,
        name: data.name || null,
        avatar_url: data.avatar_url || null,
        headline: data.headline || null,
        location: data.location || null,
        role: data.role || null,
      };

      setApplicantProfiles((prev) => ({
        ...prev,
        [normalized]: profile!,
      }));
    }

    if (profile?.username) {
      window.open(`/profile/${profile.username}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (profile?.id) {
      window.open(`/user/${profile.id}`, "_blank", "noopener,noreferrer");
      return;
    }

    showToast("Public profile not available", "error");
  }

  function openResumePreview(url: string, title: string) {
    if (!url) {
      showToast("Resume not available", "error");
      return;
    }
    setResumePreview({ title, url });
  }

  async function copyText(value: string, successMessage = "Copied") {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage, "success");
    } catch (err) {
      console.error("Copy error:", err);
      showToast("Failed to copy", "error");
    }
  }

  async function copyJobLink() {
    try {
      if (!job?.slug || typeof window === "undefined") return;
      const url = `${window.location.origin}/jobs/${job.slug}`;
      await navigator.clipboard.writeText(url);
      showToast("Job link copied", "success");
    } catch (err) {
      console.error("Copy job link error:", err);
      showToast("Failed to copy link", "error");
    }
  }

  function openPublicJobPage() {
    if (!job?.slug) {
      showToast("Job link not available", "error");
      return;
    }
    router.push(`/jobs/${job.slug}`);
  }

  async function updateApplicationStatus(applicationId: string, newStatus: string) {
    try {
      setSavingId(applicationId);
      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

      if (error) {
        console.error("Application status error:", error);
        showToast("Failed to update status", "error");
        return;
      }

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );

      if (selectedApplication?.id === applicationId) {
        setSelectedApplication((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }

      showToast("Application updated", "success");
    } catch (err) {
      console.error("Unexpected status update error:", err);
      showToast("Something went wrong", "error");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteApplication(applicationId: string) {
    const ok = window.confirm("Delete this application permanently?");
    if (!ok) return;

    try {
      setSavingId(applicationId);
      const { error } = await supabase
        .from("job_applications")
        .delete()
        .eq("id", applicationId);

      if (error) {
        console.error("Delete application error:", error);
        showToast("Failed to delete application", "error");
        return;
      }

      setApplications((prev) => prev.filter((app) => app.id !== applicationId));
      if (selectedApplication?.id === applicationId) setSelectedApplication(null);
      showToast("Application deleted", "success");
    } catch (err) {
      console.error("Unexpected delete error:", err);
      showToast("Something went wrong", "error");
    } finally {
      setSavingId(null);
    }
  }

  function openEmailComposer(applicantEmail: string) {
    const email = applicantEmail.trim();
    if (!email) {
      showToast("Applicant email not found", "error");
      return;
    }

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}`;
    const win = window.open(gmailUrl, "_blank", "noopener,noreferrer");

    if (!win) {
      window.location.href = `mailto:${email}`;
    }
  }

  const stats = useMemo(() => {
    const total = applications.length;
    const submitted = applications.filter(
      (a) => (a.status || "submitted") === "submitted"
    ).length;
    const reviewed = applications.filter((a) => a.status === "reviewed").length;
    const shortlisted = applications.filter((a) => a.status === "shortlisted").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { total, submitted, reviewed, shortlisted, rejected };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    let items = [...applications];

    if (filter !== "all") {
      items = items.filter((app) => (app.status || "submitted") === filter);
    }

    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((app) => {
      const haystack = [
        app.applicant_name,
        app.applicant_email,
        app.applicant_phone,
        app.note,
        app.drive_link,
        app.resume_link,
        app.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [applications, filter, search]);

  const expired = isExpired(job?.expires_at || null, job?.status || null);
  const selectedProfile = selectedApplication
    ? getProfileByEmail(selectedApplication.applicant_email)
    : null;

  if (loading) {
    return (
      <div style={pageShell}>
        <div style={loadingCard}>Loading applications...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={pageShell}>
        <div style={emptyPageCard}>
          <h1 style={{ margin: 0, color: "#0f172a" }}>Job not found</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.7 }}>
            The job may have been deleted, closed, or you may not have access.
          </p>
          <div style={centerBtnRow}>
            <button
              type="button"
              style={primaryBtn}
              onClick={() => router.push("/company/dashboard")}
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              style={secondaryBtn}
              onClick={() => router.push("/company/jobs/new")}
            >
              Post New Job
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageShell}>
      <div
        style={{
          ...heroCard,
          backgroundImage: company?.cover_url
            ? `linear-gradient(180deg, rgba(15,23,42,0.20), rgba(15,23,42,0.78)), url(${company.cover_url})`
            : "linear-gradient(135deg, #0f172a, #1e293b, #334155)",
        }}
      >
        <div style={heroOverlay}>
          <div style={heroTop}>
            <div style={brandBlock}>
              <div style={brandLogo}>
                {company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company?.company_name || "Company"}
                    style={brandLogoImg}
                  />
                ) : (
                  <div style={brandFallback}>
                    {(company?.company_name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p style={eyebrow}>Applications</p>
                <h1 style={pageTitle}>{job.title}</h1>
                <p style={pageSubtitle}>
                  Review candidate submissions, open Drive links, shortlist the best talent,
                  and keep hiring organized.
                </p>
              </div>
            </div>

            <div style={heroActions}>
              <button type="button" style={secondaryBtnLight} onClick={copyJobLink}>
                Copy Public Job Link
              </button>
              <button type="button" style={primaryBtnLight} onClick={openPublicJobPage}>
                Open Public Job
              </button>
              <button
                type="button"
                style={ghostBtnLight}
                onClick={() => router.push("/company/dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          <div style={metaRow}>
            <span style={metaPill}>{job.role_type || "Role not set"}</span>
            <span style={metaPill}>{job.location || "Location not set"}</span>
            <span style={metaPill}>{job.is_remote ? "Remote" : "On-site / Hybrid"}</span>
            <span style={metaPill}>{job.task_required ? "Task required" : "No task"}</span>
            <span style={metaPill}>{expired ? "Closed" : "Open"}</span>
            <span style={metaPill}>
              {job.expires_at
                ? `Expires ${new Date(job.expires_at).toLocaleDateString()}`
                : "No expiry"}
            </span>
          </div>
        </div>
      </div>

      <div style={statsGrid}>
        <StatCard label="Total" value={String(stats.total)} />
        <StatCard label="Submitted" value={String(stats.submitted)} />
        <StatCard label="Reviewed" value={String(stats.reviewed)} />
        <StatCard label="Shortlisted" value={String(stats.shortlisted)} />
        <StatCard label="Rejected" value={String(stats.rejected)} />
      </div>

      <div style={toolbar}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search applicant name, email, notes, drive link..."
          style={searchInput}
        />
        <div style={filterRow}>
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
          <FilterChip
            active={filter === "submitted"}
            onClick={() => setFilter("submitted")}
            label="Submitted"
          />
          <FilterChip
            active={filter === "reviewed"}
            onClick={() => setFilter("reviewed")}
            label="Reviewed"
          />
          <FilterChip
            active={filter === "shortlisted"}
            onClick={() => setFilter("shortlisted")}
            label="Shortlisted"
          />
          <FilterChip
            active={filter === "rejected"}
            onClick={() => setFilter("rejected")}
            label="Rejected"
          />
        </div>
        <button type="button" style={refreshBtn} onClick={loadPage}>
          Refresh
        </button>
      </div>

      <div style={layoutGrid}>
        <section style={mainColumn}>
          <div style={card}>
            <SectionHeader
              title="Applicants"
              subtitle="Open submissions, review Drive links, and update candidate status"
            />
            {filteredApplications.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {filteredApplications.map((app) => {
                  const profile = getProfileByEmail(app.applicant_email);
                  return (
                    <div key={app.id} style={appCard}>
                      <div style={appTopRow}>
                        <div>
                          <h3 style={applicantName}>{app.applicant_name}</h3>
                          <p style={applicantMeta}>
                            {app.applicant_email}
                            {app.applicant_phone ? ` • ${app.applicant_phone}` : ""}
                            {app.created_at ? ` • Applied ${formatDateTime(app.created_at)}` : ""}
                          </p>
                        </div>
                        <span style={statusPillForApp(app.status)}>
                          {app.status || "submitted"}
                        </span>
                      </div>

                      {app.note && (
                        <div style={noteBox}>
                          <strong style={{ color: "#0f172a" }}>Candidate note</strong>
                          <p style={noteText}>{app.note}</p>
                        </div>
                      )}

                      <div style={linkBox}>
                        <a
                          href={app.drive_link}
                          target="_blank"
                          rel="noreferrer"
                          style={driveLink}
                        >
                          Open Google Drive
                        </a>

                        <button
                          type="button"
                          style={copyLinkBtn}
                          onClick={() => copyText(app.drive_link, "Drive link copied")}
                        >
                          Copy Drive Link
                        </button>

                        <button
                          type="button"
                          style={copyLinkBtn}
                          onClick={() => copyText(app.applicant_email, "Email copied")}
                        >
                          Copy Email
                        </button>

                        <button
                          type="button"
                          style={viewProfileBtn}
                          onClick={() => openApplicantProfile(app.applicant_email)}
                        >
                          View Profile
                        </button>

                        <button
                          type="button"
                          style={viewProfileBtn}
                          onClick={() => openEmailComposer(app.applicant_email)}
                        >
                          Email Applicant
                        </button>

                        {app.resume_link && (
                          <button
                            type="button"
                            style={resumeBtn}
                            onClick={() => openResumePreview(app.resume_link || "", app.applicant_name)}
                          >
                            Open Resume
                          </button>
                        )}
                      </div>

                      <div style={actionRow}>
                        <button
                          type="button"
                          style={statusBtn}
                          disabled={savingId === app.id}
                          onClick={() => setSelectedApplication(app)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          style={statusBtn}
                          disabled={savingId === app.id}
                          onClick={() => updateApplicationStatus(app.id, "reviewed")}
                        >
                          Reviewed
                        </button>
                        <button
                          type="button"
                          style={statusBtn}
                          disabled={savingId === app.id}
                          onClick={() => updateApplicationStatus(app.id, "shortlisted")}
                        >
                          Shortlist
                        </button>
                        <button
                          type="button"
                          style={dangerBtn}
                          disabled={savingId === app.id}
                          onClick={() => updateApplicationStatus(app.id, "rejected")}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          style={deleteBtn}
                          disabled={savingId === app.id}
                          onClick={() => deleteApplication(app.id)}
                        >
                          Delete
                        </button>
                      </div>

                      {profile?.username && (
                        <p style={profileHint}>
                          Public profile available: <strong>/profile/{profile.username}</strong>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No applications found"
                text="Candidates will appear here once they submit their Drive links."
              />
            )}
          </div>
        </section>

        <aside style={sideColumn}>
          <div style={card}>
            <SectionHeader title="Job summary" subtitle="Quick overview" />
            <Detail label="Job title" value={job.title} />
            <Detail label="Role type" value={job.role_type || "—"} />
            <Detail label="Location" value={job.location || "—"} />
            <Detail label="Task title" value={job.task_title || "—"} />
            <Detail label="Status" value={job.status || "—"} />
            <Detail
              label="Expiry"
              value={job.expires_at ? formatDateTime(job.expires_at) : "—"}
            />
          </div>

          <div style={card}>
            <SectionHeader
              title="Task instructions"
              subtitle="What candidates were asked to do"
            />
            {job.task_required ? (
              <div style={taskBox}>
                <p style={taskTitle}>{job.task_title || "Task not set"}</p>
                <pre style={taskInstructions}>
                  {job.task_instructions || "No task instructions provided."}
                </pre>
              </div>
            ) : (
              <EmptyState
                title="No task required"
                text="This job does not use a task-based application flow."
              />
            )}
          </div>

          <div style={card}>
            <SectionHeader title="Hiring flow" subtitle="Your process in one place" />
            <div style={flowStack}>
              <FlowStep index="01" text="Review Drive link carefully." />
              <FlowStep index="02" text="Check note, resume link, and submission quality." />
              <FlowStep index="03" text="Move the candidate to reviewed or shortlisted." />
              <FlowStep index="04" text="Delete stale applications if needed." />
            </div>
          </div>
        </aside>
      </div>

      {selectedApplication && (
        <div style={modalOverlay} onClick={() => setSelectedApplication(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <p style={modalEyebrow}>Candidate detail</p>
                <h2 style={modalTitle}>{selectedApplication.applicant_name}</h2>
                <p style={modalSub}>
                  {selectedApplication.applicant_email}
                  {selectedApplication.applicant_phone
                    ? ` • ${selectedApplication.applicant_phone}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                style={modalCloseBtn}
                onClick={() => setSelectedApplication(null)}
              >
                ✕
              </button>
            </div>

            <div style={modalGrid}>
              <div style={modalSection}>
                <SectionHeader title="Submission" subtitle="Review the candidate's work" />
                <div style={modalInfoBox}>
                  <InfoRow label="Status" value={selectedApplication.status || "submitted"} />
                  <InfoRow
                    label="Applied at"
                    value={formatDateTime(selectedApplication.created_at)}
                  />
                  <InfoRow label="Drive link" value="Google Drive submission" />
                </div>

                <div style={modalButtonRow}>
                  <a
                    href={selectedApplication.drive_link}
                    target="_blank"
                    rel="noreferrer"
                    style={driveLink}
                  >
                    Open Google Drive
                  </a>

                  <button
                    type="button"
                    style={copyLinkBtn}
                    onClick={() =>
                      copyText(selectedApplication.drive_link, "Drive link copied")
                    }
                  >
                    Copy Drive Link
                  </button>

                  <button
                    type="button"
                    style={copyLinkBtn}
                    onClick={() =>
                      copyText(selectedApplication.applicant_email, "Email copied")
                    }
                  >
                    Copy Email
                  </button>

                  <button
                    type="button"
                    style={viewProfileBtn}
                    onClick={() => openApplicantProfile(selectedApplication.applicant_email)}
                  >
                    View Profile
                  </button>

                  {selectedApplication.resume_link && (
                    <button
                      type="button"
                      style={resumeBtn}
                      onClick={() =>
                        openResumePreview(
                          selectedApplication.resume_link || "",
                          selectedApplication.applicant_name
                        )
                      }
                    >
                      Open Resume
                    </button>
                  )}

                  <button
                    type="button"
                    style={viewProfileBtn}
                    onClick={() => openEmailComposer(selectedApplication.applicant_email)}
                  >
                    Email Applicant
                  </button>
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
                  <button
                    type="button"
                    style={statusBtnWide}
                    disabled={savingId === selectedApplication.id}
                    onClick={() => updateApplicationStatus(selectedApplication.id, "reviewed")}
                  >
                    Mark Reviewed
                  </button>
                  <button
                    type="button"
                    style={statusBtnWide}
                    disabled={savingId === selectedApplication.id}
                    onClick={() => updateApplicationStatus(selectedApplication.id, "shortlisted")}
                  >
                    Shortlist Candidate
                  </button>
                  <button
                    type="button"
                    style={dangerBtnWide}
                    disabled={savingId === selectedApplication.id}
                    onClick={() => updateApplicationStatus(selectedApplication.id, "rejected")}
                  >
                    Reject Candidate
                  </button>
                  <button
                    type="button"
                    style={deleteBtnWide}
                    disabled={savingId === selectedApplication.id}
                    onClick={() => deleteApplication(selectedApplication.id)}
                  >
                    Delete Application
                  </button>
                </div>

                <div style={modalProfileBox}>
                  <SectionHeader
                    title="Public profile"
                    subtitle="Open the candidate's profile if available"
                  />
                  {selectedProfile?.username ? (
                    <>
                      <p style={profileLine}>
                        /profile/<strong>{selectedProfile.username}</strong>
                      </p>
                      <p style={profileLine}>
                        {selectedProfile.full_name || selectedProfile.name || "Name not set"}
                      </p>
                      <p style={profileLine}>
                        {selectedProfile.headline || "No headline added"}
                      </p>
                      <button
                        type="button"
                        style={primaryBtnDark}
                        onClick={() => openApplicantProfile(selectedApplication.applicant_email)}
                      >
                        Open Public Profile
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={mutedText}>
                        No public profile username is linked for this email yet.
                      </p>
                      <button
                        type="button"
                        style={secondaryBtnDark}
                        onClick={() => openApplicantProfile(selectedApplication.applicant_email)}
                      >
                        Try Open Profile
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {resumePreview && (
        <ResumeModal
          title={resumePreview.title}
          url={resumePreview.url}
          onClose={() => setResumePreview(null)}
        />
      )}

      {toast && <div style={toastStyle(toast.type)}>{toast.message}</div>}
    </div>
  );
}

function ResumeModal({
  title,
  url,
  onClose,
}: {
  title: string;
  url: string;
  onClose: () => void;
}) {
  return (
    <div style={resumeModalOverlay} onClick={onClose}>
      <div style={resumeModalCard} onClick={(e) => e.stopPropagation()}>
        <div style={resumeModalHeader}>
          <div>
            <p style={modalEyebrow}>Resume preview</p>
            <h2 style={modalTitle}>{title}</h2>
          </div>
          <button type="button" style={modalCloseBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={resumeModalActions}>
          <a href={url} target="_blank" rel="noreferrer" style={resumeOpenBtn}>
            Open in new tab
          </a>
        </div>

        <div style={resumeFrameWrap}>
          <iframe title={`${title} resume`} src={url} style={resumeFrame} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCard}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
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

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button type="button" onClick={onClick} style={active ? filterChipActive : filterChip}>
      {label}
    </button>
  );
}

function FlowStep({ index, text }: { index: string; text: string }) {
  return (
    <div style={flowStep}>
      <div style={flowIndex}>{index}</div>
      <p style={flowText}>{text}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>{label}</span>
      <span style={infoValue}>{value}</span>
    </div>
  );
}

// ========== FIX: added missing statusPill helper ==========
function statusPill(mode: "open" | "closed"): React.CSSProperties {
  return {
    background: mode === "open" ? "#dcfce7" : "#fee2e2",
    color: mode === "open" ? "#166534" : "#991b1b",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

function statusPillForApp(status: string | null): React.CSSProperties {
  if (status === "shortlisted") {
    return { ...statusPill("open"), background: "#dcfce7", color: "#166534" };
  }
  if (status === "reviewed") {
    return { ...statusPill("open"), background: "#dbeafe", color: "#1d4ed8" };
  }
  if (status === "rejected") {
    return { ...statusPill("closed"), background: "#fee2e2", color: "#991b1b" };
  }
  return { ...statusPill("closed"), background: "#fef3c7", color: "#92400e" };
}

const pageShell: React.CSSProperties = {
  maxWidth: 1380,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
};

const loadingCard: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: 40,
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
};

const emptyPageCard: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: 40,
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
};

const heroCard: React.CSSProperties = {
  borderRadius: 28,
  overflow: "hidden",
  boxShadow: "0 20px 50px rgba(2,6,23,0.18)",
  marginBottom: 18,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const heroOverlay: React.CSSProperties = {
  padding: 24,
  background: "rgba(2,6,23,0.35)",
  backdropFilter: "blur(10px)",
};

const heroTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const brandBlock: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  minWidth: 360,
  flex: 1,
};

const brandLogo: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 20,
  overflow: "hidden",
  background: "rgba(255,255,255,0.12)",
  flexShrink: 0,
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
};

const brandLogoImg: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const brandFallback: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontSize: 28,
  fontWeight: 800,
  background: "linear-gradient(135deg, #475569, #0f172a)",
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  color: "#93c5fd",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
  fontWeight: 800,
};

const pageTitle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 36,
  color: "white",
  fontWeight: 800,
  letterSpacing: "-0.04em",
};

const pageSubtitle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#dbeafe",
  lineHeight: 1.7,
  maxWidth: 900,
};

const heroActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const primaryBtnLight: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 10px 25px rgba(37,99,235,0.24)",
};

const secondaryBtnLight: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
};

const ghostBtnLight: React.CSSProperties = {
  background: "transparent",
  color: "white",
  border: "1px solid rgba(255,255,255,0.22)",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
};

const metaRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 18,
};

const metaPill: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.14)",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const statCard: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
};

const statValue: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
};

const statLabel: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
};

const toolbar: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginBottom: 18,
  flexWrap: "wrap",
};

const searchInput: React.CSSProperties = {
  flex: 1,
  minWidth: 280,
  border: "1px solid #dbe3ee",
  borderRadius: 14,
  padding: "12px 14px",
  outline: "none",
  fontSize: 14,
  background: "white",
  color: "#0f172a",
  boxSizing: "border-box",
};

const filterRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const filterChip: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  color: "#0f172a",
  padding: "11px 14px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
};

const filterChipActive: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #0f172a",
  color: "white",
  padding: "11px 14px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
};

const refreshBtn: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 10px 25px rgba(37,99,235,0.20)",
};

const layoutGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.35fr 0.75fr",
  gap: 18,
  alignItems: "start",
};

const mainColumn: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const sideColumn: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const card: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: 22,
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
  border: "1px solid #eef2f7",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const sectionSubtitle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  lineHeight: 1.6,
};

const appCard: React.CSSProperties = {
  border: "1px solid #e8eef5",
  borderRadius: 20,
  padding: 18,
  background: "#fff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.03)",
};

const appTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 12,
  flexWrap: "wrap",
};

const applicantName: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 800,
};

const applicantMeta: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontWeight: 700,
  fontSize: 13,
  lineHeight: 1.6,
};

const noteBox: React.CSSProperties = {
  marginTop: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 14,
};

const noteText: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#475569",
  lineHeight: 1.75,
};

const linkBox: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
};

const driveLink: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  border: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const resumeLink: React.CSSProperties = {
  background: "#f8fafc",
  color: "#0f172a",
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  border: "1px solid #e2e8f0",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const resumeBtn: React.CSSProperties = {
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const copyLinkBtn: React.CSSProperties = {
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const viewProfileBtn: React.CSSProperties = {
  background: "#eef2ff",
  color: "#3730a3",
  border: "1px solid #dbeafe",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const actionRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const statusBtn: React.CSSProperties = {
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const deleteBtn: React.CSSProperties = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const detailRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px dashed #e5e7eb",
};

const detailLabel: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
};

const detailValue: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 700,
  textAlign: "right",
};

const taskBox: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
};

const taskTitle: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontWeight: 800,
};

const taskInstructions: React.CSSProperties = {
  margin: "10px 0 0",
  whiteSpace: "pre-wrap",
  color: "#334155",
  lineHeight: 1.8,
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
};

const flowStack: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const flowStep: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
};

const flowIndex: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  background: "#0f172a",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 12,
  flexShrink: 0,
};

const flowText: React.CSSProperties = {
  margin: 0,
  color: "#334155",
  lineHeight: 1.7,
  fontWeight: 600,
};

const emptyCard: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px dashed #dbe3ee",
  borderRadius: 18,
  padding: 24,
  textAlign: "center",
};

const centerBtnRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "center",
  flexWrap: "wrap",
  marginTop: 18,
};

const primaryBtn: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryBtn: React.CSSProperties = {
  background: "#0f172a",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryBtnDark: React.CSSProperties = {
  background: "#0f172a",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 800,
};

const primaryBtnDark: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 800,
};

const profileHint: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const infoRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "12px 14px",
};

const infoLabel: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 13,
};

const infoValue: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 13,
  textAlign: "right",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.58)",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalCard: React.CSSProperties = {
  width: "min(1100px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "white",
  borderRadius: 28,
  boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
  padding: 22,
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 18,
};

const modalEyebrow: React.CSSProperties = {
  margin: 0,
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const modalTitle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 28,
  fontWeight: 800,
  color: "#0f172a",
};

const modalSub: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  lineHeight: 1.6,
};

const modalCloseBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  fontWeight: 800,
  color: "#0f172a",
};

const modalGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: 18,
  alignItems: "start",
};

const modalSection: React.CSSProperties = {
  background: "#fff",
  borderRadius: 24,
  border: "1px solid #eef2f7",
  padding: 18,
  boxShadow: "0 10px 30px rgba(2,6,23,0.04)",
};

const modalInfoBox: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const modalButtonRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 14,
};

const modalNoteBox: React.CSSProperties = {
  marginTop: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 14,
};

const modalNoteText: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#475569",
  lineHeight: 1.75,
};

const modalActionStack: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const statusBtnWide: React.CSSProperties = {
  width: "100%",
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "12px 14px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const dangerBtnWide: React.CSSProperties = {
  width: "100%",
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "12px 14px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const deleteBtnWide: React.CSSProperties = {
  width: "100%",
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  padding: "12px 14px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const modalProfileBox: React.CSSProperties = {
  marginTop: 16,
  borderRadius: 20,
  padding: 18,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const profileLine: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#334155",
  lineHeight: 1.7,
};

const mutedText: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
};

const toastStyle = (type: ToastType): React.CSSProperties => ({
  position: "fixed",
  top: 18,
  right: 18,
  zIndex: 1400,
  background: type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#2563eb",
  color: "white",
  padding: "10px 14px",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
  fontWeight: 700,
});

const resumeModalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.68)",
  zIndex: 2100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const resumeModalCard: React.CSSProperties = {
  width: "min(1000px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "white",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 30px 80px rgba(0,0,0,0.30)",
};

const resumeModalHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const resumeModalActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const resumeOpenBtn: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const resumeFrameWrap: React.CSSProperties = {
  marginTop: 16,
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  overflow: "hidden",
  minHeight: 500,
  background: "#f8fafc",
};

const resumeFrame: React.CSSProperties = {
  width: "100%",
  height: "70vh",
  border: "none",
  display: "block",
};