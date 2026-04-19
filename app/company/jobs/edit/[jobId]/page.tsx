"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type ToastType = "success" | "error" | "info";

export default function EditJobPage() {
  return (
    <ProtectedRoute role="company">
      <EditJobInner />
    </ProtectedRoute>
  );
}

function EditJobInner() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [form, setForm] = useState({
    title: "",
    role_type: "",
    location: "",
    is_remote: false,
    salary_min: "",
    salary_max: "",
    description: "",
    task_required: false,
    task_title: "",
    task_instructions: "",
    expires_at: "",
    status: "active",
  });

  useEffect(() => {
    if (jobId) loadJob();
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [jobId]);

  function showToast(message: string, type: ToastType = "info", duration = 3000) {
    setToast({ message, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), duration);
  }

  async function loadJob() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: job, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error || !job) {
        showToast("Job not found", "error");
        router.push("/company/dashboard");
        return;
      }

      if (job.company_id !== user.id) {
        showToast("You don't have permission to edit this job", "error");
        router.push("/company/dashboard");
        return;
      }

      setForm({
        title: job.title || "",
        role_type: job.role_type || "",
        location: job.location || "",
        is_remote: job.is_remote || false,
        salary_min: job.salary_min?.toString() || "",
        salary_max: job.salary_max?.toString() || "",
        description: job.description || "",
        task_required: job.task_required || false,
        task_title: job.task_title || "",
        task_instructions: job.task_instructions || "",
        expires_at: job.expires_at ? job.expires_at.split("T")[0] : "",
        status: job.status || "active",
      });
    } catch (err) {
      console.error(err);
      showToast("Failed to load job", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      showToast("Title and description are required", "error");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("jobs")
        .update({
          title: form.title,
          role_type: form.role_type || null,
          location: form.location || null,
          is_remote: form.is_remote,
          salary_min: form.salary_min ? parseInt(form.salary_min) : null,
          salary_max: form.salary_max ? parseInt(form.salary_max) : null,
          description: form.description,
          task_required: form.task_required,
          task_title: form.task_title || null,
          task_instructions: form.task_instructions || null,
          expires_at: form.expires_at || null,
          status: form.status,
        })
        .eq("id", jobId)
        .eq("company_id", user.id);

      if (error) throw error;

      showToast("Job updated successfully ✅", "success");
      setTimeout(() => router.push("/company/dashboard"), 1200);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update job", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading job details...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Edit Job</h1>
            <p style={styles.subtitle}>Update your job posting – changes will appear immediately.</p>
          </div>
          <button onClick={() => router.push("/company/dashboard")} style={styles.cancelBtn}>
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Basic Information</h2>
            <div style={styles.twoColGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Job Title *</label>
                <input name="title" value={form.title} onChange={handleChange} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Role Type</label>
                <input name="role_type" value={form.role_type} onChange={handleChange} style={styles.input} placeholder="e.g., Full-time, Part-time" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Location</label>
                <input name="location" value={form.location} onChange={handleChange} style={styles.input} placeholder="City, Country or Remote" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Salary Range</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input name="salary_min" value={form.salary_min} onChange={handleChange} style={styles.input} placeholder="Min" type="number" />
                  <input name="salary_max" value={form.salary_max} onChange={handleChange} style={styles.input} placeholder="Max" type="number" />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Work Mode</label>
                <select name="is_remote" value={form.is_remote ? "remote" : "onsite"} onChange={(e) => setForm(prev => ({ ...prev, is_remote: e.target.value === "remote" }))} style={styles.select}>
                  <option value="onsite">On‑site / Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} style={styles.select}>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Job Description *</h2>
            <textarea name="description" value={form.description} onChange={handleChange} style={styles.textarea} rows={6} required />
          </div>

          <div style={styles.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <input
                type="checkbox"
                name="task_required"
                checked={form.task_required}
                onChange={handleChange}
                style={{ width: 18, height: 18 }}
              />
              <label style={{ fontWeight: 600 }}>Require skill task submission</label>
            </div>
            {form.task_required && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={styles.field}>
                  <label style={styles.label}>Task Title</label>
                  <input name="task_title" value={form.task_title} onChange={handleChange} style={styles.input} placeholder="e.g., Build a small React component" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Task Instructions</label>
                  <textarea name="task_instructions" value={form.task_instructions} onChange={handleChange} style={styles.textarea} rows={4} placeholder="Detailed instructions for the candidate" />
                </div>
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Expiration Date</h2>
            <div style={styles.field}>
              <input name="expires_at" value={form.expires_at} onChange={handleChange} type="date" style={styles.input} />
              <p style={styles.hint}>Leave empty for no expiry.</p>
            </div>
          </div>

          <div style={styles.formActions}>
            <button type="button" onClick={() => router.push("/company/dashboard")} style={styles.cancelBtnLarge}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {toast && (
          <div style={styles.toastContainer}>
            <div style={{ ...styles.toastBox, background: toast.type === "success" ? "#10b981" : toast.type === "error" ? "#ef4444" : "#2563eb" }}>
              {toast.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  },
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "32px 24px",
  },
  loading: {
    textAlign: "center" as const,
    padding: 60,
    color: "#64748b",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    flexWrap: "wrap" as const,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#0f172a",
    margin: 0,
  },
  subtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 14,
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #e2e8f0",
    padding: "8px 16px",
    borderRadius: 40,
    cursor: "pointer",
    fontWeight: 600,
    color: "#0f172a",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
  },
  cardTitle: {
    margin: "0 0 20px 0",
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.01em",
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
  },
  input: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  select: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    background: "#fff",
  },
  textarea: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
    resize: "vertical" as const,
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    margin: "4px 0 0",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtnLarge: {
    padding: "10px 20px",
    borderRadius: 40,
    background: "#f1f5f9",
    color: "#0f172a",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
  },
  saveBtn: {
    padding: "10px 20px",
    borderRadius: 40,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  toastContainer: {
    position: "fixed" as const,
    top: 20,
    right: 20,
    zIndex: 1400,
  },
  toastBox: {
    padding: "10px 18px",
    borderRadius: 40,
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
  },
};