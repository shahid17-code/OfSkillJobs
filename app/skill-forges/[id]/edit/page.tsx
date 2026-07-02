// app/skill-forges/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function EditSkillForgePage() {
  return (
    <ProtectedRoute role="company">
      <EditSkillForgeForm />
    </ProtectedRoute>
  );
}

// ── Reuse the same category/difficulty constants ──
const CATEGORY_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  design:        { icon: "🎨", color: "#7c3aed", bg: "#fdf4ff", border: "#e9d5ff" },
  development:   { icon: "💻", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  writing:       { icon: "✍️", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  sales:         { icon: "💼", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  marketing:     { icon: "📈", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  research:      { icon: "🔬", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
  communication: { icon: "💬", color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
};

const DIFFICULTY_META: Record<string, { label: string; color: string; bg: string; border: string; desc: string }> = {
  beginner:     { label: "Beginner",     color: "#166534", bg: "#dcfce7", border: "#bbf7d0", desc: "1–3 hours · No prior experience needed" },
  intermediate: { label: "Intermediate", color: "#92400e", bg: "#fef3c7", border: "#fde68a", desc: "3–8 hours · Some experience required"  },
  advanced:     { label: "Advanced",     color: "#991b1b", bg: "#fee2e2", border: "#fecaca", desc: "8+ hours · Expert-level challenge"      },
};

const STEPS = [
  { id: 1, icon: "📋", title: "Basics",    desc: "Title, category & difficulty" },
  { id: 2, icon: "📝", title: "Challenge", desc: "Description & requirements"   },
  { id: 3, icon: "⚙️", title: "Details",   desc: "Skills, format & deadline"    },
  { id: 4, icon: "🚀", title: "Launch",    desc: "Review & publish"             },
];

function EditSkillForgeForm() {
  const router = useRouter();
  const params = useParams();
  const forgeId = params?.id as string;

  const [companyId,   setCompanyId]   = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Your Company");
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]     = useState(false);
  const [error,       setError]       = useState("");
  const [step,        setStep]        = useState(1);
  const [isMobile,    setIsMobile]    = useState(false);
  const [forgeData,   setForgeData]   = useState<any>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [form, setForm] = useState({
    title: "", description: "", category: "development", difficulty: "intermediate",
    requirements: "", deadline: "", reward_clout: 50, skills_required: "",
    estimated_time: "", submission_format: "", max_submissions: "", tags: "",
    featured_image_url: "", what_they_will_learn: "", evaluation_criteria: "",
  });

  // ── Fetch current user and forge data ──
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: userData } = await supabase
        .from("users")
        .select("id, company_name")
        .eq("id", user.id)
        .single();
      if (userData) {
        setCompanyId(userData.id);
        setCompanyName(userData.company_name || "Your Company");
      }

      if (forgeId) {
        const { data: forge, error: forgeError } = await supabase
          .from("skill_forges")
          .select("*")
          .eq("id", forgeId)
          .single();

        if (forgeError || !forge) {
          setError("Forge not found or you don't have access.");
          setLoading(false);
          return;
        }

        // Check ownership
        if (forge.company_sponsor_id !== userData?.id) {
          setError("You are not the owner of this forge.");
          setLoading(false);
          return;
        }

        setForgeData(forge);
        // Pre-fill form
        setForm({
          title: forge.title || "",
          description: forge.description || "",
          category: forge.category || "development",
          difficulty: forge.difficulty || "intermediate",
          requirements: forge.requirements || "",
          deadline: forge.deadline ? new Date(forge.deadline).toISOString().slice(0, 16) : "",
          reward_clout: forge.reward_clout || 50,
          skills_required: (forge.skills_required || []).join(", "),
          estimated_time: forge.estimated_time || "",
          submission_format: forge.submission_format || "",
          max_submissions: forge.max_submissions ? String(forge.max_submissions) : "",
          tags: (forge.tags || []).join(", "),
          featured_image_url: forge.featured_image_url || "",
          what_they_will_learn: forge.what_they_will_learn || "",
          evaluation_criteria: forge.evaluation_criteria || "",
        });
        setLoading(false);
      }
    })();
  }, [forgeId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validateStep(s: number) {
    if (s === 1) return !!(form.title.trim() && form.category && form.difficulty);
    if (s === 2) return !!(form.description.trim() && form.requirements.trim());
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) { setError("Please fill in all required fields before continuing."); return; }
    setError(""); setStep(s => Math.min(s + 1, 4));
  }
  function prevStep() { setError(""); setStep(s => Math.max(s - 1, 1)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    if (!companyId) {
      setError("Company profile not found.");
      setSaving(false);
      return;
    }
    if (!form.title || !form.description || !form.requirements) {
      setError("Title, description, and requirements are required.");
      setSaving(false);
      return;
    }

    const updateData = {
      title: form.title,
      description: form.description,
      category: form.category,
      difficulty: form.difficulty,
      requirements: form.requirements,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      reward_clout: Number(form.reward_clout),
      status: "active",
      skills_required: form.skills_required.split(",").map(s => s.trim()).filter(Boolean),
      estimated_time: form.estimated_time || null,
      submission_format: form.submission_format || null,
      max_submissions: form.max_submissions ? Number(form.max_submissions) : null,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      featured_image_url: form.featured_image_url || null,
      what_they_will_learn: form.what_they_will_learn || null,
      evaluation_criteria: form.evaluation_criteria || null,
    };

    const { error: updateError } = await supabase
      .from("skill_forges")
      .update(updateData)
      .eq("id", forgeId);

    if (updateError) {
      setError(`Failed: ${updateError.message}`);
      setSaving(false);
      return;
    }

    // Redirect to the forge detail page or foundry
    router.push(`/skill-forges/${forgeId}`);
  }

  async function handleDelete() {
    if (!confirm("Delete this forge permanently? This cannot be undone.")) return;
    const { error } = await supabase.from("skill_forges").delete().eq("id", forgeId);
    if (error) {
      setError(`Delete failed: ${error.message}`);
      return;
    }
    router.push("/company");
  }

  const catMeta  = CATEGORY_META[form.category]   || CATEGORY_META.development;
  const diffMeta = DIFFICULTY_META[form.difficulty] || DIFFICULTY_META.intermediate;
  const skillTags = form.skills_required.split(",").map(s => s.trim()).filter(Boolean);
  const formTags  = form.tags.split(",").map(t => t.trim()).filter(Boolean);
  const cloutLevel = form.reward_clout >= 200 ? "🔥 High value" : form.reward_clout >= 100 ? "⭐ Medium" : "💡 Starter";

  if (loading) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", padding:24 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"4px solid #e2e8f0", borderTopColor:"#2563eb", animation:"spin 0.8s linear infinite", marginBottom:16 }} />
        <p style={{ color:"#64748b", fontWeight:700 }}>Loading Forge…</p>
      </div>
    );
  }

  if (error && !forgeData) {
    return (
      <div style={{ maxWidth:600, margin:"60px auto", padding:24, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <h2 style={{ fontSize:24, fontWeight:900, color:"#0f172a", marginBottom:12 }}>Access Denied</h2>
        <p style={{ color:"#64748b", fontSize:16 }}>{error}</p>
        <button onClick={() => router.push("/company")} style={{ marginTop:20, background:"#0f172a", color:"white", border:"none", padding:"12px 24px", borderRadius:12, fontWeight:700, cursor:"pointer" }}>← Back to Foundry</button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }
        .csf-input:focus   { border-color:#2563eb !important; box-shadow:0 0 0 3px rgba(37,99,235,.12) !important; outline:none; }
        .csf-btn           { transition:transform .15s,box-shadow .15s; cursor:pointer; }
        .csf-btn:hover     { transform:translateY(-1px); }
        .csf-btn:active    { transform:scale(.97); }
        .csf-cat-card      { transition:all .18s ease; cursor:pointer; }
        .csf-cat-card:hover{ transform:translateY(-2px); }
        .csf-diff-card     { transition:all .18s ease; cursor:pointer; }
        .csf-diff-card:hover{ transform:translateY(-2px); }
        .csf-step-anim     { animation:fadeIn .35s ease both; }
        @media (max-width:900px) {
          .csf-layout { grid-template-columns:1fr !important; }
          .csf-preview { position:static !important; }
          .csf-row    { flex-direction:column !important; gap:12px !important; }
          .csf-row > * { width:100% !important; }
        }
      `}</style>

      <div style={{ maxWidth:1320, margin:"0 auto", padding: isMobile ? "20px 16px 48px" : "32px 24px 60px", fontFamily:"Inter,system-ui,-apple-system,'Segoe UI',sans-serif" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#eef2ff", border:"1px solid #c7d2fe", color:"#4338ca", padding:"5px 14px", borderRadius:999, fontSize:12, fontWeight:800, marginBottom:12, letterSpacing:"0.06em" }}>
                ✏️ SKILL FORGE EDITOR
              </div>
              <h1 style={{ margin:0, fontSize: isMobile ? 26 : 34, fontWeight:900, color:"#0f172a", letterSpacing:"-0.04em", lineHeight:1.1 }}>
                Edit Skill Forge
              </h1>
              <p style={{ margin:"10px 0 0", color:"#64748b", fontSize:15, lineHeight:1.6 }}>
                Update your challenge – candidates will see the latest version.
              </p>
            </div>
            <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a5f)", borderRadius:20, padding:"16px 22px", textAlign:"center", flexShrink:0 }}>
              <div style={{ fontSize:24, marginBottom:4 }}>🏆</div>
              <div style={{ fontSize:28, fontWeight:900, color:"white", lineHeight:1 }}>{form.reward_clout}</div>
              <div style={{ fontSize:12, color:"#93c5fd", fontWeight:700, marginTop:4 }}>Clout Points</div>
              <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{cloutLevel}</div>
            </div>
          </div>
        </div>

        {/* ── Step progress ── */}
        <div style={{ background:"white", borderRadius:20, padding:"20px 24px", marginBottom:24, boxShadow:"0 4px 16px rgba(2,6,23,.06)", border:"1px solid #f1f5f9" }}>
          <div style={{ display:"flex", alignItems:"center" }}>
            {STEPS.map((s, i) => {
              const done = step > s.id, active = step === s.id;
              return (
                <div key={s.id} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
                    <div style={{ width:40, height:40, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize: done ? 18 : 16, background: done ? "linear-gradient(135deg,#10b981,#059669)" : active ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#f1f5f9", color: done || active ? "white" : "#94a3b8", fontWeight:900, boxShadow: active ? "0 6px 18px rgba(37,99,235,.35)" : done ? "0 4px 12px rgba(16,185,129,.3)" : "none", transition:"all .3s ease" }}>
                      {done ? "✓" : s.icon}
                    </div>
                    {!isMobile && (
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:12, fontWeight:800, color: active ? "#2563eb" : done ? "#10b981" : "#94a3b8" }}>{s.title}</div>
                        <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>{s.desc}</div>
                      </div>
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex:1, height:3, margin: isMobile ? "0 6px" : "0 12px", marginBottom: isMobile ? 0 : 20, background: done ? "linear-gradient(90deg,#10b981,#34d399)" : "#f1f5f9", borderRadius:999, transition:"background .3s ease" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="csf-layout" style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 360px", gap:24, alignItems:"start" }}>

          {/* ── FORM ── */}
          <div>
            {error && (
              <div style={{ background:"#fee2e2", border:"1px solid #fecaca", borderRadius:16, padding:"13px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:10, color:"#991b1b", fontSize:14, fontWeight:600 }}>
                <span style={{ fontSize:18 }}>⚠️</span>{error}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* STEP 1 */}
              {step === 1 && (
                <div className="csf-step-anim">
                  <FormCard title="Step 1 — The Basics" subtitle="Start with what candidates will see first.">

                    <FieldBlock label="Forge Title" required hint="Be specific — a clear title gets 3× more submissions.">
                      <input name="title" value={form.title} onChange={handleChange} placeholder="e.g., Build a responsive dashboard in React" className="csf-input" style={inputStyle} maxLength={120} />
                      <div style={charHint}>{form.title.length}/120</div>
                    </FieldBlock>

                    <FieldBlock label="Category" required hint="Choose the closest match to the skill being tested.">
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10 }}>
                        {Object.entries(CATEGORY_META).map(([key, meta]) => (
                          <div key={key} className="csf-cat-card"
                            onClick={() => setForm(p => ({ ...p, category: key }))}
                            style={{ background: form.category === key ? meta.bg : "white", border:`2px solid ${form.category === key ? meta.color : "#e2e8f0"}`, borderRadius:14, padding:"14px 10px", textAlign:"center", boxShadow: form.category === key ? `0 6px 18px ${meta.color}22` : "none" }}>
                            <div style={{ fontSize:22, marginBottom:6 }}>{meta.icon}</div>
                            <div style={{ fontSize:12, fontWeight:800, color: form.category === key ? meta.color : "#64748b", textTransform:"capitalize" }}>{key}</div>
                          </div>
                        ))}
                      </div>
                    </FieldBlock>

                    <FieldBlock label="Difficulty Level" required hint="Helps candidates self-select before applying.">
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                        {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
                          <div key={key} className="csf-diff-card"
                            onClick={() => setForm(p => ({ ...p, difficulty: key }))}
                            style={{ background: form.difficulty === key ? meta.bg : "white", border:`2px solid ${form.difficulty === key ? meta.color : "#e2e8f0"}`, borderRadius:16, padding:"16px 12px", textAlign:"center", boxShadow: form.difficulty === key ? `0 6px 18px ${meta.color}22` : "none" }}>
                            <div style={{ fontSize:11, fontWeight:900, color:meta.color, background:meta.bg, border:`1px solid ${meta.border}`, display:"inline-block", padding:"3px 10px", borderRadius:999, marginBottom:8 }}>{meta.label}</div>
                            <div style={{ fontSize:11, color:"#64748b", lineHeight:1.4 }}>{meta.desc}</div>
                          </div>
                        ))}
                      </div>
                    </FieldBlock>

                    <FieldBlock label={`Reward Clout: ${form.reward_clout} pts`} required hint="Higher clout attracts more serious candidates.">
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <span style={{ fontSize:13, color:"#94a3b8", fontWeight:700, flexShrink:0 }}>5</span>
                        <input name="reward_clout" type="range" min={5} max={500} step={5} value={form.reward_clout} onChange={handleChange} style={{ flex:1, accentColor:"#2563eb", height:4, cursor:"pointer" }} />
                        <span style={{ fontSize:13, color:"#94a3b8", fontWeight:700, flexShrink:0 }}>500</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, gap:8 }}>
                        {[25, 50, 100, 200, 500].map(v => (
                          <button key={v} type="button" onClick={() => setForm(p => ({ ...p, reward_clout: v }))}
                            style={{ flex:1, padding:"6px 0", borderRadius:10, border:`1.5px solid ${form.reward_clout === v ? "#2563eb" : "#e2e8f0"}`, background: form.reward_clout === v ? "#eef2ff" : "white", color: form.reward_clout === v ? "#2563eb" : "#64748b", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </FieldBlock>
                  </FormCard>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="csf-step-anim">
                  <FormCard title="Step 2 — The Challenge" subtitle="This is what candidates will read before deciding to participate.">

                    <FieldBlock label="Challenge Description" required hint="What problem are candidates solving? What's the context?">
                      <textarea name="description" value={form.description} onChange={handleChange} placeholder={"Describe the challenge clearly.\n\nExample:\n\"We need a dashboard that shows real-time sales metrics...\""}
                        rows={6} className="csf-input" style={{ ...inputStyle, resize:"vertical" }} maxLength={1000} />
                      <div style={charHint}>{form.description.length}/1000</div>
                    </FieldBlock>

                    <FieldBlock label="Requirements & Instructions" required hint="Be explicit — what must the submission include?">
                      <textarea name="requirements" value={form.requirements} onChange={handleChange} placeholder={"List every requirement:\n\n• Use React (Next.js preferred)\n• Include a live demo link\n• Submit via GitHub\n• Must work on mobile"}
                        rows={7} className="csf-input" style={{ ...inputStyle, resize:"vertical", fontFamily:"monospace", fontSize:14 }} maxLength={2000} />
                      <div style={charHint}>{form.requirements.length}/2000</div>
                    </FieldBlock>

                    <FieldBlock label="What Will They Learn?" hint="Optional but increases participation — candidates value growth.">
                      <textarea name="what_they_will_learn" value={form.what_they_will_learn} onChange={handleChange}
                        placeholder="e.g., Real-world API integration, state management patterns, performance optimisation..."
                        rows={3} className="csf-input" style={{ ...inputStyle, resize:"vertical" }} />
                    </FieldBlock>

                    <FieldBlock label="Evaluation Criteria" hint="How will you judge submissions? Transparency builds trust.">
                      <textarea name="evaluation_criteria" value={form.evaluation_criteria} onChange={handleChange}
                        placeholder={"e.g.,\n• Code quality: 30%\n• UI/UX polish: 25%\n• Functionality: 30%\n• Documentation: 15%"}
                        rows={4} className="csf-input" style={{ ...inputStyle, resize:"vertical", fontFamily:"monospace", fontSize:14 }} />
                    </FieldBlock>
                  </FormCard>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="csf-step-anim">
                  <FormCard title="Step 3 — Details & Format" subtitle="Help candidates understand exactly what to submit and when.">

                    <div className="csf-row" style={{ display:"flex", gap:16 }}>
                      <FieldBlock label="Skills Required" hint="Comma separated — used for filtering." style={{ flex:1 }}>
                        <input name="skills_required" value={form.skills_required} onChange={handleChange} placeholder="React, Node.js, Figma, SQL..." className="csf-input" style={inputStyle} />
                      </FieldBlock>
                      <FieldBlock label="Estimated Time" style={{ flex:1 }}>
                        <select name="estimated_time" value={form.estimated_time} onChange={handleChange} className="csf-input" style={inputStyle}>
                          <option value="">Select estimated time</option>
                          {["1-2 hours","2-4 hours","4-8 hours","1 day","2-3 days","1 week"].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </FieldBlock>
                    </div>

                    <div className="csf-row" style={{ display:"flex", gap:16 }}>
                      <FieldBlock label="Submission Format" hint="What should candidates submit?" style={{ flex:1 }}>
                        <select name="submission_format" value={form.submission_format} onChange={handleChange} className="csf-input" style={inputStyle}>
                          <option value="">Select format</option>
                          {["Google Drive link","GitHub repository","Figma link","Video recording","Written document","Live demo + code"].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </FieldBlock>
                      <FieldBlock label="Max Submissions" hint="Leave blank for unlimited." style={{ flex:1 }}>
                        <input name="max_submissions" type="number" value={form.max_submissions} onChange={handleChange} placeholder="e.g., 50 (or unlimited)" min={1} className="csf-input" style={inputStyle} />
                      </FieldBlock>
                    </div>

                    <div className="csf-row" style={{ display:"flex", gap:16 }}>
                      <FieldBlock label="Submission Deadline" hint="Leave empty for open-ended." style={{ flex:1 }}>
                        <input name="deadline" type="datetime-local" value={form.deadline} onChange={handleChange} className="csf-input" style={inputStyle} />
                      </FieldBlock>
                      <FieldBlock label="Tags" hint="Comma separated — for search & discovery." style={{ flex:1 }}>
                        <input name="tags" value={form.tags} onChange={handleChange} placeholder="frontend, API, mobile..." className="csf-input" style={inputStyle} />
                      </FieldBlock>
                    </div>

                    <FieldBlock label="Featured Image URL" hint="Optional — a banner image makes your forge stand out.">
                      <input name="featured_image_url" value={form.featured_image_url} onChange={handleChange} placeholder="https://your-image-link.com/banner.png" className="csf-input" style={inputStyle} />
                    </FieldBlock>
                  </FormCard>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="csf-step-anim">
                  <FormCard title="Step 4 — Review & Update" subtitle="Double-check everything before saving your changes.">
                    <div style={{ display:"grid", gap:10, marginBottom:24 }}>
                      {[
                        { label:"Forge Title",       value: form.title,                                             required: true  },
                        { label:"Category",           value: form.category,                                         required: true  },
                        { label:"Difficulty",         value: form.difficulty,                                       required: true  },
                        { label:"Description",        value: form.description ? form.description.slice(0,80)+"…" : "", required: true  },
                        { label:"Requirements",       value: form.requirements ? form.requirements.slice(0,80)+"…" : "", required: true  },
                        { label:"Skills",             value: form.skills_required    || "Not specified",            required: false },
                        { label:"Estimated Time",     value: form.estimated_time     || "Not specified",            required: false },
                        { label:"Submission Format",  value: form.submission_format  || "Not specified",            required: false },
                        { label:"Deadline",           value: form.deadline ? new Date(form.deadline).toLocaleString() : "Open-ended", required: false },
                        { label:"Reward Clout",       value: `${form.reward_clout} pts`,                           required: true  },
                      ].map((item, i) => {
                        const missing = item.required && !item.value;
                        return (
                          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", background: missing ? "#fff7f7" : "#f8fafc", borderRadius:14, border:`1px solid ${missing ? "#fecaca" : "#e8eef5"}` }}>
                            <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{missing ? "❌" : "✅"}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>{item.label}</div>
                              <div style={{ fontSize:14, color: missing ? "#ef4444" : "#0f172a", fontWeight:600, wordBreak:"break-word" }}>{missing ? "Required — please go back and fill this in" : item.value}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ background:"linear-gradient(135deg,#f0f9ff,#eef2ff)", borderRadius:18, padding:"20px", border:"1px solid #bfdbfe" }}>
                      <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:900, color:"#0f172a" }}>What changes after you update?</h3>
                      <div style={{ display:"grid", gap:10 }}>
                        {[
                          { icon:"🔄", text:"Your Forge is immediately updated with the new details." },
                          { icon:"📩", text:"Candidates see the latest requirements and submission info." },
                          { icon:"📊", text:"Existing submissions are not affected." },
                          { icon:"🏆", text:"Clout rewards, deadlines, and skills are refreshed." },
                        ].map((item, i) => (
                          <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                            <span style={{ fontSize:18, flexShrink:0 }}>{item.icon}</span>
                            <p style={{ margin:0, fontSize:14, color:"#475569", lineHeight:1.6 }}>{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </FormCard>
                </div>
              )}

              {/* Step nav */}
              <div style={{ display:"flex", gap:12, marginTop:20, flexWrap:"wrap" }}>
                {step > 1 && (
                  <button type="button" className="csf-btn" onClick={prevStep}
                    style={{ background:"white", color:"#0f172a", border:"1.5px solid #e2e8f0", padding:"13px 24px", borderRadius:16, fontWeight:800, fontSize:15, cursor:"pointer", flex: isMobile ? 1 : "none" }}>
                    ← Back
                  </button>
                )}
                {step < 4
                  ? <button type="button" className="csf-btn" onClick={nextStep}
                      style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"13px 28px", borderRadius:16, fontWeight:800, fontSize:15, cursor:"pointer", flex:1, boxShadow:"0 8px 20px rgba(37,99,235,.3)" }}>
                      Continue → Step {step + 1}: {STEPS[step].title}
                    </button>
                  : <button type="submit" className="csf-btn" disabled={saving}
                      style={{ background: saving ? "#94a3b8" : "linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"13px 28px", borderRadius:16, fontWeight:900, fontSize:16, cursor: saving ? "not-allowed" : "pointer", flex:1, boxShadow: saving ? "none" : "0 8px 20px rgba(37,99,235,.35)", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                      {saving
                        ? <><div style={{ width:18, height:18, borderRadius:"50%", border:"3px solid rgba(255,255,255,.3)", borderTopColor:"white", animation:"spin 0.8s linear infinite" }} /> Updating…</>
                        : "💾 Update Forge Now"
                      }
                    </button>
                }
              </div>
            </form>

            {/* ── Danger zone: Delete ── */}
            <div style={{ marginTop:30, paddingTop:24, borderTop:"2px solid #f1f5f9" }}>
              <div style={{ background:"#fff7f7", borderRadius:18, padding:"18px 20px", border:"1px solid #fecaca" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
                  <div>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:"#991b1b" }}>Danger Zone</h3>
                    <p style={{ margin:"4px 0 0", color:"#64748b", fontSize:13 }}>Delete this forge permanently – this action cannot be undone.</p>
                  </div>
                  <button onClick={handleDelete}
                    style={{ background:"#ef4444", color:"white", border:"none", padding:"10px 22px", borderRadius:12, fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:"0 4px 12px rgba(239,68,68,.3)", transition:"all .15s" }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#dc2626"}
                    onMouseOut={(e) => e.currentTarget.style.background = "#ef4444"}
                  >
                    🗑️ Delete Forge
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ══ LIVE PREVIEW SIDEBAR ══ */}
          <div className="csf-preview" style={{ position: isMobile ? "static" : "sticky", top:24, display:"grid", gap:14 }}>

            {/* Browser mockup card */}
            <div style={{ background:"white", borderRadius:22, overflow:"hidden", boxShadow:"0 12px 40px rgba(2,6,23,.1)", border:"1px solid #eef2f7" }}>

              {/* Browser chrome */}
              <div style={{ background:"#1e293b", padding:"11px 16px", display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:"#ef4444" }} />
                <div style={{ width:9, height:9, borderRadius:"50%", background:"#f59e0b" }} />
                <div style={{ width:9, height:9, borderRadius:"50%", background:"#10b981" }} />
                <span style={{ marginLeft:8, fontSize:11, color:"#475569", fontWeight:600 }}>Live Preview · How candidates see your Forge</span>
              </div>

              {/* Coloured banner strip */}
              <div style={{ height:64, background:`linear-gradient(135deg,${catMeta.bg},#f8fafc)`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", borderBottom:`1px solid ${catMeta.border}` }}>
                <div style={{ width:42, height:42, borderRadius:12, background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 2px 8px ${catMeta.color}22`, border:`1px solid ${catMeta.border}` }}>
                  {catMeta.icon}
                </div>
                <div style={{ background:"#fef3c7", border:"1px solid #fde68a", color:"#92400e", padding:"5px 12px", borderRadius:999, fontSize:12, fontWeight:800, display:"flex", alignItems:"center", gap:5 }}>
                  🏆 {form.reward_clout} <span style={{ fontSize:10, fontWeight:700 }}>Clout</span>
                </div>
              </div>

              <div style={{ padding:"16px 18px 18px" }}>

                {/* Badges */}
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                  <span style={{ background:catMeta.bg, color:catMeta.color, border:`1px solid ${catMeta.border}`, padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800, textTransform:"capitalize" }}>
                    {catMeta.icon} {form.category}
                  </span>
                  <span style={{ background:diffMeta.bg, color:diffMeta.color, border:`1px solid ${diffMeta.border}`, padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800 }}>
                    {diffMeta.label}
                  </span>
                  <span style={{ background:"#dcfce7", color:"#166534", border:"1px solid #bbf7d0", padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800, marginLeft:"auto" }}>
                    ● Open
                  </span>
                </div>

                {/* Title */}
                <h3 style={{ margin:"0 0 6px", fontSize:15, fontWeight:900, color:"#0f172a", lineHeight:1.3 }}>
                  {form.title || <span style={{ color:"#cbd5e1" }}>Your Forge title…</span>}
                </h3>

                {/* Company row */}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:catMeta.bg, border:`1px solid ${catMeta.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>🏢</div>
                  <span style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>{companyName}</span>
                  <span style={{ marginLeft:"auto", background:"#dcfce7", color:"#166534", padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:800, border:"1px solid #bbf7d0" }}>Live</span>
                </div>

                {/* Description */}
                <p style={{ margin:"0 0 12px", color:"#475569", fontSize:12, lineHeight:1.65 }}>
                  {form.description
                    ? form.description.slice(0, 120) + (form.description.length > 120 ? "…" : "")
                    : <span style={{ color:"#e2e8f0" }}>Your description will appear here…</span>
                  }
                </p>

                {/* Meta row */}
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", padding:"10px 0", borderTop:"1px solid #f1f5f9", borderBottom:"1px solid #f1f5f9", marginBottom:12 }}>
                  {form.estimated_time && <span style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>⏱️ {form.estimated_time}</span>}
                  {form.submission_format && <span style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>📎 {form.submission_format}</span>}
                  {form.deadline && <span style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>📅 {new Date(form.deadline).toLocaleDateString()}</span>}
                  {!form.estimated_time && !form.submission_format && !form.deadline && (
                    <span style={{ fontSize:11, color:"#cbd5e1" }}>Details appear here…</span>
                  )}
                </div>

                {/* Skills */}
                {skillTags.length > 0 && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
                    {skillTags.slice(0, 5).map(s => (
                      <span key={s} style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:700 }}>{s}</span>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <button style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"11px", borderRadius:13, fontWeight:900, fontSize:14, cursor:"default", boxShadow:"0 6px 16px rgba(37,99,235,.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  ✨ Submit a SkillCapsule →
                </button>
                <p style={{ margin:"8px 0 0", fontSize:10, color:"#94a3b8", fontWeight:600, textAlign:"center" }}>
                  Earns {form.reward_clout} Clout · Published on Showfloor
                </p>

                {/* Tags */}
                {formTags.length > 0 && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:10 }}>
                    {formTags.map(t => <span key={t} style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>#{t}</span>)}
                  </div>
                )}
              </div>
            </div>

            {/* Tips card */}
            <div style={{ background:"linear-gradient(135deg,#fefce8,#fffbeb)", borderRadius:18, padding:"16px 18px", border:"1px solid #fde68a" }}>
              <h4 style={{ margin:"0 0 12px", fontSize:13, fontWeight:900, color:"#0f172a" }}>💡 Tips for more submissions</h4>
              <div style={{ display:"grid", gap:8 }}>
                {[
                  "Specific titles get 3× more clicks than vague ones.",
                  "Show evaluation criteria — transparency builds trust.",
                  "Higher Clout attracts more serious candidates.",
                  "Set a deadline to create urgency.",
                  "Add a featured image to stand out in listings.",
                ].map((tip, i) => (
                  <div key={i} style={{ display:"flex", gap:7, alignItems:"flex-start" }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:"#2563eb", flexShrink:0, marginTop:6 }} />
                    <span style={{ fontSize:12, color:"#92400e", lineHeight:1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// ── Helper components (reused from create page) ──
function FormCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background:"white", borderRadius:24, padding:"26px 26px", boxShadow:"0 8px 28px rgba(2,6,23,.06)", border:"1px solid #f1f5f9" }}>
      <div style={{ marginBottom:22 }}>
        <h2 style={{ margin:"0 0 5px", fontSize:20, fontWeight:900, color:"#0f172a", letterSpacing:"-0.02em" }}>{title}</h2>
        <p style={{ margin:0, color:"#64748b", fontSize:13, lineHeight:1.6 }}>{subtitle}</p>
      </div>
      <div style={{ display:"grid", gap:20 }}>{children}</div>
    </div>
  );
}

function FieldBlock({ label, required, hint, children, style: extraStyle }: { label: string; required?: boolean; hint?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={extraStyle}>
      <div style={{ display:"flex", alignItems:"center", marginBottom:7 }}>
        <label style={{ fontSize:13, fontWeight:800, color:"#0f172a" }}>
          {label}
          {required && <span style={{ color:"#2563eb", marginLeft:3 }}>*</span>}
        </label>
      </div>
      {hint && <p style={{ margin:"0 0 8px", fontSize:11, color:"#94a3b8", fontWeight:600, lineHeight:1.5 }}>{hint}</p>}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width:"100%", padding:"11px 14px", borderRadius:13, border:"1.5px solid #e2e8f0",
  fontSize:14, color:"#0f172a", background:"white", boxSizing:"border-box",
  transition:"border .15s, box-shadow .15s", fontFamily:"Inter,system-ui,sans-serif",
};

const charHint: React.CSSProperties = {
  fontSize:11, color:"#94a3b8", textAlign:"right", marginTop:4, fontWeight:600,
};