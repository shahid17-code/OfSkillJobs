"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Skill suggestions (includes programming + soft skills)
const SKILL_SUGGESTIONS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java", "C#",
  "PHP", "Ruby", "Go", "Rust", "Swift", "Kotlin", "HTML/CSS", "Tailwind CSS",
  "MongoDB", "PostgreSQL", "MySQL", "Firebase", "GraphQL", "REST API", "Docker",
  "Kubernetes", "AWS", "Azure", "GCP", "Git", "Figma", "UI/UX", "Machine Learning",
  "Communication", "Leadership", "Problem Solving", "Team Management", "Project Management",
  "Critical Thinking", "Time Management", "Adaptability", "Creativity", "Conflict Resolution",
  "Data Analysis", "Sales", "Marketing", "Customer Service", "Negotiation", "Presentation"
];

const EXPERIENCE_TITLES = [
  "Software Developer", "Frontend Developer", "Full Stack Developer", "Data Entry Operator",
  "Telecaller / Customer Support", "Sales Executive", "Digital Marketing Specialist",
  "Project Coordinator", "Graphic Designer", "Content Writer", "Other"
];

const DEGREE_OPTIONS = [
  "10th", "12th", "Diploma", "Bachelor of Arts (BA)", "Bachelor of Science (BSc)",
  "Bachelor of Commerce (BCom)", "Bachelor of Engineering (BE)", "Bachelor of Technology (BTech)",
  "Bachelor of Computer Applications (BCA)", "Bachelor of Business Administration (BBA)",
  "Master of Arts (MA)", "Master of Science (MSc)", "Master of Commerce (MCom)",
  "Master of Engineering (ME)", "Master of Technology (MTech)", "Master of Computer Applications (MCA)",
  "Master of Business Administration (MBA)", "PhD", "Post Graduate Diploma", "Other"
];

const LANGUAGE_SUGGESTIONS = [
  "English", "Hindi", "Urdu", "Bengali", "Tamil", "Telugu", "Marathi",
  "Gujarati", "Kannada", "Malayalam", "Punjabi", "Odia", "Assamese", "Sanskrit"
];

