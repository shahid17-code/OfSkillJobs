"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ToastType = "success" | "error" | "info";

type CompanyUser = {
  id: string;
  role?: string | null;
  username?: string | null;
  company_name?: string | null;
  industry?: string | null;
  location?: string | null;
};

type JobFormState = {
  title: string;
  role_type: string;
  location: string;
  is_remote: boolean;
  salary_min: string;
  salary_max: string;
  description: string;
  task_required: boolean;
  task_title: string;
  task_instructions: string;
  task_type: string;
  expires_at: string;
};

type CreatedJob = {
  id: string;
  title: string;
  slug: string;
  expires_at: string | null;
};

const initialForm: JobFormState = {
  title: "",
  role_type: "",
  location: "",
  is_remote: true,
  salary_min: "",
  salary_max: "",
  description: "",
  task_required: true,
  task_title: "",
  task_instructions: "",
  task_type: "custom",
  expires_at: "",
};

const TASK_PRESETS: Record<
  string,
  {
    label: string;
    taskTitle: string;
    taskType: string;
    instructions: string;
  }
> = {
  developer: {
    label: "Developer task",
    taskTitle: "Build a small feature or fix a bug",
    taskType: "coding",
    instructions:
      "1. Build a small feature related to this role.\n2. Keep the code clean and readable.\n3. Add short notes on your approach.\n4. Share your submission through a Google Drive link.\n5. Include any screenshots, code files, or demo notes inside the Drive folder.",
  },
  telecaller: {
    label: "Telecaller task",
    taskTitle: "Handle a mock customer call",
    taskType: "mock_call",
    instructions:
      "1. Read the given customer scenario carefully.\n2. Prepare a short call script.\n3. Show confidence, clarity, and polite communication.\n4. Record your response and upload it to Google Drive.\n5. Add a short note explaining your approach.",
  },
  designer: {
    label: "Designer task",
    taskTitle: "Create a simple visual concept",
    taskType: "design",
    instructions:
      "1. Review the brand or problem statement.\n2. Create a design concept that solves the task.\n3. Keep the layout clean and professional.\n4. Export the final work and place it in Google Drive.\n5. Include a short explanation of design choices.",
  },
  sales: {
    label: "Sales task",
    taskTitle: "Respond to a sales scenario",
    taskType: "scenario",
    instructions:
      "1. Study the customer objection or sales situation.\n2. Write or record your response professionally.\n3. Focus on persuasion, clarity, and trust.\n4. Submit the response using a Google Drive link.\n5. Add a short breakdown of your strategy.",
  },
  custom: {
    label: "Custom task",
    taskTitle: "Custom skill-based task",
    taskType: "custom",
    instructions:
      "1. Complete the task exactly as described.\n2. Keep your submission organized.\n3. Add any supporting files inside a Drive folder.\n4. Share the folder link only.\n5. Mention anything important in the note section.",
  },
};

