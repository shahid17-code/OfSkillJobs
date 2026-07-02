"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Forge = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  requirements: string;
  deadline: string | null;
  reward_clout: number;
  company_sponsor_id: string | null;
  company_name?: string;
  estimated_time?: string | null;
  skills_required?: string[] | null;
  tags?: string[] | null;
  what_they_will_learn?: string | null;
  evaluation_criteria?: string | null;
  max_submissions?: number | null;
};

type UserSubmission = {
  capsule_id: string;
  capsule_title: string;
  submitted_at: string;
  status: string;
};

const DIFF: Record<string, { color: string; bg: string; border: string; label: string }> = {
  beginner:     { color: "#166534", bg: "#dcfce7", border: "#bbf7d0", label: "Beginner" },
  intermediate: { color: "#92400e", bg: "#fef3c7", border: "#fde68a", label: "Intermediate" },
  advanced:     { color: "#991b1b", bg: "#fee2e2", border: "#fecaca", label: "Advanced" },
};

const CAT: Record<string, { icon: string; color: string; bg: string }> = {
  design:        { icon: "🎨", color: "#7c3aed", bg: "#fdf4ff" },
  development:   { icon: "💻", color: "#2563eb", bg: "#eff6ff" },
  writing:       { icon: "✍️", color: "#0891b2", bg: "#ecfeff" },
  sales:         { icon: "💼", color: "#059669", bg: "#f0fdf4" },
  marketing:     { icon: "📈", color: "#d97706", bg: "#fffbeb" },
  research:      { icon: "🔬", color: "#6366f1", bg: "#eef2ff" },
  communication: { icon: "💬", color: "#db2777", bg: "#fdf2f8" },
};

function catOf(c: string)  { return CAT[c?.toLowerCase()]  || { icon: "⚡", color: "#64748b", bg: "#f8fafc" }; }
function diffOf(d: string) { return DIFF[d?.toLowerCase()] || DIFF.intermediate; }