export default function EditProfile() {
  const router = useRouter();
  const [form, setForm] = useState<any>({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    profession: "",
    headline: "",
    bio: "",
    location: "",
    skills: [],
    languages: [],
    github: "",
    linkedin: "",
    website: "",
    intro_video_url: "",
    experience: [],
    education: [],
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [languageSuggestions, setLanguageSuggestions] = useState<string[]>([]);

  useEffect(() => {
    loadProfile();
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (skillInput.trim()) {
      const filtered = SKILL_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(skillInput.toLowerCase()) &&
        !form.skills.includes(s)
      );
      setSkillSuggestions(filtered.slice(0, 5));
    } else {
      setSkillSuggestions([]);
    }
  }, [skillInput, form.skills]);

  useEffect(() => {
    if (languageInput.trim()) {
      const filtered = LANGUAGE_SUGGESTIONS.filter(l =>
        l.toLowerCase().includes(languageInput.toLowerCase()) &&
        !form.languages.includes(l)
      );
      setLanguageSuggestions(filtered.slice(0, 5));
    } else {
      setLanguageSuggestions([]);
    }
  }, [languageInput, form.languages]);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
      if (data) {
        setForm({
          full_name: data.full_name || "",
          username: data.username || "",
          email: data.email || "",
          phone: data.phone || "",
          profession: data.profession || "",
          headline: data.headline || "",
          bio: data.bio || "",
          location: data.location || "",
          skills: Array.isArray(data.skills) ? data.skills : (data.skills ? data.skills.split(",").map((s: string) => s.trim()) : []),
          languages: Array.isArray(data.languages) ? data.languages : (data.languages ? data.languages.split(",").map((l: string) => l.trim()) : []),
          github: data.github || "",
          linkedin: data.linkedin || "",
          website: data.website || "",
          intro_video_url: data.intro_video_url || "",
          experience: Array.isArray(data.experience) ? data.experience : data.experience ? [data.experience] : [],
          education: Array.isArray(data.education) ? data.education : data.education ? [data.education] : [],
        });
      }
    } catch (err) {
      console.error("loadProfile error:", err);
      showToast("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: "success" | "error" | "info" = "info", duration = 3200) {
    setToast({ message, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), duration);
  }

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm({ ...form, skills: [...form.skills, trimmed] });
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setForm({ ...form, skills: form.skills.filter((s: string) => s !== skill) });
  }

  function handleSkillKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (skillInput.trim()) addSkill(skillInput);
    }
  }

  function addLanguage(lang: string) {
    const trimmed = lang.trim();
    if (trimmed && !form.languages.includes(trimmed)) {
      setForm({ ...form, languages: [...form.languages, trimmed] });
    }
    setLanguageInput("");
  }

  function removeLanguage(lang: string) {
    setForm({ ...form, languages: form.languages.filter((l: string) => l !== lang) });
  }

  function handleLanguageKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (languageInput.trim()) addLanguage(languageInput);
    }
  }

  function addExperience() {
    setForm({
      ...form,
      experience: [...(form.experience || []), { title: "", company: "", startDate: "", endDate: "", description: "", customTitle: "" }],
    });
  }
  function updateExperience(index: number, field: string, value: string) {
    const updated = (form.experience || []).slice();
    updated[index] = { ...(updated[index] || {}), [field]: value };
    if (field === "title" && value !== "Other") {
      updated[index].customTitle = "";
    }
    setForm({ ...form, experience: updated });
  }
  function removeExperience(index: number) {
    const updated = (form.experience || []).slice();
    updated.splice(index, 1);
    setForm({ ...form, experience: updated });
  }

  function addEducation() {
    setForm({
      ...form,
      education: [...(form.education || []), { school: "", degree: "", startDate: "", endDate: "", description: "", customDegree: "" }],
    });
  }
  function updateEducation(index: number, field: string, value: string) {
    const updated = (form.education || []).slice();
    updated[index] = { ...(updated[index] || {}), [field]: value };
    if (field === "degree" && value !== "Other") {
      updated[index].customDegree = "";
    }
    setForm({ ...form, education: updated });
  }
  function removeEducation(index: number) {
    const updated = (form.education || []).slice();
    updated.splice(index, 1);
    setForm({ ...form, education: updated });
  }

  function validate() {
    if (!form.full_name?.trim()) return "Full name is required.";
    if (!form.username?.trim()) return "Username is required.";
    if (!form.email?.trim()) return "Email is required.";
    if (!form.phone?.trim()) return "Phone is required.";
    return null;
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    const vErr = validate();
    if (vErr) {
      showToast(vErr, "error");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        full_name: form.full_name,
        name: form.full_name,
        username: form.username,
        email: form.email,
        phone: form.phone,
        profession: form.profession,
        headline: form.headline,
        bio: form.bio,
        location: form.location,
        skills: form.skills,
        languages: form.languages,
        github: form.github,
        linkedin: form.linkedin,
        website: form.website,
        intro_video_url: form.intro_video_url,
        experience: form.experience || [],
        education: form.education || [],
      };
      const { error } = await supabase.from("users").update(payload).eq("id", user?.id);
      if (error) {
        console.error("Supabase update error:", error);
        showToast("Failed to update profile — " + (error.message || "server error"), "error");
      } else {
        showToast("Profile updated successfully ✅", "success");
        setTimeout(() => router.push("/profile"), 900);
      }
    } catch (err) {
      console.error("handleSubmit error:", err);
      showToast("Unexpected error — check console", "error");
    } finally {
      setSaving(false);
    }
  }

  function openPreview() {
    setShowPreview(true);
  }
  function closePreview() {
    setShowPreview(false);
  }

  function printPreview() {
    if (!previewRef.current) {
      window.print();
      return;
    }
    const content = previewRef.current.innerHTML;
    const style = `
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; padding: 28px; color: #0f172a; background: #fff; }
        .cv-header { margin-bottom: 20px; }
        .cv-name { font-size: 28px; font-weight: 700; margin: 0; }
        .cv-headline { color: #475569; margin: 6px 0 12px; }
        .cv-section { margin-top: 20px; }
        .cv-section-title { font-size: 18px; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
        .skill-tag, .lang-tag { display: inline-block; background: #eef2ff; padding: 6px 12px; border-radius: 40px; margin: 0 8px 8px 0; font-size: 13px; }
        .exp-item { margin-bottom: 16px; }
        .muted { color: #64748b; font-size: 13px; }
        .link-badge { background: #f1f5f9; padding: 6px 12px; border-radius: 40px; text-decoration: none; color: #0f172a; display: inline-block; margin-right: 8px; }
        .video-badge { background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 40px; text-decoration: none; display: inline-block; }
      </style>
    `;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      showToast("Popup blocked — allow popups for printing", "error");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head><title>${form.full_name || "Profile"} - Resume</title>${style}</head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  function formatDate(d?: string) {
    if (!d) return "";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString();
    } catch {
      return d;
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.avatar}>✏️</div>
            <div>
              <h1 style={styles.title}>Edit Profile</h1>
              <p style={styles.subtitle}>
                Update your information — this is what recruiters will see.
              </p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button onClick={openPreview} style={styles.previewBtn}>
              Preview CV
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Personal Information */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Personal Information</h2>
            <div style={styles.twoColGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Full name <span style={{ color: "#ef4444" }}>*</span></label>
                <input name="full_name" value={form.full_name} onChange={handleChange} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Username <span style={{ color: "#ef4444" }}>*</span></label>
                <input name="username" value={form.username} onChange={handleChange} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  style={{ ...styles.input, background: "#f1f5f9", cursor: "not-allowed" }}
                  disabled
                />
                <p style={styles.hint}>Email cannot be changed after account creation.</p>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Phone <span style={{ color: "#ef4444" }}>*</span></label>
                <input name="phone" value={form.phone} onChange={handleChange} style={styles.input} required placeholder="+91 98765 43210" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Profession</label>
                <input name="profession" value={form.profession} onChange={handleChange} style={styles.input} placeholder="e.g., Software Engineer, Telecaller, Data Entry" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Headline</label>
                <input name="headline" value={form.headline} onChange={handleChange} style={styles.input} placeholder="Short tagline" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Location</label>
                <input name="location" value={form.location} onChange={handleChange} style={styles.input} placeholder="City, Country" />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Bio</h2>
            <textarea name="bio" value={form.bio} onChange={handleChange} style={styles.textarea} rows={4} placeholder="Short professional summary" />
          </div>

          {/* Skills Section – improved spacing */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Skills</h2>
            <div style={styles.skillContainer}>
              <div style={styles.skillTags}>
                {form.skills.map((skill: string, idx: number) => (
                  <span key={idx} style={styles.skillTag}>
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} style={styles.skillRemove}>✕</button>
                  </span>
                ))}
              </div>
              <div style={styles.skillInputWrapper}>
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Type a skill and press Enter or click Add"
                  style={styles.skillInput}
                />
                <button type="button" onClick={() => addSkill(skillInput)} style={styles.skillAddBtn}>Add</button>
              </div>
              {skillSuggestions.length > 0 && (
                <div style={styles.skillSuggestions}>
                  {skillSuggestions.map(sug => (
                    <button key={sug} type="button" onClick={() => addSkill(sug)} style={styles.suggestionChip}>
                      + {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Languages Section – improved spacing */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Languages</h2>
            <div style={styles.skillContainer}>
              <div style={styles.skillTags}>
                {form.languages.map((lang: string, idx: number) => (
                  <span key={idx} style={styles.skillTag}>
                    {lang}
                    <button type="button" onClick={() => removeLanguage(lang)} style={styles.skillRemove}>✕</button>
                  </span>
                ))}
              </div>
              <div style={styles.skillInputWrapper}>
                <input
                  type="text"
                  value={languageInput}
                  onChange={(e) => setLanguageInput(e.target.value)}
                  onKeyDown={handleLanguageKeyDown}
                  placeholder="Type a language and press Enter or click Add"
                  style={styles.skillInput}
                />
                <button type="button" onClick={() => addLanguage(languageInput)} style={styles.skillAddBtn}>Add</button>
              </div>
              {languageSuggestions.length > 0 && (
                <div style={styles.skillSuggestions}>
                  {languageSuggestions.map(sug => (
                    <button key={sug} type="button" onClick={() => addLanguage(sug)} style={styles.suggestionChip}>
                      + {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Links</h2>
            <div style={styles.twoColGrid}>
              <div style={styles.field}>
                <label style={styles.label}>GitHub</label>
                <input name="github" value={form.github} onChange={handleChange} style={styles.input} placeholder="https://github.com/username" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>LinkedIn</label>
                <input name="linkedin" value={form.linkedin} onChange={handleChange} style={styles.input} placeholder="https://linkedin.com/in/username" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Website / Portfolio</label>
                <input name="website" value={form.website} onChange={handleChange} style={styles.input} placeholder="https://your-portfolio.com" />
              </div>
            </div>
          </div>

          {/* Introduction Video */}
          <div style={{ ...styles.card, borderLeft: "4px solid #10b981" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>🎥</span>
              <div>
                <h2 style={{ ...styles.cardTitle, margin: 0 }}>Introduction Video</h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                  Record a short video (max 2 min) explaining your skills & projects. Upload to Google Drive and paste the shareable link below.
                </p>
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Google Drive video link</label>
              <input
                name="intro_video_url"
                value={form.intro_video_url}
                onChange={handleChange}
                style={styles.input}
                placeholder="https://drive.google.com/file/d/..."
              />
              <p style={{ ...styles.hint, color: "#10b981" }}>
                ✨ Candidates with a video introduction are <strong>2x more likely</strong> to get shortlisted.
              </p>
            </div>
          </div>

          {/* Experience */}
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.cardTitle}>Experience</h2>
              <button type="button" onClick={addExperience} style={styles.addBtn}>+ Add experience</button>
            </div>
            {(!form.experience || form.experience.length === 0) && (
              <p style={styles.emptyText}>No experiences added yet.</p>
            )}
            <div style={styles.entriesList}>
              {(form.experience || []).map((exp: any, i: number) => (
                <div key={i} style={styles.entryCard}>
                  <div style={styles.entryHeader}>
                    <div style={styles.twoColGrid}>
                      <div style={styles.field}>
                        <label style={styles.smallLabel}>Title</label>
                        <select
                          value={exp.title === "Other" ? "Other" : (exp.title || "")}
                          onChange={(e) => updateExperience(i, "title", e.target.value)}
                          style={styles.select}
                        >
                          <option value="">Select title</option>
                          {EXPERIENCE_TITLES.map(title => (
                            <option key={title} value={title}>{title}</option>
                          ))}
                        </select>
                        {exp.title === "Other" && (
                          <input
                            value={exp.customTitle || ""}
                            onChange={(e) => updateExperience(i, "customTitle", e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                updateExperience(i, "title", e.target.value.trim());
                              }
                            }}
                            placeholder="Enter your title"
                            style={{ ...styles.input, marginTop: 8 }}
                          />
                        )}
                      </div>
                      <div style={styles.field}>
                        <label style={styles.smallLabel}>Company</label>
                        <input value={exp.company || ""} onChange={(e) => updateExperience(i, "company", e.target.value)} style={styles.input} placeholder="Company name" />
                      </div>
                    </div>
                    <div style={styles.twoColGrid}>
                      <div style={styles.field}>
                        <label style={styles.smallLabel}>Start date</label>
                        <input type="date" value={exp.startDate || ""} onChange={(e) => updateExperience(i, "startDate", e.target.value)} style={styles.input} />
                      </div>
                      <div style={styles.field}>
                        <label style={styles.smallLabel}>End date</label>
                        <input type="date" value={exp.endDate || ""} onChange={(e) => updateExperience(i, "endDate", e.target.value)} style={styles.input} />
                      </div>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.smallLabel}>Description</label>
                      <textarea value={exp.description || ""} onChange={(e) => updateExperience(i, "description", e.target.value)} style={styles.textareaSmall} rows={2} placeholder="Key responsibilities and achievements" />
                    </div>
                    <div style={styles.entryActions}>
                      <button type="button" onClick={() => removeExperience(i)} style={styles.removeBtn}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.cardTitle}>Education</h2>
              <button type="button" onClick={addEducation} style={styles.addBtn}>+ Add education</button>
            </div>
            {(!form.education || form.education.length === 0) && (
              <p style={styles.emptyText}>No education records yet.</p>
            )}
            <div style={styles.entriesList}>
              {(form.education || []).map((edu: any, i: number) => (
                <div key={i} style={styles.entryCard}>
                  <div style={styles.entryHeader}>
                    <div style={styles.twoColGrid}>
                      <div style={styles.field}>
                        <label style={styles.smallLabel}>Degree</label>
                        <select
                          value={edu.degree === "Other" ? "Other" : (edu.degree || "")}
                          onChange={(e) => updateEducation(i, "degree", e.target.value)}
                          style={styles.select}
                        >
                          <option value="">Select degree</option>
                          {DEGREE_OPTIONS.map(deg => (
                            <option key={deg} value={deg}>{deg}</option>
                          ))}
                        </select>
                        {edu.degree === "Other" && (
                          <input
                            value={edu.customDegree || ""}
                            onChange={(e) => updateEducation(i, "customDegree", e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                updateEducation(i, "degree", e.target.value.trim());
                              }
                            }}
                            placeholder="Enter your degree"
                            style={{ ...styles.input, marginTop: 8 }}
                          />
                        )}
                      </div>
                      <div style={styles.field}>
                        <label style={styles.smallLabel}>School</label>
                        <input value={edu.school || ""} onChange={(e) => updateEducation(i, "school", e.target.value)} style={styles.input} placeholder="University / Institute" />
                      </div>
                    </div>
                    <div style={styles.twoColGrid}>
                      <div style={styles.field}>
                        <label style={styles.smallLabel}>Start date</label>
                        <input type="date" value={edu.startDate || ""} onChange={(e) => updateEducation(i, "startDate", e.target.value)} style={styles.input} />
                      </div>
                      <div style={styles.field}>
                        <label style={styles.smallLabel}>End date</label>
                        <input type="date" value={edu.endDate || ""} onChange={(e) => updateEducation(i, "endDate", e.target.value)} style={styles.input} />
                      </div>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.smallLabel}>Notes</label>
                      <textarea value={edu.description || ""} onChange={(e) => updateEducation(i, "description", e.target.value)} style={styles.textareaSmall} rows={2} placeholder="Honors, GPA, notes..." />
                    </div>
                    <div style={styles.entryActions}>
                      <button type="button" onClick={() => removeEducation(i)} style={styles.removeBtn}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div style={styles.formActions}>
            <button type="button" onClick={openPreview} style={styles.previewBtnLarge}>Preview CV</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>

        <footer style={styles.footer}>
          <div>
            <strong style={{ fontSize: 16 }}>OfSkillJob — Show skills. Get hired.</strong>
            <p style={{ marginTop: 6, color: "#cbd5e1" }}>Keep your profile updated — recruiters search here every day.</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: 6, color: "#cbd5e1" }}>Preview and download your CV anytime</div>
            <button onClick={openPreview} style={styles.footerPreviewBtn}>Preview CV</button>
          </div>
        </footer>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div style={styles.modalOverlay} onClick={closePreview}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <strong style={{ fontSize: 20 }}>{form.full_name || "Unnamed"}</strong>
                <div style={{ color: "#475569" }}>{form.profession ? `${form.profession} • ` : ""}{form.headline}</div>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>{form.location} • {form.email} • {form.phone}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={printPreview} style={styles.printBtn}>Print / Download</button>
                <button onClick={closePreview} style={styles.closeModalBtn}>Close</button>
              </div>
            </div>
            <div ref={previewRef} style={{ padding: "8px 4px" }}>
              <section style={styles.cvSection}>
                <h3 style={styles.cvSectionTitle}>Profile</h3>
                <p>{form.bio || "No bio provided."}</p>
              </section>

              <section style={styles.cvSection}>
                <h3 style={styles.cvSectionTitle}>Skills</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {form.skills.map((s: string, idx: number) => (
                    <span key={idx} style={styles.skillTag}>{s}</span>
                  ))}
                </div>
              </section>

              <section style={styles.cvSection}>
                <h3 style={styles.cvSectionTitle}>Languages</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {form.languages.map((l: string, idx: number) => (
                    <span key={idx} style={styles.skillTag}>{l}</span>
                  ))}
                </div>
              </section>

              <section style={styles.cvSection}>
                <h3 style={styles.cvSectionTitle}>Experience</h3>
                {(form.experience || []).length === 0 && <p style={{ color: "#64748b" }}>No experience listed</p>}
                {(form.experience || []).map((e: any, idx: number) => (
                  <div key={idx} style={styles.cvItem}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <strong>{e.title}</strong> <span style={{ color: "#64748b" }}>{e.company}</span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>{formatDate(e.startDate)} — {e.endDate ? formatDate(e.endDate) : "Present"}</div>
                    {e.description && <div style={{ marginTop: 6 }}>{e.description}</div>}
                  </div>
                ))}
              </section>

              <section style={styles.cvSection}>
                <h3 style={styles.cvSectionTitle}>Education</h3>
                {(form.education || []).length === 0 && <p style={{ color: "#64748b" }}>No education listed</p>}
                {(form.education || []).map((ed: any, idx: number) => (
                  <div key={idx} style={styles.cvItem}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <strong>{ed.degree}</strong> <span style={{ color: "#64748b" }}>{ed.school}</span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>{formatDate(ed.startDate)} — {formatDate(ed.endDate)}</div>
                    {ed.description && <div style={{ marginTop: 6 }}>{ed.description}</div>}
                  </div>
                ))}
              </section>

              <section style={styles.cvSection}>
                <h3 style={styles.cvSectionTitle}>Links</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {form.github && <a href={form.github} target="_blank" rel="noreferrer" style={styles.linkBadge}>GitHub</a>}
                  {form.linkedin && <a href={form.linkedin} target="_blank" rel="noreferrer" style={styles.linkBadge}>LinkedIn</a>}
                  {form.website && <a href={form.website} target="_blank" rel="noreferrer" style={styles.linkBadge}>Portfolio</a>}
                  {form.intro_video_url && (
                    <a href={form.intro_video_url} target="_blank" rel="noreferrer" style={{ ...styles.linkBadge, background: "#dbeafe", color: "#1e40af" }}>
                      🎥 Video Introduction
                    </a>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={styles.toastContainer}>
          <div style={{ ...styles.toastBox, background: toast.type === "success" ? "#10b981" : toast.type === "error" ? "#ef4444" : "#2563eb" }}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Styles – improved for skills/languages spacing with proper typing ----------
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 16,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: "3px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 28,
    flexWrap: "wrap" as const,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "linear-gradient(135deg, #2563eb, #1e40af)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    color: "#fff",
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#0f172a",
  },
  subtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 14,
  },
  headerActions: {
    display: "flex",
    gap: 12,
  },
  previewBtn: {
    padding: "8px 16px",
    borderRadius: 40,
    background: "#10b981",
    color: "#fff",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
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
  hint: {
    fontSize: 12,
    color: "#64748b",
    margin: "4px 0 0",
  },
  input: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    transition: "all 0.2s",
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
  textareaSmall: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
    resize: "vertical" as const,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  addBtn: {
    padding: "6px 14px",
    borderRadius: 40,
    background: "#eef2ff",
    color: "#1e40af",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
  },
  emptyText: {
    color: "#64748b",
    fontStyle: "italic",
    margin: 0,
  },
  entriesList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
    marginTop: 8,
  },
  entryCard: {
    background: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #eef2f7",
  },
  entryHeader: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: 4,
    display: "block",
  },
  entryActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  removeBtn: {
    padding: "6px 12px",
    borderRadius: 40,
    background: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 12,
  },
  skillContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  skillTags: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 10,
    marginBottom: 4,
  },
  skillTag: {
    background: "#eef2ff",
    padding: "8px 14px",
    borderRadius: 40,
    fontSize: 14,
    fontWeight: 500,
    color: "#1e40af",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  skillRemove: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "#1e40af",
    padding: 0,
    marginLeft: 6,
  },
  skillInputWrapper: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  skillInput: {
    flex: 3,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    minWidth: "200px",
  },
  skillAddBtn: {
    padding: "12px 20px",
    borderRadius: 12,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  skillSuggestions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 10,
    marginTop: 8,
  },
  suggestionChip: {
    padding: "8px 14px",
    borderRadius: 40,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    fontSize: 13,
    cursor: "pointer",
    color: "#0f172a",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  previewBtnLarge: {
    padding: "10px 20px",
    borderRadius: 40,
    background: "#10b981",
    color: "#fff",
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
  footer: {
    marginTop: 32,
    background: "#0f172a",
    color: "white",
    padding: 24,
    borderRadius: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap" as const,
  },
  footerPreviewBtn: {
    background: "#10b981",
    color: "white",
    padding: "8px 16px",
    borderRadius: 40,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 880,
    maxHeight: "90vh",
    overflow: "auto",
    background: "#fff",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap" as const,
  },
  printBtn: {
    padding: "8px 16px",
    borderRadius: 40,
    background: "#0f172a",
    color: "#fff",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
  },
  closeModalBtn: {
    padding: "8px 16px",
    borderRadius: 40,
    background: "#f1f5f9",
    color: "#0f172a",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
  },
  cvSection: {
    marginBottom: 20,
  },
  cvSectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    borderBottom: "2px solid #e2e8f0",
    paddingBottom: 6,
    marginBottom: 12,
    color: "#0f172a",
  },
  cvItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px dashed #eef2f7",
  },
  linkBadge: {
    background: "#f1f5f9",
    padding: "6px 12px",
    borderRadius: 40,
    textDecoration: "none",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 500,
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

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}