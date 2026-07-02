"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────
type ForgeContext = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  reward_clout: number;
  skills_required: string[] | null;
  estimated_time: string | null;
  company_name: string;
};

// ── Config ──────────────────────────────────────────────────────────
const CATEGORIES = ["design","development","writing","sales","marketing","research","communication"] as const;
const CAT_META: Record<string, { icon: string; color: string; bg: string }> = {
  design:        { icon: "🎨", color: "#7c3aed", bg: "#fdf4ff" },
  development:   { icon: "💻", color: "#2563eb", bg: "#eff6ff" },
  writing:       { icon: "✍️", color: "#0891b2", bg: "#ecfeff" },
  sales:         { icon: "💼", color: "#059669", bg: "#f0fdf4" },
  marketing:     { icon: "📈", color: "#d97706", bg: "#fffbeb" },
  research:      { icon: "🔬", color: "#6366f1", bg: "#eef2ff" },
  communication: { icon: "💬", color: "#db2777", bg: "#fdf2f8" },
};
const DIFF_META: Record<string, { color: string; bg: string; border: string }> = {
  beginner:     { color: "#166534", bg: "#dcfce7", border: "#bbf7d0" },
  intermediate: { color: "#92400e", bg: "#fef3c7", border: "#fde68a" },
  advanced:     { color: "#991b1b", bg: "#fee2e2", border: "#fecaca" },
};
function getCat(c: string) { return CAT_META[c?.toLowerCase()] || { icon: "⚡", color: "#64748b", bg: "#f8fafc" }; }
function getDiff(d: string) { return DIFF_META[d?.toLowerCase()] || DIFF_META.intermediate; }

const VISIBILITY_OPTIONS = [
  { value: "public",     icon: "🌐", label: "Public",          desc: "Everyone on The Showfloor" },
  { value: "recruiters", icon: "👔", label: "Recruiters only", desc: "Only verified recruiters"  },
  { value: "private",    icon: "🔒", label: "Only me",         desc: "Hidden from Showfloor"     },
];

const CAPSULE_TYPES = [
  { value: "link",  icon: "🔗", label: "Link",  desc: "GitHub, Behance, Drive…" },
  { value: "video", icon: "🎥", label: "Video", desc: "Loom, YouTube, etc."      },
  { value: "text",  icon: "📝", label: "Text",  desc: "Write directly here"      },
];