export default function NewCompanyJobPage() {
  const router = useRouter();

  const [company, setCompany] = useState<CompanyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<CreatedJob | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [manualTask, setManualTask] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const [form, setForm] = useState<JobFormState>(initialForm);

  useEffect(() => {
    loadCompany();
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(message: string, type: ToastType = "info", duration = 2800) {
    setToast({ message, type });

    if (toastTimer.current) window.clearTimeout(toastTimer.current);

    toastTimer.current = window.setTimeout(() => setToast(null), duration);
  }

  async function loadCompany() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, role, username, company_name, industry, location")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load company account:", error);
        showToast("Failed to load account", "error");
        router.replace("/");
        return;
      }

      if (!data || data.role !== "company") {
        showToast("Only company accounts can create jobs", "error");
        router.replace("/");
        return;
      }

      setCompany(data);
    } catch (err) {
      console.error("Unexpected load error:", err);
      showToast("Something went wrong", "error");
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof JobFormState>(key: K, value: JobFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(key: keyof typeof TASK_PRESETS) {
    const preset = TASK_PRESETS[key];
    setManualTask(false);

    updateField("task_required", true);
    updateField("task_type", preset.taskType);
    updateField("task_title", preset.taskTitle);
    updateField("task_instructions", preset.instructions);
  }

  function enableManualTask() {
    setManualTask(true);
    updateField("task_required", true);
    updateField("task_type", "custom");
  }

  function setExpiry(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    updateField("expires_at", toDatetimeLocalValue(date));
  }

  function toDatetimeLocalValue(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const salaryPreview = useMemo(() => {
    const min = form.salary_min.trim();
    const max = form.salary_max.trim();

    if (!min && !max) return "Salary not disclosed";
    if (min && max) return `₹${min} - ₹${max}`;
    if (min) return `From ₹${min}`;
    return `Up to ₹${max}`;
  }, [form.salary_min, form.salary_max]);

  const deadlinePreview = useMemo(() => {
    if (!form.expires_at) return "No expiry set";
    const d = new Date(form.expires_at);
    return isNaN(d.getTime()) ? "Invalid expiry" : d.toLocaleString();
  }, [form.expires_at]);

  const canSubmit = useMemo(() => {
    if (!form.title.trim()) return false;
    if (!form.role_type.trim()) return false;
    if (!form.description.trim() || form.description.trim().length < 20) return false;

    if (form.task_required) {
      if (!form.task_title.trim()) return false;
      if (!form.task_instructions.trim()) return false;
    }

    return true;
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!company) {
      showToast("Company account not loaded", "error");
      return;
    }

    const title = form.title.trim();
    const roleType = form.role_type.trim();
    const location = form.location.trim();
    const description = form.description.trim();
    const taskTitle = form.task_title.trim();
    const taskInstructions = form.task_instructions.trim();

    if (!title) {
      showToast("Job title is required", "error");
      return;
    }

    if (!roleType) {
      showToast("Role type is required", "error");
      return;
    }

    if (description.length < 20) {
      showToast("Job description must be at least 20 characters", "error");
      return;
    }

    if (form.task_required && !taskTitle) {
      showToast("Task title is required", "error");
      return;
    }

    if (form.task_required && !taskInstructions) {
      showToast("Task instructions are required", "error");
      return;
    }

    try {
      setSubmitting(true);

      const expiresAt = form.expires_at
        ? new Date(form.expires_at).toISOString()
        : null;

      const payload = {
        company_id: company.id,
        title,
        role_type: roleType,
        location,
        is_remote: form.is_remote,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        description,
        task_required: form.task_required,
        task_title: form.task_required ? taskTitle : null,
        task_instructions: form.task_required ? taskInstructions : null,
        task_type: form.task_required ? form.task_type : null,
        expires_at: expiresAt,
        status: "active",
      };

      const { data, error } = await supabase
        .from("jobs")
        .insert(payload)
        .select("id, title, slug, expires_at")
        .single();

      if (error) {
        console.error("Job creation error:", error);
        showToast(error.message || "Failed to create job", "error");
        return;
      }

      setCreatedJob(data);
      showToast("Job posted successfully", "success");
      setForm(initialForm);
      setManualTask(false);
    } catch (err) {
      console.error("Unexpected submit error:", err);
      showToast("Something went wrong while creating the job", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={pageShell}>
        <div style={loadingCard}>Loading company dashboard...</div>
      </div>
    );
  }

  return (
    <div style={pageShell}>
      <div style={headerCard}>
        <div>
          <p style={eyebrow}>Company hiring</p>
          <h1 style={pageTitle}>Post a skill-based job</h1>
          <p style={pageSubtitle}>
            Create roles where candidates prove skills through real tasks, mock calls,
            project work, or custom scenarios.
          </p>
        </div>

        <div style={headerActions}>
          <button
            type="button"
            style={secondaryButton}
            onClick={() => router.push(company?.username ? `/company/${company.username}` : "/")}
          >
            View Company Profile
          </button>

          <button
            type="button"
            style={ghostButton}
            onClick={() => router.push("/hire")}
          >
            Back to Hire
          </button>
        </div>
      </div>

      <div style={topStatsGrid}>
        <StatCard label="Company" value={company?.company_name || "Your company"} />
        <StatCard label="Industry" value={company?.industry || "Not set"} />
        <StatCard label="Location" value={company?.location || "Not set"} />
        <StatCard label="Posting mode" value="Task-based hiring" />
      </div>

      <div style={layoutGrid}>
        <form style={formCard} onSubmit={handleSubmit}>
          <SectionTitle
            title="Job details"
            subtitle="Fill the core role information first"
          />

          <div style={fieldGrid}>
            <Field label="Job title *">
              <input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Example: Frontend Developer"
                style={input}
              />
            </Field>

            <Field label="Role type *">
              <input
                value={form.role_type}
                onChange={(e) => updateField("role_type", e.target.value)}
                placeholder="Example: Developer, Telecaller, Designer"
                style={input}
              />
            </Field>

            <Field label="Location">
              <input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="Example: Mumbai, Remote, Hybrid"
                style={input}
              />
            </Field>

            <Field label="Work mode">
              <div style={toggleRow}>
                <button
                  type="button"
                  onClick={() => updateField("is_remote", true)}
                  style={form.is_remote ? toggleActive : toggleInactive}
                >
                  Remote
                </button>
                <button
                  type="button"
                  onClick={() => updateField("is_remote", false)}
                  style={!form.is_remote ? toggleActive : toggleInactive}
                >
                  On-site / Hybrid
                </button>
              </div>
            </Field>

            <Field label="Salary minimum">
              <input
                type="number"
                min="0"
                value={form.salary_min}
                onChange={(e) => updateField("salary_min", e.target.value)}
                placeholder="Example: 30000"
                style={input}
              />
            </Field>

            <Field label="Salary maximum">
              <input
                type="number"
                min="0"
                value={form.salary_max}
                onChange={(e) => updateField("salary_max", e.target.value)}
                placeholder="Example: 70000"
                style={input}
              />
            </Field>
          </div>

          <Field label="Job description *">
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the role, team expectations, daily responsibilities, and who should apply."
              style={{ ...textarea, minHeight: 160 }}
            />
          </Field>

          <SectionTitle
            title="Skill task system"
            subtitle="This is the part that makes OfSkillJob different"
          />

          <div style={taskToolbar}>
            <button
              type="button"
              onClick={() => applyPreset("developer")}
              style={presetButton}
            >
              Developer task
            </button>
            <button
              type="button"
              onClick={() => applyPreset("telecaller")}
              style={presetButton}
            >
              Telecaller task
            </button>
            <button
              type="button"
              onClick={() => applyPreset("designer")}
              style={presetButton}
            >
              Designer task
            </button>
            <button
              type="button"
              onClick={() => applyPreset("sales")}
              style={presetButton}
            >
              Sales task
            </button>
            <button
              type="button"
              onClick={() => applyPreset("custom")}
              style={presetButton}
            >
              Custom task
            </button>
            <button
              type="button"
              onClick={enableManualTask}
              style={manualTaskButton}
            >
              Write my own task
            </button>
          </div>

          {manualTask && form.task_required && (
            <p style={manualTaskHint}>
              Manual mode is active. You can describe the task, title, and requirements in your own way.
            </p>
          )}

          <div style={taskSwitchCard}>
            <div>
              <h3 style={switchTitle}>Task required</h3>
              <p style={switchSubtitle}>
                Ask candidates to submit work through a Google Drive link.
              </p>
            </div>

            <button
              type="button"
              onClick={() => updateField("task_required", !form.task_required)}
              style={form.task_required ? switchActive : switchInactive}
            >
              {form.task_required ? "Enabled" : "Disabled"}
            </button>
          </div>

          {form.task_required && (
            <div style={fieldGrid}>
              <Field label="Task type">
                <select
                  value={form.task_type}
                  onChange={(e) => updateField("task_type", e.target.value)}
                  style={input}
                >
                  <option value="coding">Coding</option>
                  <option value="mock_call">Mock call</option>
                  <option value="design">Design</option>
                  <option value="scenario">Scenario</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>

              <Field label="Task title *">
                <input
                  value={form.task_title}
                  onChange={(e) => updateField("task_title", e.target.value)}
                  placeholder="Example: Build a small dashboard"
                  style={input}
                />
              </Field>
            </div>
          )}

          {form.task_required && (
            <Field label="Task instructions / step-by-step guide *">
              <textarea
                value={form.task_instructions}
                onChange={(e) => updateField("task_instructions", e.target.value)}
                placeholder="Write the exact task here. Include what the candidate should do, how to submit, and what to include in the Drive folder."
                style={{ ...textarea, minHeight: 220 }}
              />
            </Field>
          )}

          <SectionTitle
            title="Expiry control"
            subtitle="Jobs can expire automatically so your listings stay clean"
          />

          <div style={expiryGrid}>
            <button type="button" style={expiryQuickBtn} onClick={() => setExpiry(7)}>
              7 days
            </button>
            <button type="button" style={expiryQuickBtn} onClick={() => setExpiry(14)}>
              14 days
            </button>
            <button type="button" style={expiryQuickBtn} onClick={() => setExpiry(30)}>
              30 days
            </button>
            <button
              type="button"
              style={expiryClearBtn}
              onClick={() => updateField("expires_at", "")}
            >
              No expiry
            </button>
          </div>

          <Field label="Expire on">
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => updateField("expires_at", e.target.value)}
              style={input}
            />
          </Field>

          <div style={hintBox}>
            <strong>Good hiring flow:</strong> candidates apply with a Google Drive link,
            and you review the task submission before shortlisting.
          </div>

          <div style={submitRow}>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              style={submitting || !canSubmit ? submitBtnDisabled : submitBtn}
            >
              {submitting ? "Posting job..." : "Post Job"}
            </button>

            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                setManualTask(false);
              }}
              style={resetBtn}
            >
              Reset
            </button>
          </div>
        </form>

        <aside style={previewColumn}>
          <div style={previewCard}>
            <SectionTitle
              title="Live preview"
              subtitle="How this role will feel to candidates"
            />

            <div style={previewHero}>
              <div style={previewTop}>
                <div style={previewLogo}>
                  {company?.company_name?.charAt(0)?.toUpperCase() || "O"}
                </div>

                <div style={previewMeta}>
                  <p style={previewCompany}>{company?.company_name || "Your company"}</p>
                  <p style={previewIndustry}>
                    {company?.industry || "Industry"} • {company?.location || "Location"}
                  </p>
                </div>
              </div>

              <h3 style={previewTitle}>{form.title || "Job title preview"}</h3>
              <p style={previewRole}>
                {form.role_type || "Role type"} {form.is_remote ? "• Remote" : "• On-site"}
              </p>

              <p style={previewText}>
                {form.description ||
                  "Write a clean role description. Keep it practical and focused on what the candidate will actually do."}
              </p>

              <div style={previewPills}>
                <span style={pill}>{salaryPreview}</span>
                <span style={pill}>{deadlinePreview}</span>
                <span style={pill}>
                  {form.task_required ? "Task required" : "No task"}
                </span>
              </div>
            </div>
          </div>

          <div style={previewCard}>
            <SectionTitle
              title="Application experience"
              subtitle="What candidates will see during apply"
            />
            <div style={infoStack}>
              <InfoRow label="Submission type" value="Google Drive link" />
              <InfoRow
                label="Review style"
                value="Task-first screening before shortlisting"
              />
              <InfoRow
                label="Data stored"
                value="Only link + text, no file upload burden"
              />
              <InfoRow
                label="Expiry"
                value="Auto-close jobs after chosen date"
              />
            </div>
          </div>

          {createdJob && (
            <div style={successCard}>
              <SectionTitle
                title="Job created"
                subtitle="You can keep posting more jobs or manage this one later"
              />
              <div style={successInner}>
                <div style={successBadge}>Posted successfully</div>
                <div style={successText}>
                  <strong>{createdJob.title}</strong>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>
                    Slug: <span style={{ fontWeight: 700 }}>{createdJob.slug}</span>
                  </p>
                </div>

                <div style={successActions}>
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={() => router.push(company?.username ? `/company/${company.username}` : "/")}
                  >
                    Back to Company
                  </button>
                  <button
                    type="button"
                    style={ghostButton}
                    onClick={() => setCreatedJob(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {toast && <div style={toastStyle(toast.type)}>{toast.message}</div>}
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

function SectionTitle({
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={field}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
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

const pageShell: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: 20,
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
};

const loadingCard: React.CSSProperties = {
  padding: 50,
  textAlign: "center",
  background: "white",
  borderRadius: 20,
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
};

const headerCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-start",
  background: "white",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
  marginBottom: 18,
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  color: "#2563eb",
  fontWeight: 800,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  fontSize: 12,
};

const pageTitle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 34,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "#0f172a",
};

const pageSubtitle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#475569",
  lineHeight: 1.7,
  maxWidth: 780,
};

const headerActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const topStatsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const statCard: React.CSSProperties = {
  background: "white",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
};

const statValue: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#0f172a",
};

const statLabel: React.CSSProperties = {
  marginTop: 6,
  color: "#64748b",
  fontSize: 13,
};

const layoutGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 0.9fr",
  gap: 18,
  alignItems: "start",
};

const formCard: React.CSSProperties = {
  background: "white",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
};

const previewColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const previewCard: React.CSSProperties = {
  background: "white",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
};

const previewHero: React.CSSProperties = {
  background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
  borderRadius: 18,
  padding: 18,
  border: "1px solid #e2e8f0",
};

const previewTop: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

const previewLogo: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 16,
  background: "#0f172a",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 22,
};

const previewMeta: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

const previewCompany: React.CSSProperties = {
  margin: 0,
  fontWeight: 800,
  fontSize: 16,
  color: "#0f172a",
};

const previewIndustry: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 13,
};

const previewTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const previewRole: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#475569",
  fontWeight: 700,
};

const previewText: React.CSSProperties = {
  margin: "14px 0 0",
  color: "#334155",
  lineHeight: 1.7,
};

const previewPills: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 14,
};

const pill: React.CSSProperties = {
  background: "white",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "7px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
};

const infoStack: React.CSSProperties = {
  display: "grid",
  gap: 10,
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

const successCard: React.CSSProperties = {
  background: "linear-gradient(135deg, #ecfdf5, #f0fdf4)",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
};

const successInner: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const successBadge: React.CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  background: "#d1fae5",
  color: "#065f46",
  borderRadius: 999,
  padding: "6px 10px",
  fontWeight: 800,
  fontSize: 12,
};

const successText: React.CSSProperties = {
  color: "#0f172a",
};

const successActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: "#0f172a",
};

const sectionSubtitle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  lineHeight: 1.6,
};

const fieldGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginBottom: 14,
};

const field: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 14,
};

const fieldLabel: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 14,
};

const input: React.CSSProperties = {
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

const textarea: React.CSSProperties = {
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
  lineHeight: 1.7,
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const toggleActive: React.CSSProperties = {
  background: "#0f172a",
  color: "white",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid #0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

const toggleInactive: React.CSSProperties = {
  background: "#f8fafc",
  color: "#0f172a",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontWeight: 700,
  cursor: "pointer",
};

const taskToolbar: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 14,
};

const presetButton: React.CSSProperties = {
  background: "#eef2ff",
  color: "#3730a3",
  border: "1px solid #dbeafe",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const manualTaskButton: React.CSSProperties = {
  background: "#ecfeff",
  color: "#155e75",
  border: "1px solid #cffafe",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const manualTaskHint: React.CSSProperties = {
  margin: "0 0 14px",
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.6,
};

const taskSwitchCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  marginBottom: 14,
};

const switchTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  color: "#0f172a",
};

const switchSubtitle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  lineHeight: 1.6,
};

const switchActive: React.CSSProperties = {
  background: "#16a34a",
  color: "white",
  border: "1px solid #16a34a",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const switchInactive: React.CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const expiryGrid: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 14,
};

const expiryQuickBtn: React.CSSProperties = {
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "9px 12px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const expiryClearBtn: React.CSSProperties = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  padding: "9px 12px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const hintBox: React.CSSProperties = {
  background: "#eff6ff",
  color: "#1e3a8a",
  border: "1px solid #bfdbfe",
  padding: 14,
  borderRadius: 16,
  lineHeight: 1.7,
  marginBottom: 14,
};

const submitRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const submitBtn: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const submitBtnDisabled: React.CSSProperties = {
  background: "#94a3b8",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "not-allowed",
};

const resetBtn: React.CSSProperties = {
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "12px 18px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  background: "#0f172a",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const toastStyle = (type: ToastType): React.CSSProperties => ({
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