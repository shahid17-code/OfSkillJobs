"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { awardPoints } from "@/lib/points";

type ToastType = "success" | "error" | "info";
type Job = {
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
  external_apply_url: string | null;
};

type Company = {
  company_name?: string | null;
  username?: string | null;
  industry?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  about?: string | null;
  website?: string | null;
};

type ApplicationForm = {
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  resume_link: string;
  drive_link: string;
  note: string;
};

const initialForm: ApplicationForm = {
  applicant_name: "",
  applicant_email: "",
  applicant_phone: "",
  resume_link: "",
  drive_link: "",
  note: "",
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
      ? params.slug[0]
      : "";

  const toastTimer = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [authUser, setAuthUser] = useState<any>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  // State for "Read more" on company bio
  const [bioExpanded, setBioExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadPage();

    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [slug]);

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
      setAuthUser(user || null);
      setAlreadyApplied(false);

      if (user) {
        const metaName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          "";

        setForm((prev) => ({
          ...prev,
          applicant_name: prev.applicant_name || metaName || "",
          applicant_email: prev.applicant_email || user.email || "",
        }));
      }

      if (!slug) {
        setJob(null);
        return;
      }

      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .ilike("slug", slug)
        .maybeSingle();

      if (jobError) {
        console.error("Job load error:", jobError);
        showToast("Failed to load job", "error");
        setJob(null);
        return;
      }

      if (!jobData) {
        setJob(null);
        return;
      }

      setJob(jobData as Job);

      const { data: companyData, error: companyError } = await supabase
        .from("users")
        .select(
          "company_name, username, industry, location, phone, email, logo_url, cover_url, about, website"
        )
        .eq("id", jobData.company_id)
        .maybeSingle();

      if (companyError) {
        console.error("Company load error:", companyError);
      }

      setCompany((companyData as Company) || null);

      if (user?.email) {
        const normalizedEmail = user.email.toLowerCase();
        const { data: existingApplication, error: appCheckError } = await supabase
          .from("job_applications")
          .select(
            "id, applicant_name, applicant_email, applicant_phone, resume_link, drive_link, note"
          )
          .eq("job_id", jobData.id)
          .ilike("applicant_email", normalizedEmail)
          .limit(1)
          .maybeSingle();

        if (appCheckError) {
          console.error("Application check error:", appCheckError);
        }

        if (existingApplication) {
          setAlreadyApplied(true);
          setForm({
            applicant_name: existingApplication.applicant_name || "",
            applicant_email: existingApplication.applicant_email || normalizedEmail,
            applicant_phone: existingApplication.applicant_phone || "",
            resume_link: existingApplication.resume_link || "",
            drive_link: existingApplication.drive_link || "",
            note: existingApplication.note || "",
          });
        }
      }
    } catch (err) {
      console.error("Unexpected job page error:", err);
      setJob(null);
      showToast("Something went wrong while loading this job", "error");
    } finally {
      setLoading(false);
    }
  }

  const expired = useMemo(() => {
    if (!job) return true;
    if (job.status && job.status !== "active") return true;
    if (!job.expires_at) return false;
    return new Date(job.expires_at).getTime() <= Date.now();
  }, [job]);

  const salaryText = useMemo(() => {
    if (!job) return "Salary confidential";
    if (!job.salary_min && !job.salary_max) return "Salary confidential";
    const min = job.salary_min ? `₹${job.salary_min}` : "₹—";
    const max = job.salary_max ? `₹${job.salary_max}` : "₹—";
    return `${min} - ${max}`;
  }, [job]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !job?.slug) return "";
    return `${window.location.origin}/jobs/${job.slug}`;
  }, [job?.slug]);

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message, "success");
    } catch (err) {
      console.error("Copy failed:", err);
      showToast("Failed to copy", "error");
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!job) {
      showToast("Job not found", "error");
      return;
    }

    if (expired) {
      showToast("This job is closed", "error");
      return;
    }

    if (alreadyApplied) {
      showToast("You have already applied for this job", "info");
      return;
    }

    if (!authUser) {
      showToast("Please sign up or log in to apply", "info");
      router.push("/signup");
      return;
    }

    const applicantName = form.applicant_name.trim();
    const applicantEmail = form.applicant_email.trim();
    const resumeLink = form.resume_link.trim();
    const driveLink = form.drive_link.trim();
    const applicantPhone = form.applicant_phone.trim();
    const note = form.note.trim();

    if (!applicantName || !applicantEmail || !resumeLink || !driveLink) {
      showToast("Name, email, resume link, and Google Drive link are required", "error");
      return;
    }

    try {
      setSubmitting(true);

      const normalizedEmail = applicantEmail.toLowerCase();
      const { data: duplicateApp, error: duplicateCheckError } = await supabase
        .from("job_applications")
        .select("id")
        .eq("job_id", job.id)
        .ilike("applicant_email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (duplicateApp) {
        setAlreadyApplied(true);
        showToast("You have already applied for this job", "info");
        return;
      }

      let applicantId = authUser.id;
      if (!applicantId) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .ilike("email", normalizedEmail)
          .maybeSingle();
        if (userData?.id) {
          applicantId = userData.id;
        } else {
          showToast("Your account could not be identified. Please log out and log in again.", "error");
          return;
        }
      }

      const { error } = await supabase.from("job_applications").insert({
        job_id: job.id,
        applicant_id: applicantId,
        applicant_name: applicantName,
        applicant_email: normalizedEmail,
        applicant_phone: applicantPhone || null,
        resume_link: resumeLink,
        drive_link: driveLink,
        note: note || null,
        status: "submitted",
      });

      if (error) {
        if (error.code === "23505") {
          setAlreadyApplied(true);
          showToast("You have already applied for this job", "info");
          return;
        }
        console.error("Application submit error:", error);
        showToast(error.message || "Failed to submit application", "error");
        return;
      }

      await awardPoints(authUser.id, "job_apply", 10);
      showToast("Application submitted successfully! +10 points", "success");
      setAlreadyApplied(true);
      setForm(initialForm);
      window.setTimeout(() => {
        router.push("/jobs");
      }, 1100);
    } catch (err) {
      console.error("Unexpected submit error:", err);
      showToast("Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={pageShell}>
        <div style={loadingCard}>
          <div style={loadingSpinner} />
          <h2 style={{ margin: "16px 0 0", color: "#0f172a" }}>Loading job...</h2>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
            Preparing the role details and application form.
          </p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={pageShell}>
        <div style={emptyCard}>
          <h1 style={{ margin: 0, color: "#0f172a" }}>Job not found</h1>
          <p style={{ margin: "10px 0 0", color: "#64748b", lineHeight: 1.8 }}>
            This job may have been removed, closed, or the link may be incorrect.
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <button type="button" style={primaryBtn} onClick={() => router.push("/jobs")}>
              Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  const useExternalApply = !!job.external_apply_url?.trim();

  // Helper to truncate bio for mobile (if not expanded)
  const getBioDisplay = () => {
    const fullBio = company?.about || "This company profile has not been completed yet. Check back soon for more details.";
    if (!isMobile) return fullBio;
    if (bioExpanded) return fullBio;
    if (fullBio.length <= 100) return fullBio;
    return fullBio.slice(0, 100) + "...";
  };

  const bioToShow = getBioDisplay();
  const showReadMore = isMobile && (company?.about?.length || 0) > 100;

  return (
    <div style={pageShell}>
      <div
        className="job-hero"
        style={{
          ...heroCard,
          backgroundImage: company?.cover_url
            ? `linear-gradient(135deg, rgba(255,255,255,0.96), rgba(241,245,249,0.98)), url(${company.cover_url})`
            : "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        }}
      >
        <div className="hero-container">
          <div className="hero-left">
            <div className="logo-wrapper">
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
            </div>
            <div className="job-details">
              <p style={eyebrow}>Skill-based opportunity</p>
              <h1 style={pageTitle}>{job.title}</h1>
              <p style={pageSubtitle}>
                {company?.company_name || "Company"} · {job.role_type || "Role"} ·{" "}
                {job.location || "Location not set"}
              </p>
              <div style={metaPills}>
                <span style={statusPill(expired ? "closed" : "open")}>
                  {expired ? "Closed" : "Open"}
                </span>
                <span style={metaChip}>
                  {job.is_remote ? "Remote" : "On-site / Hybrid"}
                </span>
                <span style={metaChip}>{salaryText}</span>
                {alreadyApplied && (
                  <span style={alreadyAppliedChip}>Already applied ✅</span>
                )}
              </div>
            </div>
          </div>
          <div className="hero-actions">
            {company?.username && (
              <button
                type="button"
                style={ghostBtn}
                onClick={() => router.push(`/company/${company.username}`)}
              >
                View Company
              </button>
            )}
            <button
              type="button"
              style={ghostBtn}
              onClick={() => copyText(shareUrl, "Job link copied")}
            >
              Copy Job Link
            </button>
            <button type="button" style={primaryBtn} onClick={() => router.push("/jobs")}>
              Browse More Jobs
            </button>
          </div>
        </div>
      </div>

      <div style={layoutGrid}>
        <section style={mainColumn}>
          <div style={premiumCard}>
            <SectionHeader
              title="About this role"
              subtitle="A clear view of what the company needs"
            />
            <p style={bodyText}>{job.description}</p>

            <div style={detailGrid}>
              <InfoBox label="Task-based hiring" value={job.task_required ? "Yes" : "No"} />
              <InfoBox
                label="Expiry"
                value={job.expires_at ? new Date(job.expires_at).toLocaleDateString() : "No expiry"}
              />
              <InfoBox label="Location" value={job.location || "Not set"} />
              <InfoBox
                label="Work mode"
                value={job.is_remote ? "Remote" : "On-site / Hybrid"}
              />
            </div>
          </div>

          {job.task_required && (
            <div style={premiumCard}>
              <SectionHeader
                title="Skill task"
                subtitle="This is how the company evaluates real ability"
              />
              <div style={taskCard}>
                <div style={taskHeader}>
                  <div>
                    <h3 style={taskTitle}>{job.task_title || "Task"}</h3>
                    <p style={taskSubtitle}>
                      Read carefully, complete the task, and submit your links below.
                    </p>
                  </div>
                  <span style={taskBadge}>{job.task_type || "custom"}</span>
                </div>

                <pre style={taskText}>
                  {job.task_instructions || "No instructions provided."}
                </pre>
              </div>
            </div>
          )}

          <div style={premiumCard}>
            <SectionHeader
              title="Company snapshot"
              subtitle="A quick look at who you are applying to"
            />

            <div style={companyCard}>
              <div style={companyTopRow}>
                <div style={companyAvatar}>
                  {company?.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company?.company_name || "Company"}
                      style={companyAvatarImg}
                    />
                  ) : (
                    <div style={companyAvatarFallback}>
                      {(company?.company_name || "C").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={companyName}>{company?.company_name || "Company"}</h3>
                  <p style={companyMeta}>
                    {company?.industry || "Industry not set"}
                    {company?.location ? ` • ${company.location}` : ""}
                  </p>
                  {/* ✅ Company bio with "Read more" on mobile */}
                  <div>
                    <p style={companyBio}>{bioToShow}</p>
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
                          marginTop: 4,
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        {bioExpanded ? "Read less" : "Read more"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={companyLinks}>
                {company?.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" style={linkPill}>
                    Website
                  </a>
                )}
                {company?.email ? (
                  <a
                    href={`mailto:${company.email}`}
                    style={linkPill}
                    onClick={(e) => {
                      e.preventDefault();
                      setTimeout(() => {
                        window.location.href = `mailto:${company.email}`;
                      }, 100);
                    }}
                  >
                    Email
                  </a>
                ) : (
                  <span style={{ ...linkPill, opacity: 0.5, cursor: "default" }}>Email not available</span>
                )}
                {company?.username && (
                  <button
                    type="button"
                    style={linkPillBtn}
                    onClick={() => router.push(`/company/${company.username}`)}
                  >
                    Public Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside style={sideColumn}>
          <div style={stickyStack}>
            <div style={applyCard}>
              <SectionHeader
                title="Apply now"
                subtitle={
                  useExternalApply
                    ? "This job is curated by OfSkillJob. You will apply directly on the employer's website."
                    : alreadyApplied
                    ? "You have already submitted an application for this job."
                    : authUser
                    ? "Your details can be auto-filled and your submission will go straight to the company."
                    : "Sign in to auto-fill your details and submit your application."
                }
              />

              {alreadyApplied && !useExternalApply && (
                <div style={alreadyAppliedBanner}>
                  <strong style={{ display: "block", marginBottom: 4 }}>
                    Already applied
                  </strong>
                  <span>
                    You already submitted an application for this role. You can still copy
                    the job link, view the company, or browse more opportunities.
                  </span>
                </div>
              )}

              {useExternalApply ? (
                <div style={guestBox}>
                  <p style={guestText}>
                    This job is hosted by <strong>{company?.company_name || "the employer"}</strong>.
                    Click the button below to apply directly on their website.
                  </p>
                  <div style={guestActions}>
                    <a
                      href={job.external_apply_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...primaryBtn, display: "inline-block", textDecoration: "none", textAlign: "center" }}
                    >
                      Apply via OfSkillJob →
                    </a>
                  </div>
                </div>
              ) : authUser ? (
                <form onSubmit={handleSubmit} style={formGrid}>
                  <Field label="Full name *">
                    <input
                      name="applicant_name"
                      value={form.applicant_name}
                      onChange={handleChange}
                      placeholder="Your name"
                      style={input}
                      disabled={alreadyApplied}
                    />
                  </Field>

                  <Field label="Email *">
                    <input
                      name="applicant_email"
                      value={form.applicant_email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      style={input}
                      disabled={alreadyApplied}
                    />
                  </Field>

                  <Field label="Phone">
                    <input
                      name="applicant_phone"
                      value={form.applicant_phone}
                      onChange={handleChange}
                      placeholder="Phone number"
                      style={input}
                      disabled={alreadyApplied}
                    />
                  </Field>

                  <Field label="Resume link *">
                    <input
                      name="resume_link"
                      value={form.resume_link}
                      onChange={handleChange}
                      placeholder="Paste your resume / portfolio link"
                      style={input}
                      disabled={alreadyApplied}
                    />
                  </Field>

                  <Field label="Google Drive link *">
                    <input
                      name="drive_link"
                      value={form.drive_link}
                      onChange={handleChange}
                      placeholder="Paste your Drive folder or file link"
                      style={input}
                      disabled={alreadyApplied}
                    />
                  </Field>

                  <Field label="Note">
                    <textarea
                      name="note"
                      value={form.note}
                      onChange={handleChange}
                      placeholder="Short note about your submission"
                      style={textarea}
                      disabled={alreadyApplied}
                    />
                  </Field>

                  <button
                    type="submit"
                    style={submitBtn}
                    disabled={submitting || expired || alreadyApplied}
                  >
                    {submitting
                      ? "Submitting..."
                      : alreadyApplied
                      ? "Already Applied"
                      : expired
                      ? "Job Closed"
                      : "Submit Application"}
                  </button>
                </form>
              ) : (
                <div style={guestBox}>
                  <p style={guestText}>
                    To submit an application, sign up or log in first. Your email can be
                    prefilled automatically, and the company will receive your links
                    cleanly.
                  </p>

                  <div style={guestActions}>
                    <button type="button" style={primaryBtn} onClick={() => router.push("/signup")}>
                      Sign up
                    </button>
                    <button type="button" style={ghostBtn} onClick={() => router.push("/login")}>
                      Log in
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={tipsCard}>
              <SectionHeader
                title="Submission tips"
                subtitle="A strong application looks clear"
              />
              <ul style={tipsList}>
                <li>Use one Drive folder with access enabled.</li>
                <li>Keep your note short and specific.</li>
                <li>Make sure the links open without permission issues.</li>
                <li>Submit the exact task the company asked for.</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {toast && <div style={toastStyle(toast.type)}>{toast.message}</div>}

      <style>{`
  @media (max-width: 768px) {
    .logo-wrapper {
      display: none !important;
    }
    .hero-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .hero-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .job-details {
      width: 100%;
      margin-left: 16px;
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-start;
      margin-left: 16px;
    }
    .hero-actions button {
      width: auto !important;
      margin: 0 !important;
    }
    .eyebrow {
      font-size: 11px !important;
      text-align: left !important;
    }
    .pageTitle {
      font-size: 28px !important;
      text-align: left !important;
    }
    .pageSubtitle {
      font-size: 14px !important;
      text-align: left !important;
    }
    .metaPills {
      justify-content: flex-start !important;
      gap: 6px !important;
    }
    .metaPills span {
      font-size: 11px !important;
      padding: 4px 8px !important;
    }
    .layoutGrid {
      grid-template-columns: 1fr !important;
    }
  }
  @media (min-width: 769px) {
    .hero-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }
    .hero-left {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .logo-wrapper {
      flex-shrink: 0;
    }
    .job-details {
      flex: 1;
      margin-left: 20px;
    }
    .eyebrow {
      margin-top: 0;
    }
    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  }
`}</style><style>{`
  @media (max-width: 768px) {
    .logo-wrapper {
      display: none !important;
    }
    .hero-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .hero-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .job-details {
      width: 100%;
      margin-left: 16px;
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-start;
      margin-left: 16px;
    }
    .hero-actions button {
      width: auto !important;
      margin: 0 !important;
    }
    .eyebrow {
      font-size: 11px !important;
      text-align: left !important;
    }
    .pageTitle {
      font-size: 28px !important;
      text-align: left !important;
    }
    .pageSubtitle {
      font-size: 14px !important;
      text-align: left !important;
    }
    .metaPills {
      justify-content: flex-start !important;
      gap: 6px !important;
    }
    .metaPills span {
      font-size: 11px !important;
      padding: 4px 8px !important;
    }
    .layoutGrid {
      grid-template-columns: 1fr !important;
    }
  }
  @media (min-width: 769px) {
    .hero-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }
    .hero-left {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .logo-wrapper {
      flex-shrink: 0;
    }
    .job-details {
      flex: 1;
      margin-left: 20px;
    }
    .eyebrow {
      margin-top: 0;
    }
    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  }
`}</style>
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoBox}>
      <div style={infoLabel}>{label}</div>
      <div style={infoValue}>{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={field}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

const pageShell: CSSProperties = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: 20,
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
};

const heroCard: CSSProperties = {
  borderRadius: 30,
  overflow: "hidden",
  marginBottom: 18,
  boxShadow: "0 22px 60px rgba(2,6,23,0.08)",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const brandLogo: CSSProperties = {
  width: 74,
  height: 74,
  borderRadius: 22,
  overflow: "hidden",
  background: "rgba(255,255,255,0.9)",
  flexShrink: 0,
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
};

const brandLogoImg: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const brandFallback: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0f172a",
  fontSize: 28,
  fontWeight: 900,
  background: "linear-gradient(135deg, #e2e8f0, #f8fafc)",
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#2563eb",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
  fontWeight: 800,
};

const pageTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 38,
  color: "#0f172a",
  fontWeight: 900,
  letterSpacing: "-0.04em",
  lineHeight: 1.1,
};

const pageSubtitle: CSSProperties = {
  margin: "10px 0 0",
  color: "#475569",
  lineHeight: 1.7,
  maxWidth: 900,
};

const metaPills: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 14,
};

const statusPill = (mode: "open" | "closed"): CSSProperties => ({
  background:
    mode === "open"
      ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
      : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
  color: mode === "open" ? "#166534" : "#991b1b",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
});

const metaChip: CSSProperties = {
  background: "#f1f5f9",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const alreadyAppliedChip: CSSProperties = {
  background: "#dbeafe",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const primaryBtn: CSSProperties = {
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 900,
  boxShadow: "0 10px 25px rgba(37,99,235,0.20)",
};

const ghostBtn: CSSProperties = {
  background: "rgba(255,255,255,0.9)",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "12px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
};

const layoutGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.35fr 0.8fr",
  gap: 18,
  alignItems: "start",
};

const mainColumn: CSSProperties = {
  display: "grid",
  gap: 18,
};

const sideColumn: CSSProperties = {
  display: "grid",
  gap: 18,
};

const stickyStack: CSSProperties = {
  display: "grid",
  gap: 18,
  position: "sticky",
  top: 20,
};

const premiumCard: CSSProperties = {
  background: "white",
  borderRadius: 26,
  padding: 22,
  boxShadow: "0 12px 35px rgba(2,6,23,0.06)",
  border: "1px solid #eef2f7",
};

const bodyText: CSSProperties = {
  margin: 0,
  color: "#334155",
  lineHeight: 1.85,
  fontSize: 15,
};

const detailGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginTop: 18,
};

const infoBox: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 14,
};

const infoLabel: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const infoValue: CSSProperties = {
  marginTop: 8,
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 800,
};

const taskCard: CSSProperties = {
  background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
  border: "1px solid #dbeafe",
  borderRadius: 18,
  padding: 18,
};

const taskHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const taskTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 900,
};

const taskSubtitle: CSSProperties = {
  margin: "6px 0 0",
  color: "#475569",
  lineHeight: 1.7,
};

const taskBadge: CSSProperties = {
  background: "#dbeafe",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const taskText: CSSProperties = {
  margin: "14px 0 0",
  whiteSpace: "pre-wrap",
  color: "#334155",
  lineHeight: 1.8,
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
  background: "rgba(255,255,255,0.6)",
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.25)",
};

const companyCard: CSSProperties = {
  display: "grid",
  gap: 16,
};

const companyTopRow: CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
};

const companyAvatar: CSSProperties = {
  width: 68,
  height: 68,
  borderRadius: 20,
  overflow: "hidden",
  flexShrink: 0,
  boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
};

const companyAvatarImg: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const companyAvatarFallback: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  color: "#0f172a",
  background: "linear-gradient(135deg, #e2e8f0 0%, #f8fafc 100%)",
};

const companyName: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 20,
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const companyMeta: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontWeight: 700,
  fontSize: 13,
};

const companyBio: CSSProperties = {
  margin: "10px 0 0",
  color: "#475569",
  lineHeight: 1.8,
};

const companyLinks: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const linkPill: CSSProperties = {
  textDecoration: "none",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#0f172a",
  padding: "9px 12px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 13,
};

const linkPillBtn: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#0f172a",
  padding: "9px 12px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const applyCard: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  borderRadius: 26,
  padding: 22,
  boxShadow: "0 12px 35px rgba(2,6,23,0.06)",
  border: "1px solid #eef2f7",
};

const formGrid: CSSProperties = {
  display: "grid",
  gap: 14,
};

const field: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const fieldLabel: CSSProperties = {
  color: "#0f172a",
  fontWeight: 800,
  fontSize: 14,
};

const input: CSSProperties = {
  width: "100%",
  border: "1px solid #dbe3ee",
  borderRadius: 14,
  padding: "12px 14px",
  outline: "none",
  fontSize: 14,
  background: "#fff",
  color: "#0f172a",
  boxSizing: "border-box",
};

const textarea: CSSProperties = {
  width: "100%",
  border: "1px solid #dbe3ee",
  borderRadius: 14,
  padding: "12px 14px",
  outline: "none",
  fontSize: 14,
  background: "#fff",
  color: "#0f172a",
  boxSizing: "border-box",
  resize: "vertical",
  minHeight: 120,
  lineHeight: 1.7,
};

const submitBtn: CSSProperties = {
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "white",
  border: "none",
  padding: "13px 16px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 900,
  boxShadow: "0 10px 25px rgba(37,99,235,0.20)",
};

const guestBox: CSSProperties = {
  background: "#f8fafc",
  border: "1px dashed #dbe3ee",
  borderRadius: 18,
  padding: 18,
};

const guestText: CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.8,
};

const guestActions: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const tipsCard: CSSProperties = {
  background: "white",
  borderRadius: 26,
  padding: 22,
  boxShadow: "0 12px 35px rgba(2,6,23,0.06)",
  border: "1px solid #eef2f7",
};

const tipsList: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: "#475569",
  lineHeight: 1.9,
};

const alreadyAppliedBanner: CSSProperties = {
  background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  padding: 14,
  borderRadius: 16,
  lineHeight: 1.7,
  marginBottom: 14,
};

const loadingCard: CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: 40,
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
  border: "1px solid #eef2f7",
};

const loadingSpinner: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "4px solid #dbe3ee",
  borderTopColor: "#2563eb",
  margin: "0 auto",
};

const emptyCard: CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: 40,
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
  border: "1px solid #eef2f7",
};

const toastStyle = (type: ToastType): CSSProperties => ({
  position: "fixed",
  top: 18,
  right: 18,
  zIndex: 1400,
  background:
    type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#2563eb",
  color: "white",
  padding: "10px 14px",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
  fontWeight: 700,
});

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const sectionSubtitle: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.6,
};