// ── Main component that uses searchParams ──────────────────────────
function LaunchSkillCapsuleContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const forgeId      = searchParams.get("forge_id");

  // Forge context (when coming from a forge)
  const [forge,        setForge]        = useState<ForgeContext | null>(null);
  const [forgeLoading, setForgeLoading] = useState(!!forgeId);

  // Form state — editable fields
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("development");
  const [difficulty,  setDifficulty]  = useState("");
  const [skillsUsed,  setSkillsUsed]  = useState("");
  const [capsuleType, setCapsuleType] = useState("link");
  const [linkUrl,     setLinkUrl]     = useState("");
  const [timeSpent,   setTimeSpent]   = useState("");
  const [toolsUsed,   setToolsUsed]   = useState("");
  const [visibility,  setVisibility]  = useState("public");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ── Fetch forge data if forge_id present ──────────────────────────
  useEffect(() => {
    if (!forgeId) return;
    (async () => {
      setForgeLoading(true);
      const { data } = await supabase
        .from("skill_forges")
        .select("id, title, description, category, difficulty, reward_clout, skills_required, estimated_time, users:company_sponsor_id ( company_name )")
        .eq("id", forgeId)
        .single();
      if (data) {
        const ctx: ForgeContext = {
          id:             data.id,
          title:          data.title,
          description:    data.description,
          category:       data.category,
          difficulty:     data.difficulty,
          reward_clout:   data.reward_clout,
          skills_required:data.skills_required,
          estimated_time: data.estimated_time,
          company_name:   (data as any).users?.company_name || "Anonymous Sponsor",
        };
        setForge(ctx);
        // Pre-fill and lock these from forge
        setTitle(ctx.title);
        setDescription(ctx.description);
        setCategory(ctx.category);
        setDifficulty(ctx.difficulty);
        if (ctx.skills_required?.length) setSkillsUsed(ctx.skills_required.join(", "));
        if (ctx.estimated_time) setTimeSpent(ctx.estimated_time);
      }
      setForgeLoading(false);
    })();
  }, [forgeId]);

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please log in to launch a SkillCapsule.");
      setLoading(false);
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      setLoading(false);
      return;
    }
    if (capsuleType === "link" && !linkUrl.trim()) {
      setError("Please add your submission link.");
      setLoading(false);
      return;
    }

    const capsuleData: Record<string, unknown> = {
      user_id:      user.id,
      title:        title.trim(),
      description:  description.trim(),
      category,
      capsule_type: capsuleType,
      link_url:     capsuleType === "link" ? linkUrl.trim() : null,
      skills_used:  skillsUsed.split(",").map(s => s.trim()).filter(Boolean),
      difficulty:   difficulty || null,
      time_spent:   timeSpent || null,
      tools_used:   toolsUsed.split(",").map(t => t.trim()).filter(Boolean),
      visibility,
      ...(forgeId ? { forge_id: forgeId } : {}),
    };

    const { data: newCapsule, error: insertError } = await supabase
      .from("skill_capsules").insert(capsuleData).select("id").single();
    if (insertError) { setError(insertError.message); setLoading(false); return; }

    // Award 5 Clout
    const { data: profile } = await supabase.from("users").select("total_points").eq("id", user.id).single();
    if (profile) await supabase.from("users").update({ total_points: (profile.total_points || 0) + 5 }).eq("id", user.id);

    // Redirect
    if (forgeId) {
      router.push(`/skill-forges/${forgeId}?capsule_id=${newCapsule?.id}`);
    } else {
      router.push("/the-stage");
    }
  }

  const cat  = getCat(category);
  const diff = getDiff(difficulty);

  // ── Loading forge ────────────────────────────────────────────────
  if (forgeLoading) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", fontFamily:"Inter,system-ui,sans-serif" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"4px solid #dbe3ee", borderTopColor:"#2563eb", animation:"spin 0.8s linear infinite", marginBottom:16 }} />
        <p style={{ color:"#64748b", fontWeight:700, margin:0 }}>Loading Forge details…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }

        .lsc-input { transition:border .15s,box-shadow .15s; }
        .lsc-input:focus { border-color:#2563eb !important; box-shadow:0 0 0 3px rgba(37,99,235,.12) !important; outline:none; }
        .lsc-btn { transition:transform .15s,box-shadow .15s,opacity .15s; cursor:pointer; }
        .lsc-btn:hover  { transform:translateY(-1px); }
        .lsc-btn:active { transform:scale(.97); opacity:.9; }
        .lsc-locked { background:#f8fafc !important; color:#64748b !important; cursor:not-allowed !important; border-color:#e2e8f0 !important; }

        /* ── Mobile ── */
        @media (max-width: 860px) {
          .lsc-layout    { flex-direction:column !important; }
          .lsc-preview   { position:static !important; width:100% !important; }
          .lsc-type-grid { grid-template-columns:1fr 1fr !important; }
          .lsc-vis-grid  { grid-template-columns:1fr 1fr 1fr !important; }
          .lsc-row       { flex-direction:column !important; gap:12px !important; }
          .lsc-row > *   { width:100% !important; }
          .lsc-forge-meta { grid-template-columns:1fr 1fr !important; }
          .lsc-title-h   { font-size:24px !important; }
        }
        @media (max-width: 480px) {
          .lsc-vis-grid  { grid-template-columns:1fr !important; }
          .lsc-type-grid { grid-template-columns:1fr !important; }
          .lsc-forge-meta{ grid-template-columns:1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth:1160, margin:"0 auto", padding:"24px 16px 60px", fontFamily:"Inter,system-ui,-apple-system,'Segoe UI',sans-serif" }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:20, fontSize:13, color:"#64748b", fontWeight:600, flexWrap:"wrap" }}>
          {forge
            ? <><span style={{ cursor:"pointer", color:"#64748b" }} onClick={() => router.push("/skill-forges")}>⚒️ Skill Forges</span><span style={{ color:"#cbd5e1" }}>›</span><span style={{ cursor:"pointer", color:"#64748b" }} onClick={() => router.push(`/skill-forges/${forgeId}`)}>{forge.title}</span><span style={{ color:"#cbd5e1" }}>›</span><span style={{ color:"#0f172a", fontWeight:700 }}>Submit Capsule</span></>
            : <><span style={{ cursor:"pointer", color:"#64748b" }} onClick={() => router.push("/the-stage")}>🎪 The Showfloor</span><span style={{ color:"#cbd5e1" }}>›</span><span style={{ color:"#0f172a", fontWeight:700 }}>Launch Capsule</span></>
          }
        </div>

        {/* ── Page header ── */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:forge ? "#eef2ff" : "#f0fdf4", border:`1px solid ${forge ? "#c7d2fe" : "#bbf7d0"}`, color:forge ? "#4338ca" : "#166534", padding:"5px 14px", borderRadius:999, fontSize:12, fontWeight:800, marginBottom:12, letterSpacing:"0.06em" }}>
            {forge ? "⚒️ FORGE SUBMISSION" : "✨ INDEPENDENT CAPSULE"}
          </div>
          <h1 className="lsc-title-h" style={{ margin:"0 0 8px", fontSize:34, fontWeight:900, color:"#0f172a", letterSpacing:"-0.04em", lineHeight:1.1 }}>
            {forge ? "Submit Your SkillCapsule" : "Launch a SkillCapsule"}
          </h1>
          <p style={{ margin:0, color:"#64748b", fontSize:15, lineHeight:1.7 }}>
            {forge
              ? <>Submitting to <strong style={{ color:"#0f172a" }}>{forge.title}</strong> by {forge.company_name}. Challenge details are pre-filled and locked — just add your work.</>
              : "Showcase your real work. Recruiters browse The Showfloor and Send SkillSignals, Spotlight, or Call you directly."
            }
          </p>
        </div>

        {/* ── FORGE CONTEXT BANNER ── */}
        {forge && (
          <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a5f)", borderRadius:22, padding:"22px 22px", marginBottom:22, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"rgba(124,58,237,.2)", filter:"blur(36px)", pointerEvents:"none" }} />
            <div style={{ position:"relative", zIndex:1 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap", marginBottom:16 }}>
                <div>
                  <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:800, color:"#93c5fd", textTransform:"uppercase", letterSpacing:"0.08em" }}>You're submitting to</p>
                  <h3 style={{ margin:0, fontSize:19, fontWeight:900, color:"white", letterSpacing:"-0.02em" }}>{forge.title}</h3>
                  <p style={{ margin:"4px 0 0", fontSize:13, color:"#bfdbfe" }}>by {forge.company_name}</p>
                </div>
                <div style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", borderRadius:14, padding:"12px 16px", textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:22, fontWeight:900, color:"white", lineHeight:1 }}>🏆 {forge.reward_clout}</div>
                  <div style={{ fontSize:11, color:"#93c5fd", fontWeight:700, marginTop:3 }}>Clout on accept</div>
                </div>
              </div>
              <div className="lsc-forge-meta" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {[
                  { icon:"🏷️", label:"Category",   val:forge.category.charAt(0).toUpperCase()+forge.category.slice(1) },
                  { icon:"📊", label:"Difficulty",  val:forge.difficulty.charAt(0).toUpperCase()+forge.difficulty.slice(1) },
                  { icon:"⏱️", label:"Est. Time",   val:forge.estimated_time || "Open" },
                  { icon:"🔒", label:"Pre-filled",  val:"Fields locked" },
                ].map((m,i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"9px 10px" }}>
                    <div style={{ fontSize:10, color:"#93c5fd", fontWeight:700, marginBottom:3 }}>{m.icon} {m.label}</div>
                    <div style={{ fontSize:12, color:"white", fontWeight:800 }}>{m.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN LAYOUT ── */}
        <div className="lsc-layout" style={{ display:"flex", gap:18, alignItems:"flex-start" }}>

          {/* ══ FORM ══════════════════════════════════════════════ */}
          <form onSubmit={handleSubmit} style={{ flex:1, minWidth:0, display:"grid", gap:14 }}>

            {error && (
              <div style={{ background:"#fee2e2", border:"1px solid #fecaca", borderRadius:14, padding:"13px 16px", display:"flex", alignItems:"center", gap:10, color:"#991b1b", fontSize:14, fontWeight:600 }}>
                <span style={{ fontSize:18 }}>⚠️</span>{error}
              </div>
            )}

            {/* ── Locked section (forge fields) ── */}
            {forge && (
              <FormCard icon="🔒" title="Challenge Details" subtitle="Pre-filled from the Forge — these fields are locked." accent="#4338ca" accentBg="#eef2ff">
                {/* Title — locked */}
                <FieldBlock label="Capsule Title" locked>
                  <input value={title} readOnly className="lsc-input lsc-locked" style={inputStyle} />
                </FieldBlock>

                {/* Description — locked */}
                <FieldBlock label="Challenge Description" locked>
                  <textarea value={description} readOnly rows={4} className="lsc-input lsc-locked" style={{ ...inputStyle, resize:"none" }} />
                </FieldBlock>

                {/* Category + Difficulty locked row */}
                <div className="lsc-row" style={{ display:"flex", gap:12 }}>
                  <FieldBlock label="Category" locked style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:13, padding:"11px 14px" }}>
                      <span style={{ fontSize:18 }}>{getCat(category).icon}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:"#64748b", textTransform:"capitalize" }}>{category}</span>
                    </div>
                  </FieldBlock>
                  <FieldBlock label="Difficulty" locked style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, background:getDiff(difficulty).bg, border:`1.5px solid ${getDiff(difficulty).border}`, borderRadius:13, padding:"11px 14px" }}>
                      <span style={{ fontSize:14, fontWeight:800, color:getDiff(difficulty).color, textTransform:"capitalize" }}>{difficulty || "—"}</span>
                    </div>
                  </FieldBlock>
                </div>

                {/* Skills — locked */}
                {forge.skills_required && forge.skills_required.length > 0 && (
                  <FieldBlock label="Required Skills" locked>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", padding:"10px 14px", background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:13 }}>
                      {forge.skills_required.map(s => (
                        <span key={s} style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", padding:"3px 10px", borderRadius:999, fontSize:12, fontWeight:700 }}>{s}</span>
                      ))}
                    </div>
                  </FieldBlock>
                )}
              </FormCard>
            )}

            {/* ── Free-fill section (independent or submission-specific) ── */}
            <FormCard
              icon={forge ? "✏️" : "📝"}
              title={forge ? "Your Work" : "Capsule Details"}
              subtitle={forge ? "Tell the sponsor what you built and how." : "Describe your work and how you built it."}
              accent="#2563eb" accentBg="#eff6ff"
            >
              {/* Title — only if independent */}
              {!forge && (
                <FieldBlock label="Capsule Title" required>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., React Dashboard with Real-time Analytics"
                    className="lsc-input" style={inputStyle} maxLength={120} required
                  />
                  <div style={charHint}>{title.length}/120</div>
                </FieldBlock>
              )}

              {/* Description — only if independent */}
              {!forge && (
                <FieldBlock label="Description" required hint="What did you build? What problem does it solve?">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what you made, the challenges you faced, and what makes your solution stand out..."
                    rows={5} className="lsc-input" style={{ ...inputStyle, resize:"vertical" }} maxLength={1000} required
                  />
                  <div style={charHint}>{description.length}/1000</div>
                </FieldBlock>
              )}

              {/* Submission type */}
              <FieldBlock label="Submission Type" required>
                <div className="lsc-type-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {CAPSULE_TYPES.map(t => (
                    <div key={t.value} onClick={() => setCapsuleType(t.value)}
                      style={{ background: capsuleType === t.value ? "#eff6ff" : "white", border:`1.5px solid ${capsuleType === t.value ? "#2563eb" : "#e2e8f0"}`, borderRadius:13, padding:"12px 10px", textAlign:"center", cursor:"pointer", transition:"all .15s" }}>
                      <div style={{ fontSize:20, marginBottom:5 }}>{t.icon}</div>
                      <div style={{ fontSize:13, fontWeight:800, color: capsuleType === t.value ? "#2563eb" : "#0f172a" }}>{t.label}</div>
                      <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </FieldBlock>

              {/* Link */}
              {capsuleType === "link" && (
                <FieldBlock label="Submission Link" required hint="GitHub, Behance, Google Drive, Live Demo, Figma…">
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15, color:"#94a3b8" }}>🔗</span>
                    <input
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      placeholder="https://github.com/you/project"
                      className="lsc-input" style={{ ...inputStyle, paddingLeft:38 }}
                    />
                  </div>
                </FieldBlock>
              )}

              {capsuleType === "video" && (
                <FieldBlock label="Video Link" required hint="Loom, YouTube (unlisted), Google Drive video…">
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15, color:"#94a3b8" }}>🎥</span>
                    <input
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      placeholder="https://loom.com/share/..."
                      className="lsc-input" style={{ ...inputStyle, paddingLeft:38 }}
                    />
                  </div>
                </FieldBlock>
              )}

              {capsuleType === "text" && (
                <FieldBlock label="Your Submission Text" required>
                  <textarea
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="Write your full submission here..."
                    rows={6} className="lsc-input" style={{ ...inputStyle, resize:"vertical" }}
                  />
                </FieldBlock>
              )}

              {/* Skills + Tools row */}
              <div className="lsc-row" style={{ display:"flex", gap:12 }}>
                <FieldBlock label="Skills Used" hint="Comma separated" locked={!!forge} style={{ flex:1 }}>
                  <input
                    value={skillsUsed}
                    onChange={e => !forge && setSkillsUsed(e.target.value)}
                    placeholder="React, Figma, Python…"
                    className={`lsc-input${forge ? " lsc-locked" : ""}`}
                    readOnly={!!forge} style={inputStyle}
                  />
                </FieldBlock>
                <FieldBlock label="Tools Used" hint="Comma separated" style={{ flex:1 }}>
                  <input
                    value={toolsUsed}
                    onChange={e => setToolsUsed(e.target.value)}
                    placeholder="VS Code, Postman…"
                    className="lsc-input" style={inputStyle}
                  />
                </FieldBlock>
              </div>

              {/* Time spent + Category row (independent only) */}
              {!forge ? (
                <div className="lsc-row" style={{ display:"flex", gap:12 }}>
                  <FieldBlock label="Time Spent" style={{ flex:1 }}>
                    <select value={timeSpent} onChange={e => setTimeSpent(e.target.value)} className="lsc-input" style={inputStyle}>
                      <option value="">Select time</option>
                      {["1-2 hours","2-4 hours","4-8 hours","1 day","2-3 days","1 week"].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </FieldBlock>
                  <FieldBlock label="Category" style={{ flex:1 }}>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="lsc-input" style={inputStyle}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{getCat(c).icon} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                    </select>
                  </FieldBlock>
                </div>
              ) : (
                /* From forge: time spent only */
                <FieldBlock label="Time You Actually Spent" hint="Optional — helps the sponsor understand your effort.">
                  <select value={timeSpent} onChange={e => setTimeSpent(e.target.value)} className="lsc-input" style={inputStyle}>
                    <option value="">Select time</option>
                    {["1-2 hours","2-4 hours","4-8 hours","1 day","2-3 days","1 week"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </FieldBlock>
              )}

              {/* Difficulty (independent only) */}
              {!forge && (
                <FieldBlock label="Difficulty">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {(["beginner","intermediate","advanced"] as const).map(d => {
                      const dm = getDiff(d);
                      return (
                        <div key={d} onClick={() => setDifficulty(difficulty === d ? "" : d)}
                          style={{ background: difficulty === d ? dm.bg : "white", border:`1.5px solid ${difficulty === d ? dm.border : "#e2e8f0"}`, borderRadius:13, padding:"11px 10px", textAlign:"center", cursor:"pointer", transition:"all .15s" }}>
                          <div style={{ fontSize:13, fontWeight:800, color: difficulty === d ? dm.color : "#64748b", textTransform:"capitalize" }}>{d}</div>
                        </div>
                      );
                    })}
                  </div>
                </FieldBlock>
              )}
            </FormCard>

            {/* ── Visibility ── */}
            <FormCard icon="👁️" title="Visibility" subtitle="Who can see your SkillCapsule on The Showfloor?" accent="#7c3aed" accentBg="#fdf4ff">
              <div className="lsc-vis-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                {VISIBILITY_OPTIONS.map(v => (
                  <div key={v.value} onClick={() => setVisibility(v.value)}
                    style={{ background: visibility === v.value ? "#fdf4ff" : "white", border:`1.5px solid ${visibility === v.value ? "#7c3aed" : "#e2e8f0"}`, borderRadius:14, padding:"14px 12px", textAlign:"center", cursor:"pointer", transition:"all .15s" }}>
                    <div style={{ fontSize:22, marginBottom:6 }}>{v.icon}</div>
                    <div style={{ fontSize:13, fontWeight:800, color: visibility === v.value ? "#7c3aed" : "#0f172a" }}>{v.label}</div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:3, lineHeight:1.4 }}>{v.desc}</div>
                  </div>
                ))}
              </div>
            </FormCard>

            {/* ── Submit ── */}
            <button type="submit" className="lsc-btn" disabled={loading}
              style={{ width:"100%", background: loading ? "#94a3b8" : "linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"16px", borderRadius:16, fontWeight:900, fontSize:17, boxShadow: loading ? "none" : "0 10px 28px rgba(37,99,235,.35)", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              {loading
                ? <><div style={{ width:20, height:20, borderRadius:"50%", border:"3px solid rgba(255,255,255,.3)", borderTopColor:"white", animation:"spin 0.8s linear infinite" }} />Launching…</>
                : <><span>{forge ? "🚀 Submit SkillCapsule to Forge" : "✨ Launch SkillCapsule"}</span></>
              }
            </button>

            {/* Clout reminder */}
            <div style={{ background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1px solid #bbf7d0", borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>🏆</span>
              <p style={{ margin:0, fontSize:13, color:"#166534", fontWeight:600, lineHeight:1.5 }}>
                {forge
                  ? <>You'll earn <strong>{forge.reward_clout} Clout</strong> if accepted. Plus <strong>+5 Clout</strong> just for submitting.</>
                  : <>You'll earn <strong>+5 Clout</strong> for launching this capsule. SkillSignals from recruiters add more.</>
                }
              </p>
            </div>
          </form>

          {/* ══ PREVIEW sidebar (desktop) ══════════════════════════ */}
          <div className="lsc-preview" style={{ width:300, flexShrink:0, position:"sticky", top:24, display:"grid", gap:12 }}>
            <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 8px 28px rgba(2,6,23,.08)", border:"1px solid #f1f5f9" }}>
              {/* Preview header bar */}
              <div style={{ background:"#0f172a", padding:"10px 16px", display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444" }} />
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#f59e0b" }} />
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#10b981" }} />
                <span style={{ marginLeft:8, fontSize:11, color:"#475569", fontWeight:600 }}>Showfloor Preview</span>
              </div>

              {/* Category banner */}
              <div style={{ height:56, background:`linear-gradient(135deg,${cat.bg},#f8fafc)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:30 }}>{cat.icon}</span>
              </div>

              <div style={{ padding:"16px 16px" }}>
                {/* Badges */}
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                  <span style={{ background:cat.bg, color:cat.color, border:`1px solid ${cat.color}33`, padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800, textTransform:"capitalize" }}>{cat.icon} {category}</span>
                  {difficulty && <span style={{ background:diff.bg, color:diff.color, border:`1px solid ${diff.border}`, padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800, textTransform:"capitalize" }}>{difficulty}</span>}
                  <span style={{ background:"#f0fdf4", color:"#166534", border:"1px solid #bbf7d0", padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800 }}>✨ New</span>
                </div>

                {/* Title */}
                <h3 style={{ margin:"0 0 6px", fontSize:15, fontWeight:900, color:"#0f172a", lineHeight:1.3 }}>
                  {title || <span style={{ color:"#cbd5e1" }}>Your capsule title…</span>}
                </h3>

                {/* Description */}
                <p style={{ margin:"0 0 12px", color:"#64748b", fontSize:12, lineHeight:1.65 }}>
                  {description
                    ? description.slice(0, 100) + (description.length > 100 ? "…" : "")
                    : <span style={{ color:"#e2e8f0" }}>Your description…</span>}
                </p>

                {/* Skills */}
                {skillsUsed && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                    {skillsUsed.split(",").slice(0,4).map(s => s.trim()).filter(Boolean).map(s => (
                      <span key={s} style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700 }}>{s}</span>
                    ))}
                  </div>
                )}

                {/* Divider */}
                <div style={{ height:1, background:"#f1f5f9", margin:"10px 0" }} />

                {/* CTA preview */}
                <div style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", padding:"10px", borderRadius:12, textAlign:"center", fontSize:13, fontWeight:800 }}>
                  View SkillCapsule →
                </div>

                {/* Signal icons */}
                <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:10 }}>
                  {["skilled","creative","hireable"].map(sig => (
                    <span key={sig} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", color:"#64748b", padding:"4px 8px", borderRadius:999, fontSize:10, fontWeight:700 }}>+{sig}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Tips card */}
            <div style={{ background:"linear-gradient(135deg,#fefce8,#fffbeb)", borderRadius:16, padding:"16px", border:"1px solid #fde68a" }}>
              <h4 style={{ margin:"0 0 10px", fontSize:13, fontWeight:900, color:"#0f172a" }}>💡 Tips for more SkillSignals</h4>
              <div style={{ display:"grid", gap:7 }}>
                {[
                  "Add a live demo link — recruiters click more.",
                  "List specific skills — filter matching improves.",
                  "Keep description concise and outcome-focused.",
                  "Public capsules get 5× more Spotlight saves.",
                ].map((tip, i) => (
                  <div key={i} style={{ display:"flex", gap:7, alignItems:"flex-start" }}>
                    <span style={{ color:"#f59e0b", fontSize:12, flexShrink:0 }}>✦</span>
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

// ── Wrap in Suspense to satisfy Next.js static rendering ──────────
export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", fontFamily:"Inter,system-ui,sans-serif" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"4px solid #dbe3ee", borderTopColor:"#2563eb", animation:"spin 0.8s linear infinite", marginBottom:16 }} />
        <p style={{ color:"#64748b", fontWeight:700, margin:0 }}>Loading page…</p>
      </div>
    }>
      <LaunchSkillCapsuleContent />
    </Suspense>
  );
}

// ── Sub-components ─────────────────────────────────────────────────
function FormCard({ icon, title, subtitle, children, accent = "#2563eb", accentBg = "#eff6ff" }: {
  icon: string; title: string; subtitle: string; children: React.ReactNode;
  accent?: string; accentBg?: string;
}) {
  return (
    <div style={{ background:"white", borderRadius:20, padding:"24px 20px", boxShadow:"0 6px 20px rgba(2,6,23,.05)", border:"1px solid #f1f5f9" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
        <div style={{ width:36, height:36, borderRadius:11, background:accentBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{icon}</div>
        <div>
          <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:"#0f172a" }}>{title}</h2>
          <p style={{ margin:0, fontSize:12, color:"#94a3b8", fontWeight:600 }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ display:"grid", gap:16 }}>{children}</div>
    </div>
  );
}

function FieldBlock({ label, required, locked, hint, children, style: extraStyle }: {
  label: string; required?: boolean; locked?: boolean; hint?: string;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={extraStyle}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
        <label style={{ fontSize:13, fontWeight:800, color:"#0f172a" }}>
          {label}
          {required && <span style={{ color:"#2563eb", marginLeft:3 }}>*</span>}
        </label>
        {locked && <span style={{ background:"#f1f5f9", color:"#94a3b8", border:"1px solid #e2e8f0", padding:"1px 7px", borderRadius:999, fontSize:10, fontWeight:800 }}>🔒 Locked</span>}
      </div>
      {hint && <p style={{ margin:"0 0 7px", fontSize:11, color:"#94a3b8", fontWeight:600 }}>{hint}</p>}
      {children}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 13,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  color: "#0f172a",
  background: "white",
  boxSizing: "border-box",
  fontFamily: "Inter,system-ui,sans-serif",
};

const charHint: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  textAlign: "right",
  marginTop: 4,
  fontWeight: 600,
};