export default function ForgeDetailPage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const id           = params?.id as string;

  const [forge,           setForge]           = useState<Forge | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [userSubmission,  setUserSubmission]  = useState<UserSubmission | null>(null);
  const [currentUserId,   setCurrentUserId]   = useState<string | null>(null);
  const [isAutoSubmitting,setIsAutoSubmitting]= useState(false);
  const [autoSubmitDone,  setAutoSubmitDone]  = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
    getCurrentUser();
  }, [id]);

  useEffect(() => {
    const capsuleId = searchParams.get("capsule_id");
    if (capsuleId && currentUserId && !autoSubmitDone && !isAutoSubmitting && forge && !userSubmission)
      autoSubmit(capsuleId);
  }, [searchParams, currentUserId, forge, userSubmission, autoSubmitDone]);

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  }

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("skill_forges")
      .select("*, users:company_sponsor_id ( company_name )")
      .eq("id", id).single();
    if (error || !data) { setLoading(false); return; }
    setForge({ ...data, company_name: data.users?.company_name || "Anonymous Sponsor" });

    if (currentUserId) {
      const { data: sub } = await supabase
        .from("forge_submissions")
        .select("capsule_id, skill_capsules!capsule_id ( title ), submitted_at, status")
        .eq("forge_id", id).eq("user_id", currentUserId).maybeSingle();
      if (sub) setUserSubmission({
        capsule_id: sub.capsule_id,
        capsule_title: (sub.skill_capsules as any)?.title || "Untitled",
        submitted_at: sub.submitted_at,
        status: sub.status,
      });
    }
    setLoading(false);
  }

  async function autoSubmit(capsuleId: string) {
    if (!currentUserId || !forge) return;
    setIsAutoSubmitting(true);
    const { error } = await supabase.from("forge_submissions").insert({
      forge_id: id, user_id: currentUserId, capsule_id: capsuleId, status: "submitted",
    });
    if (error) { console.error(error); alert("Submission failed. Please try again."); }
    else { setAutoSubmitDone(true); router.replace(`/skill-forges/${id}`); window.location.reload(); }
    setIsAutoSubmitting(false);
  }

  /* ── LOADING STATE ── */
  if (loading || isAutoSubmitting) {
    const msg = isAutoSubmitting ? "Submitting your SkillCapsule…" : "Loading challenge…";
    const sub = isAutoSubmitting ? "Linking your capsule to this Forge." : "Fetching challenge details for you.";
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", fontFamily:"Inter,system-ui,sans-serif", padding:24, textAlign:"center" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width:48, height:48, borderRadius:"50%", border:"4px solid #e2e8f0", borderTopColor: isAutoSubmitting ? "#10b981" : "#2563eb", animation:"spin 0.8s linear infinite", marginBottom:20 }} />
        <h3 style={{ margin:"0 0 8px", color:"#0f172a", fontWeight:800, fontSize:20 }}>{msg}</h3>
        <p style={{ margin:0, color:"#64748b", fontSize:15 }}>{sub}</p>
      </div>
    );
  }

  if (!forge) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center", fontFamily:"Inter,system-ui,sans-serif", padding:24 }}>
        <div style={{ fontSize:56, marginBottom:20, opacity:0.6 }}>⚒️</div>
        <h2 style={{ margin:"0 0 12px", color:"#0f172a", fontWeight:800, fontSize:26 }}>Forge not found</h2>
        <p style={{ color:"#64748b", marginBottom:32, fontSize:16 }}>This Skill Forge may have been removed or is no longer active.</p>
        <Link href="/skill-forges" style={{ textDecoration:"none" }}>
          <button style={{ background:"#0f172a", color:"white", border:"none", padding:"12px 28px", borderRadius:40, fontWeight:700, cursor:"pointer", fontSize:15, transition:"transform 0.1s" }}>← Browse all Forges</button>
        </Link>
      </div>
    );
  }

  const isExpired  = !!(forge.deadline && new Date(forge.deadline) < new Date());
  const cat        = catOf(forge.category);
  const diff       = diffOf(forge.difficulty);
  const daysLeft   = forge.deadline
    ? Math.max(0, Math.ceil((new Date(forge.deadline).getTime() - Date.now()) / 86400000))
    : null;
  const canSubmit  = !isExpired && !userSubmission && !!currentUserId;

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseBlue { 0%,100%{opacity:1} 50%{opacity:0.4} }

        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }

        .fd-btn {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .fd-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -8px rgba(0,0,0,0.15);
        }
        .fd-btn:active {
          transform: scale(0.97);
        }

        /* responsive overrides */
        @media (max-width: 860px) {
          .fd-outer    { flex-direction:column !important; gap: 24px !important; }
          .fd-sidebar  { position:relative !important; width:100% !important; top:0 !important; }

          .fd-meta-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }

          .fd-action-pair { flex-direction:row !important; gap: 12px !important; }
          .fd-action-pair a, .fd-action-pair button { flex:1 !important; }

          /* status badges become 2x2 grid + centered open badge */
          .fd-status-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .fd-status-item {
            margin: 0 !important;
            justify-content: center !important;
          }
          .fd-status-open {
            grid-column: 1 / -1 !important;
            justify-self: center !important;
            width: auto !important;
            margin-top: 4px !important;
          }

          .fd-hero-title { font-size: 26px !important; }
          .fd-clout-block { flex-direction: row !important; align-items: center !important; gap: 16px !important; text-align: left !important; }
          .fd-clout-num   { font-size: 28px !important; }
        }

        @media (min-width: 861px) {
          .fd-meta-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 12px; }
          .fd-status-grid { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; }
          .fd-status-item { margin: 0 !important; }
          .fd-status-open { margin-left: 0 !important; }
        }
      `}</style>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 20px 72px", fontFamily:"Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", backgroundColor:"#fafcff" }}>

        {/* breadcrumb */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24, fontSize:14, color:"#64748b", fontWeight:500, flexWrap:"wrap" }}>
          <Link href="/skill-forges" style={{ color:"#64748b", textDecoration:"none", transition:"color 0.2s", display:"inline-flex", alignItems:"center", gap:4 }}>
            <span>⚒️</span> Skill Forges
          </Link>
          <span style={{ color:"#cbd5e1" }}>›</span>
          <span style={{ color:"#0f172a", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"60vw" }}>{forge.title}</span>
        </div>

        {/* hero card */}
        <div style={{ background:`linear-gradient(135deg, ${cat.bg} 0%, #ffffff 100%)`, borderRadius:32, padding:"28px 28px", marginBottom:28, boxShadow:"0 8px 30px rgba(0,0,0,0.04)", border:`1px solid ${cat.color}20` }}>

          {/* status badges - now using grid on mobile */}
          <div className="fd-status-grid" style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:20 }}>
            {/* Category badge */}
            <div className="fd-status-item" style={{ display:"inline-flex", alignItems:"center", gap:6, background:cat.bg, color:cat.color, border:`1px solid ${cat.color}40`, padding:"6px 14px", borderRadius:40, fontSize:13, fontWeight:700 }}>
              {cat.icon} {forge.category.charAt(0).toUpperCase()+forge.category.slice(1)}
            </div>
            {/* Difficulty badge */}
            <div className="fd-status-item" style={{ display:"inline-flex", alignItems:"center", gap:6, background:diff.bg, color:diff.color, border:`1px solid ${diff.border}`, padding:"6px 14px", borderRadius:40, fontSize:13, fontWeight:700 }}>
              {diff.label}
            </div>
            {/* Expired badge (if expired) */}
            {isExpired && (
              <div className="fd-status-item" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#eef2ff", border:"1px solid #cbd5e1", color:"#475569", padding:"6px 14px", borderRadius:40, fontSize:13, fontWeight:700 }}>
                ⏰ Expired
              </div>
            )}
            {/* Submitted badge */}
            {userSubmission && (
              <div className="fd-status-item" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#d1fae5", border:"1px solid #6ee7b7", color:"#065f46", padding:"6px 14px", borderRadius:40, fontSize:13, fontWeight:700 }}>
                ✅ Submitted
              </div>
            )}
            {/* Open badge (centered below on mobile) */}
            {!isExpired && !userSubmission && (
              <div className="fd-status-open" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#e0f2fe", border:"1px solid #7dd3fc", color:"#0369a1", padding:"6px 14px", borderRadius:40, fontSize:13, fontWeight:700 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:"#0ea5e9", animation:"pulseBlue 1.5s infinite", display:"inline-block" }} />
                Open for submissions
              </div>
            )}
            {/* Days left warning (only if not expired) */}
            {!isExpired && daysLeft !== null && daysLeft <= 3 && (
              <div className="fd-status-item" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fef3c7", border:"1px solid #fde68a", color:"#92400e", padding:"6px 14px", borderRadius:40, fontSize:13, fontWeight:700 }}>
                ⏰ {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
              </div>
            )}
          </div>

          <h1 className="fd-hero-title" style={{ margin:"0 0 16px", fontSize:38, fontWeight:800, color:"#0f172a", letterSpacing:"-0.02em", lineHeight:1.2 }}>{forge.title}</h1>
          <p style={{ margin:"0 0 24px", fontSize:15, color:"#475569", fontWeight:500 }}>Posted by <strong style={{ color:"#0f172a" }}>{forge.company_name}</strong></p>

          {/* Meta grid */}
          <div className="fd-meta-grid" style={{ display:"grid", gap:12 }}>
            {[
              { icon:"🏆", label:"Clout Reward",  value:`${forge.reward_clout} pts` },
              { icon:"⏱️", label:"Est. Time",      value:forge.estimated_time || "Open-ended" },
              { icon:"📅", label:"Deadline",       value:forge.deadline ? new Date(forge.deadline).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "No deadline" },
              { icon:"📥", label:"Submissions",    value:forge.max_submissions ? `Max ${forge.max_submissions}` : "Unlimited" },
            ].map((m,i) => (
              <div key={i} style={{ background:"white", borderRadius:20, padding:"16px 12px", boxShadow:"0 2px 6px rgba(0,0,0,0.02)", border:`1px solid ${cat.color}15` }}>
                <div style={{ fontSize:12, color:"#94a3b8", fontWeight:600, marginBottom:6 }}>{m.icon} {m.label}</div>
                <div style={{ fontSize:16, color:"#0f172a", fontWeight:800 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* skills chips */}
          {forge.skills_required && forge.skills_required.length > 0 && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:20 }}>
              <span style={{ fontSize:13, color:"#64748b", fontWeight:600, flexShrink:0 }}>🛠️ Skills:</span>
              {forge.skills_required.map(s => (
                <span key={s} style={{ background:"white", border:`1px solid ${cat.color}30`, color:cat.color, padding:"5px 14px", borderRadius:40, fontSize:13, fontWeight:600, flexShrink:0 }}>{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* main content + sidebar */}
        <div className="fd-outer" style={{ display:"flex", gap:32, alignItems:"flex-start" }}>

          {/* left column */}
          <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:24 }}>

            <Section icon="📋" title="The Challenge" catColor={cat.color}>
              <p style={{ margin:0, color:"#1e293b", lineHeight:1.75, fontSize:16 }}>{forge.description}</p>
            </Section>

            <Section icon="📌" title="Requirements & Deliverables" catColor={cat.color}>
              <div style={{ background:"#f8fafc", borderRadius:20, padding:"20px", border:"1px solid #e9eef3" }}>
                <p style={{ margin:0, color:"#1e293b", lineHeight:1.8, fontSize:15, whiteSpace:"pre-wrap", fontFamily:"ui-monospace, monospace" }}>{forge.requirements}</p>
              </div>
            </Section>

            {forge.what_they_will_learn && (
              <Section icon="🎓" title="What You'll Learn" catColor={cat.color}>
                <p style={{ margin:0, color:"#1e293b", lineHeight:1.75, fontSize:16, whiteSpace:"pre-wrap" }}>{forge.what_they_will_learn}</p>
              </Section>
            )}

            {forge.evaluation_criteria && (
              <Section icon="⚖️" title="How Submissions Are Judged" catColor={cat.color}>
                <div style={{ background:"#fffbeb", borderRadius:20, padding:"18px 20px", border:"1px solid #fde68a" }}>
                  <p style={{ margin:0, color:"#1e293b", lineHeight:1.8, fontSize:15, whiteSpace:"pre-wrap", fontFamily:"ui-monospace, monospace" }}>{forge.evaluation_criteria}</p>
                </div>
              </Section>
            )}

            {forge.tags && forge.tags.length > 0 && (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
                {forge.tags.map(t => (
                  <span key={t} style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", color:"#475569", padding:"5px 14px", borderRadius:40, fontSize:13, fontWeight:600 }}>#{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* right sidebar */}
          <div className="fd-sidebar" style={{ width:320, flexShrink:0, position:"sticky", top:32, display:"flex", flexDirection:"column", gap:20 }}>

            {/* already submitted */}
            {userSubmission && (
              <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:24, padding:"24px 20px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                  <div style={{ width:48, height:48, borderRadius:16, background:"#dcfce7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>✅</div>
                  <div>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:"#166534" }}>Capsule Submitted!</h3>
                    <p style={{ margin:0, fontSize:13, color:"#16a34a", fontWeight:500 }}>Sponsor will review your work</p>
                  </div>
                </div>
                <div style={{ background:"white", borderRadius:16, padding:"14px 16px", border:"1px solid #bbf7d0", marginBottom:14 }}>
                  <p style={{ margin:"0 0 6px", fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>Your SkillCapsule</p>
                  <p style={{ margin:"0 0 8px", fontSize:15, fontWeight:800, color:"#0f172a" }}>{userSubmission.capsule_title}</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:"#64748b" }}>📅 {new Date(userSubmission.submitted_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
                    <span style={{ background: userSubmission.status==="selected" ? "#dcfce7" : userSubmission.status==="rejected" ? "#fee2e2" : "#fef3c7", color: userSubmission.status==="selected" ? "#166534" : userSubmission.status==="rejected" ? "#991b1b" : "#92400e", padding:"4px 12px", borderRadius:40, fontSize:12, fontWeight:700, textTransform:"capitalize" }}>{userSubmission.status}</span>
                  </div>
                </div>
                <p style={{ margin:0, fontSize:13, color:"#16a34a", lineHeight:1.5 }}>Live on <strong>The Showfloor</strong> — recruiters can Spotlight & Call you.</p>
              </div>
            )}

            {/* expired */}
            {isExpired && !userSubmission && (
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:24, padding:"24px 20px", textAlign:"center" }}>
                <div style={{ fontSize:44, marginBottom:14, opacity:0.6 }}>⏰</div>
                <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:800, color:"#475569" }}>Submissions Closed</h3>
                <p style={{ margin:"0 0 20px", color:"#64748b", fontSize:14, lineHeight:1.6 }}>This Forge expired on {new Date(forge.deadline!).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p>
                <Link href="/skill-forges" style={{ textDecoration:"none", display:"block" }}>
                  <button className="fd-btn" style={{ width:"100%", background:"#0f172a", color:"white", border:"none", padding:"14px", borderRadius:40, fontWeight:700, fontSize:15 }}>Browse Other Forges →</button>
                </Link>
              </div>
            )}

            {/* not logged in */}
            {!isExpired && !userSubmission && !currentUserId && (
              <div style={{ background:"white", borderRadius:24, padding:"24px 20px", border:"1px solid #e9eef3", boxShadow:"0 8px 28px rgba(0,0,0,0.04)", textAlign:"center" }}>
                <div style={{ width:60, height:60, borderRadius:20, background:"linear-gradient(135deg,#eef2ff,#dbeafe)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 16px" }}>🔒</div>
                <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:800, color:"#0f172a" }}>Log in to Submit</h3>
                <p style={{ margin:"0 0 24px", color:"#64748b", fontSize:14, lineHeight:1.6 }}>Create a free account to submit your SkillCapsule and earn <strong>{forge.reward_clout} Clout</strong>.</p>
                <div className="fd-action-pair" style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <Link href="/login" style={{ textDecoration:"none" }}>
                    <button className="fd-btn" style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"14px", borderRadius:44, fontWeight:800, fontSize:15, boxShadow:"0 8px 20px rgba(37,99,235,0.25)" }}>Log in</button>
                  </Link>
                  <Link href="/signup" style={{ textDecoration:"none" }}>
                    <button className="fd-btn" style={{ width:"100%", background:"#f8fafc", color:"#0f172a", border:"1px solid #e2e8f0", padding:"14px", borderRadius:44, fontWeight:700, fontSize:14 }}>Sign up free →</button>
                  </Link>
                </div>
              </div>
            )}

            {/* can submit */}
            {canSubmit && (
              <div style={{ background:"white", borderRadius:24, padding:"24px 20px", border:"1px solid #e9eef3", boxShadow:"0 12px 32px rgba(0,0,0,0.06)" }}>
                <div className="fd-clout-block" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"linear-gradient(135deg,#fef3c7,#fff6e5)", borderRadius:20, padding:"18px 20px", marginBottom:20, border:"1px solid #fde68a" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:32 }}>🏆</span>
                    <div>
                      <div className="fd-clout-num" style={{ fontSize:28, fontWeight:900, color:"#0f172a", lineHeight:1 }}>{forge.reward_clout} Clout</div>
                      <div style={{ fontSize:12, color:"#92400e", fontWeight:700 }}>Earned on acceptance</div>
                    </div>
                  </div>
                  <div style={{ fontSize:28, opacity:0.6 }}>⚡</div>
                </div>

                <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:800, color:"#0f172a" }}>Ready to take this on?</h3>
                <p style={{ margin:"0 0 20px", color:"#64748b", fontSize:14, lineHeight:1.6 }}>Create a SkillCapsule for this challenge. It auto‑links to this Forge and goes live on <strong>The Showfloor</strong>.</p>

                <Link href={`/launch-skillcapsule?forge_id=${forge.id}`} style={{ textDecoration:"none", display:"block" }}>
                  <button className="fd-btn" style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"16px", borderRadius:44, fontWeight:800, fontSize:16, boxShadow:"0 10px 24px rgba(37,99,235,0.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                    <span>✨</span> Create & Submit Capsule <span>→</span>
                  </button>
                </Link>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:20 }}>
                  {[
                    { icon:"📂", text:"Auto-linked to Forge"  },
                    { icon:"🌐", text:"Live on Showfloor"     },
                    { icon:"🏆", text:`${forge.reward_clout} Clout` },
                    { icon:"👀", text:"Recruiters can Call you" },
                  ].map((s,i) => (
                    <div key={i} style={{ background:"#f8fafc", borderRadius:14, padding:"10px 12px", display:"flex", alignItems:"center", gap:8, border:"1px solid #f1f5f9" }}>
                      <span style={{ fontSize:15, flexShrink:0 }}>{s.icon}</span>
                      <span style={{ fontSize:12, color:"#334155", fontWeight:600, lineHeight:1.4 }}>{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* sponsor card */}
            <div style={{ background:"#ffffff", borderRadius:20, padding:"20px 18px", border:"1px solid #eef2f6", boxShadow:"0 2px 8px rgba(0,0,0,0.02)" }}>
              <p style={{ margin:"0 0 12px", fontSize:11, fontWeight:700, color:cat.color, textTransform:"uppercase", letterSpacing:"0.08em" }}>Posted by</p>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:cat.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, border:`1px solid ${cat.color}30`, flexShrink:0 }}>{cat.icon}</div>
                <div>
                  <p style={{ margin:0, fontWeight:800, color:"#0f172a", fontSize:15 }}>{forge.company_name}</p>
                  <p style={{ margin:0, fontSize:12, color:"#64748b", fontWeight:600, textTransform:"capitalize" }}>{forge.category} challenge</p>
                </div>
              </div>
            </div>

            <Link href="/skill-forges" style={{ textDecoration:"none" }}>
              <button className="fd-btn" style={{ width:"100%", background:"transparent", color:"#64748b", border:"1px solid #e2e8f0", padding:"12px", borderRadius:40, fontWeight:600, fontSize:14, transition:"all 0.2s" }}>
                ← Back to all Forges
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Section component ── */
function Section({ icon, title, catColor, children }: { icon: string; title: string; catColor: string; children: React.ReactNode }) {
  return (
    <div style={{ background:"white", borderRadius:24, padding:"24px 24px", boxShadow:"0 4px 16px rgba(0,0,0,0.02)", border:"1px solid #eef2f6" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, borderBottom:`2px solid ${catColor}20`, paddingBottom:12 }}>
        <div style={{ width:38, height:38, borderRadius:12, background:`${catColor}10`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{icon}</div>
        <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:"#0f172a" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}