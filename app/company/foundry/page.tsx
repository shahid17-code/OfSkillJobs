"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

type ToastType = "success" | "error" | "info";
type ActiveTab = "forges" | "submissions" | "spotlighted";

type TopSkill = { skill: string; count: number };
type RisingTalent = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  current_score: number;
  previous_score: number;
  growth_pct: number;
};
type TopCategorySignal = { category: string; signal_count: number };
type ActivityPoint = { date: string; spotlights: number; calls: number };

const CAT_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  design:        { icon: "🎨", color: "#7c3aed", bg: "#fdf4ff", border: "#e9d5ff" },
  development:   { icon: "💻", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  writing:       { icon: "✍️", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  sales:         { icon: "💼", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  marketing:     { icon: "📈", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  research:      { icon: "🔬", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
  communication: { icon: "💬", color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
};

const DIFF_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  beginner:     { color: "#166534", bg: "#dcfce7", border: "#bbf7d0", label: "Beginner" },
  intermediate: { color: "#92400e", bg: "#fef3c7", border: "#fde68a", label: "Intermediate" },
  advanced:     { color: "#991b1b", bg: "#fee2e2", border: "#fecaca", label: "Advanced" },
};

function getCat(c: string) { return CAT_META[c?.toLowerCase()] || { icon: "⚡", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" }; }
function getDiff(d: string) { return DIFF_META[d?.toLowerCase()] || DIFF_META.intermediate; }

export default function CompanyFoundryPage() {
  return (
    <ProtectedRoute role="company">
      <CompanyFoundryInner />
    </ProtectedRoute>
  );
}

function CompanyFoundryInner() {
  const router = useRouter();
  const [activeTab,             setActiveTab]             = useState<ActiveTab>("forges");
  const [skillForges,           setSkillForges]           = useState<any[]>([]);
  const [forgeSubmissions,      setForgeSubmissions]      = useState<any[]>([]);
  const [spotlightedCandidates, setSpotlightedCandidates] = useState<any[]>([]);
  const [callsSent,             setCallsSent]             = useState<any[]>([]);
  const [loading,               setLoading]               = useState(true);
  const [toast,                 setToast]                 = useState<{ message: string; type: ToastType } | null>(null);
  const [subFilter,             setSubFilter]             = useState("");
  const [subStatusFilter,       setSubStatusFilter]       = useState("");
  const [deleteTarget,          setDeleteTarget]          = useState<string | null>(null);

  const [topSkills,         setTopSkills]         = useState<TopSkill[]>([]);
  const [risingTalents,     setRisingTalents]     = useState<RisingTalent[]>([]);
  const [topCatSignals,     setTopCatSignals]     = useState<TopCategorySignal[]>([]);
  const [activityHistory,   setActivityHistory]   = useState<ActivityPoint[]>([]);
  const [avgCraftRank,      setAvgCraftRank]      = useState(0);
  const [totalSignals,      setTotalSignals]      = useState(0);
  const [totalCloutAwarded, setTotalCloutAwarded] = useState(0);

  useEffect(() => { loadData(); loadAnalytics(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: forges } = await supabase
      .from("skill_forges")
      .select("*")
      .eq("company_sponsor_id", user.id)
      .order("created_at", { ascending: false });
    setSkillForges(forges || []);

    const forgeIds = (forges || []).map((f: any) => f.id);
    if (forgeIds.length) {
      const { data: subs } = await supabase
        .from("forge_submissions")
        .select(`*, skill_capsules!capsule_id ( id, title, link_url, description ), users!user_id ( id, full_name, email, username, avatar_url )`)
        .in("forge_id", forgeIds)
        .order("submitted_at", { ascending: false });
      setForgeSubmissions(subs || []);
    }

    const { data: spots } = await supabase
      .from("recruiter_spotlights")
      .select(`*, candidate:users!candidate_id ( id, full_name, email, username, avatar_url ), capsule:skill_capsules!capsule_id ( id, title, link_url )`)
      .eq("recruiter_id", user.id)
      .eq("spotlight_type", "spot")
      .order("created_at", { ascending: false });
    setSpotlightedCandidates(spots || []);

    const { data: calls } = await supabase
      .from("recruiter_spotlights")
      .select("id")
      .eq("recruiter_id", user.id)
      .eq("spotlight_type", "call");
    setCallsSent(calls || []);

    setLoading(false);
  }

  async function loadAnalytics() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: capsules } = await supabase.from("skill_capsules").select("skills_used, skill_impact_score");
    const skillCounts: Record<string, number> = {};
    let impactTotal = 0;
    capsules?.forEach((cap: any) => {
      (cap.skills_used || []).forEach((s: string) => { skillCounts[s] = (skillCounts[s] || 0) + 1; });
      impactTotal += cap.skill_impact_score || 0;
    });
    setAvgCraftRank(capsules?.length ? Math.round(impactTotal / capsules.length) : 0);
    setTopSkills(
      Object.entries(skillCounts)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7)
    );

    const { count: sigCount } = await supabase.from("skill_signals").select("*", { count: "exact", head: true });
    setTotalSignals(sigCount || 0);

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: recentCaps } = await supabase.from("skill_capsules").select("user_id, skill_impact_score").gte("created_at", thirtyDaysAgo.toISOString());
    const { data: prevCaps } = await supabase.from("skill_capsules").select("user_id, skill_impact_score").lt("created_at", thirtyDaysAgo.toISOString()).gte("created_at", ninetyDaysAgo.toISOString());
    const recentMap: Record<string, number> = {};
    const prevMap: Record<string, number> = {};
    recentCaps?.forEach((c: any) => { recentMap[c.user_id] = (recentMap[c.user_id] || 0) + (c.skill_impact_score || 0); });
    prevCaps?.forEach((c: any) => { prevMap[c.user_id] = (prevMap[c.user_id] || 0) + (c.skill_impact_score || 0); });
    const allIds = new Set([...Object.keys(recentMap), ...Object.keys(prevMap)]);
    const rising: RisingTalent[] = [];
    for (const uid of allIds) {
      const r = recentMap[uid] || 0, p = prevMap[uid] || 0;
      if (p === 0 || r <= p) continue;
      const { data: u } = await supabase.from("users").select("full_name, username").eq("id", uid).single();
      rising.push({ user_id: uid, full_name: u?.full_name || null, username: u?.username || null, current_score: r, previous_score: p, growth_pct: ((r - p) / p) * 100 });
    }
    setRisingTalents(rising.sort((a, b) => b.growth_pct - a.growth_pct).slice(0, 5));

    const { data: sigs } = await supabase.from("skill_signals").select("capsule_id");
    const capsuleIds = [...new Set((sigs || []).map((s: any) => s.capsule_id))];
    if (capsuleIds.length) {
      const { data: sigCaps } = await supabase.from("skill_capsules").select("category").in("id", capsuleIds);
      const catMap: Record<string, number> = {};
      sigCaps?.forEach((c: any) => { if (c.category) catMap[c.category] = (catMap[c.category] || 0) + 1; });
      setTopCatSignals(Object.entries(catMap).map(([category, signal_count]) => ({ category, signal_count })).sort((a, b) => b.signal_count - a.signal_count).slice(0, 5));
    }

    const { data: forgesClout } = await supabase.from("skill_forges").select("reward_clout").eq("company_sponsor_id", user.id);
    setTotalCloutAwarded((forgesClout || []).reduce((sum: number, f: any) => sum + (f.reward_clout || 0), 0));

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentActivity } = await supabase
      .from("recruiter_spotlights")
      .select("created_at, spotlight_type")
      .eq("recruiter_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString());
    const actMap: Record<string, { spotlights: number; calls: number }> = {};
    const last7 = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });
    last7.forEach(d => { actMap[d] = { spotlights: 0, calls: 0 }; });
    recentActivity?.forEach((a: any) => {
      const d = new Date(a.created_at).toISOString().split("T")[0];
      if (actMap[d]) { a.spotlight_type === "spot" ? actMap[d].spotlights++ : actMap[d].calls++; }
    });
    setActivityHistory(last7.map(d => ({ date: d, ...actMap[d] })));
  }

  async function updateSubmissionStatus(subId: string, status: "selected" | "rejected") {
    const { error } = await supabase.from("forge_submissions").update({ status }).eq("id", subId);
    if (error) { showToast("Failed to update status", "error"); return; }
    setForgeSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status } : s));
    showToast(status === "selected" ? "✅ Candidate selected!" : "Submission rejected.", status === "selected" ? "success" : "info");
  }

  async function sendCall(candidateId: string, capsuleId?: string, candidateName?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("recruiter_spotlights").insert({ recruiter_id: user.id, candidate_id: candidateId, spotlight_type: "call", capsule_id: capsuleId || null });
    if (error) { showToast("Failed to send call", "error"); return; }
    showToast(`📞 Call sent to ${candidateName || "candidate"}!`, "success");
    setCallsSent(prev => [...prev, { id: Date.now().toString() }]);
  }

  // ✅ UPDATED deleteForge with proper error handling and .select()
  async function deleteForge(forgeId: string) {
    const { data, error } = await supabase
      .from("skill_forges")
      .delete()
      .eq("id", forgeId)
      .select();

    if (error) {
      showToast("❌ Failed to delete forge: " + error.message, "error");
      return;
    }

    if (!data || data.length === 0) {
      showToast("❌ Forge not found or you don't have permission to delete it.", "error");
      return;
    }

    // Success – update local state
    setSkillForges(prev => prev.filter(f => f.id !== forgeId));
    setForgeSubmissions(prev => prev.filter(s => s.forge_id !== forgeId));
    showToast("✅ Forge deleted successfully.", "success");
    setDeleteTarget(null);
    // No need to re-fetch; local state is already updated.
  }

  function showToast(message: string, type: ToastType = "info", duration = 3500) {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }

  const filteredSubs = forgeSubmissions.filter(s => {
    return (!subFilter || s.forge_id === subFilter) && (!subStatusFilter || s.status === subStatusFilter);
  });

  const maxSkillCount = topSkills[0]?.count || 1;
  const maxCatCount = topCatSignals[0]?.signal_count || 1;
  const maxActivity = Math.max(...activityHistory.map(a => Math.max(a.spotlights, a.calls)), 1);

  const SKILL_COLORS = ["#2563eb","#7c3aed","#0891b2","#059669","#d97706","#6366f1","#db2777"];

  if (loading) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", fontFamily:"Inter,system-ui,sans-serif" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"4px solid #e2e8f0", borderTopColor:"#2563eb", animation:"spin 0.8s linear infinite", marginBottom:16 }} />
        <p style={{ color:"#64748b", fontWeight:700, margin:0 }}>Loading The Foundry…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }

        .cf-btn { transition:transform .15s,box-shadow .15s,opacity .15s; cursor:pointer; }
        .cf-btn:hover  { transform:translateY(-1px); }
        .cf-btn:active { transform:scale(.97); opacity:.9; }
        .cf-card { transition:transform .2s ease,box-shadow .2s ease; }
        .cf-card:hover { transform:translateY(-3px); box-shadow:0 20px 48px rgba(2,6,23,.11) !important; }
        .cf-input:focus { border-color:#2563eb !important; box-shadow:0 0 0 3px rgba(37,99,235,.12) !important; outline:none; }
        .cf-anim { animation:fadeUp .4s ease both; }
        .cf-icon-btn { transition:all .15s; cursor:pointer; }
        .cf-icon-btn:hover { transform:scale(1.05); }
        .cf-icon-btn:active { transform:scale(.95); }
        .cf-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:9999; display:flex; align-items:center; justify-content:center; animation:fadeIn .2s ease; }
        .cf-modal { background:white; border-radius:24px; padding:32px 28px 28px; max-width:400px; width:90%; box-shadow:0 24px 48px rgba(0,0,0,.2); text-align:center; }

        .cf-tab-swipe {
          display: none;
        }
        @media (max-width:600px) {
          .cf-tab-swipe {
            display: inline-block;
            font-size: 11px;
            color: #94a3b8;
            position: sticky;
            right: 0;
            background: linear-gradient(to left, white, transparent);
            padding: 0 12px 0 16px;
            flex-shrink: 0;
            font-weight: 700;
            letter-spacing: 0.04em;
          }
          .cf-tabs-row {
            overflow-x: auto;
            flex-wrap: nowrap !important;
            width: 100%;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 4px;
            display: flex;
            align-items: center;
          }
          .cf-tabs-row::-webkit-scrollbar { display:none; }
        }

        @media (max-width:900px) {
          .cf-hero-inner   { flex-direction:column !important; }
          .cf-hero-title   { font-size:24px !important; }
          .cf-stat-row     { flex-wrap:wrap !important; }
          .cf-metrics-grid { grid-template-columns:1fr 1fr !important; }
          .cf-analytics    { grid-template-columns:1fr !important; }
          .cf-forges-grid  { grid-template-columns:1fr !important; }
          .cf-spots-grid   { grid-template-columns:1fr !important; }
          .cf-hero-actions { flex-direction:column !important; width:100% !important; gap:8px !important; }
          .cf-hero-actions a, .cf-hero-actions button { width:100% !important; justify-content:center !important; }
          .cf-sub-actions  { flex-wrap:wrap !important; }
          .cf-action-buttons { flex-wrap:wrap !important; }
        }
      `}</style>

      {toast && (
        <div style={{ position:"fixed", top:18, right:18, zIndex:9999, background: toast.type==="success" ? "#10b981" : toast.type==="error" ? "#ef4444" : "#2563eb", color:"white", padding:"12px 18px", borderRadius:14, fontWeight:700, fontSize:14, boxShadow:"0 10px 30px rgba(0,0,0,.18)", maxWidth:"calc(100vw - 36px)" }}>
          {toast.message}
        </div>
      )}

      {deleteTarget && (
        <div className="cf-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="cf-modal">
            <div style={{ fontSize:48, marginBottom:12 }}>🗑️</div>
            <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"#0f172a" }}>Delete Forge?</h3>
            <p style={{ margin:"0 0 24px", color:"#64748b", fontSize:14, lineHeight:1.6 }}>
              This will permanently remove the forge and all its submissions. This cannot be undone.
            </p>
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex:1, background:"#f1f5f9", border:"none", padding:"12px", borderRadius:12, fontWeight:700, fontSize:14, color:"#475569", cursor:"pointer" }}>Cancel</button>
              <button onClick={() => deleteForge(deleteTarget)} style={{ flex:1, background:"#ef4444", border:"none", padding:"12px", borderRadius:12, fontWeight:700, fontSize:14, color:"white", cursor:"pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:1220, margin:"0 auto", padding:"28px 16px 60px", fontFamily:"Inter,system-ui,-apple-system,'Segoe UI',sans-serif" }}>

        {/* ══ HERO ══ */}
        <div className="cf-anim" style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 55%,#1e40af 100%)", borderRadius:28, padding:"32px 28px", marginBottom:22, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220, borderRadius:"50%", background:"rgba(124,58,237,.18)", filter:"blur(44px)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-50, left:-40, width:180, height:180, borderRadius:"50%", background:"rgba(37,99,235,.2)", filter:"blur(36px)", pointerEvents:"none" }} />
          <div className="cf-hero-inner" style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", gap:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
              <div style={{ flex:1, minWidth:240 }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", color:"#93c5fd", padding:"5px 14px", borderRadius:999, fontSize:11, fontWeight:800, marginBottom:14, letterSpacing:"0.06em" }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", animation:"pulse 2s infinite", display:"inline-block" }} />
                  THE FOUNDRY · TALENT COMMAND
                </div>
                <h1 className="cf-hero-title" style={{ margin:"0 0 10px", fontSize:34, fontWeight:900, color:"white", letterSpacing:"-0.04em", lineHeight:1.1 }}>
                  Your Talent Foundry
                </h1>
                <p style={{ margin:"0 0 22px", color:"#bfdbfe", fontSize:15, lineHeight:1.7, maxWidth:480 }}>
                  Shape real-world challenges, review SkillCapsule submissions, and call the candidates worth hiring.
                </p>
              </div>
            </div>

            <div className="cf-stat-row" style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
              {[
                { icon:"⚒️", val: skillForges.filter(f => f.status === "active").length, label:"Active Forges" },
                { icon:"📥", val: forgeSubmissions.length, label:"Submissions" },
                { icon:"🔦", val: spotlightedCandidates.length, label:"Spotlighted" },
                { icon:"📞", val: callsSent.length, label:"Calls Sent" },
              ].map((s, i) => (
                <div key={i} style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", borderRadius:14, padding:"12px 16px", textAlign:"center", minWidth:90, flex:"1 1 auto" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:"white", lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:11, color:"#93c5fd", fontWeight:700, marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="cf-hero-actions" style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap" }}>
              <Link href="/skill-forges/create" style={{ textDecoration:"none", flex:1, minWidth:"140px" }}>
                <button className="cf-btn" style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"12px 18px", borderRadius:14, fontWeight:800, fontSize:14, boxShadow:"0 6px 16px rgba(37,99,235,.35)", whiteSpace:"nowrap" }}>
                  ⚒️ Create New Forge
                </button>
              </Link>
              <Link href="/the-stage" style={{ textDecoration:"none", flex:1, minWidth:"140px" }}>
                <button className="cf-btn" style={{ width:"100%", background:"rgba(255,255,255,.1)", color:"#e2e8f0", border:"1px solid rgba(255,255,255,.18)", padding:"12px 18px", borderRadius:14, fontWeight:700, fontSize:14, whiteSpace:"nowrap" }}>
                  🎪 Browse Showfloor
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ══ TOP METRICS ══ */}
        <div className="cf-metrics-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:22 }}>
          {[
            { icon:"🏆", label:"CraftRank Avg",       val: avgCraftRank },
            { icon:"⚡", label:"SkillSignals Total",  val: totalSignals },
            { icon:"🎖️", label:"Clout on Offer",      val: `${totalCloutAwarded} pts` },
            { icon:"📊", label:"Total Forges",         val: skillForges.length },
          ].map((m, i) => (
            <div key={i} style={{ background:"white", borderRadius:18, padding:"16px 18px", border:"1px solid #f1f5f9", boxShadow:"0 4px 14px rgba(2,6,23,.04)" }}>
              <div style={{ fontSize:20, marginBottom:8 }}>{m.icon}</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:26, fontWeight:900, color:"#0f172a", lineHeight:1 }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* ══ ANALYTICS (2×2) ══ */}
        <div className="cf-analytics" style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14, marginBottom:28 }}>
          {/* ... (analytics cards unchanged) ... */}
          <div style={{ background:"white", borderRadius:20, padding:"20px", border:"1px solid #f1f5f9", boxShadow:"0 4px 14px rgba(2,6,23,.04)" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:14, fontWeight:800, color:"#0f172a" }}>📊 Most Active Skills</h3>
            {topSkills.length === 0
              ? <p style={{ fontSize:12, color:"#94a3b8", textAlign:"center", padding:"16px 0", margin:0 }}>No skill data yet.</p>
              : topSkills.map((sk, i) => (
                <div key={sk.skill} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
                  <span style={{ fontSize:11, color:"#64748b", width:70, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sk.skill}</span>
                  <div style={{ flex:1, background:"#f1f5f9", borderRadius:999, height:5, overflow:"hidden" }}>
                    <div style={{ height:"100%", background:SKILL_COLORS[i % SKILL_COLORS.length], borderRadius:999, width:`${Math.round((sk.count / maxSkillCount) * 100)}%`, transition:"width .5s" }} />
                  </div>
                  <span style={{ fontSize:10, color:"#94a3b8", width:20, textAlign:"right", flexShrink:0 }}>{sk.count}</span>
                </div>
              ))
            }
          </div>

          <div style={{ background:"white", borderRadius:20, padding:"20px", border:"1px solid #f1f5f9", boxShadow:"0 4px 14px rgba(2,6,23,.04)" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:14, fontWeight:800, color:"#0f172a" }}>📈 Rising Talent</h3>
            {risingTalents.length === 0
              ? <p style={{ fontSize:12, color:"#94a3b8", textAlign:"center", padding:"16px 0", margin:0 }}>No rising talent yet.</p>
              : risingTalents.map(t => (
                <div key={t.user_id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #f8fafc" }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#2563eb", flexShrink:0 }}>
                    {(t.full_name || t.username || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.full_name || t.username || "Anonymous"}</div>
                    <div style={{ fontSize:10, color:"#94a3b8" }}>{t.current_score} pts</div>
                  </div>
                  <span style={{ background:"#dcfce7", color:"#166534", padding:"2px 7px", borderRadius:999, fontSize:10, fontWeight:800, flexShrink:0 }}>+{Math.round(t.growth_pct)}%</span>
                </div>
              ))
            }
          </div>

          <div style={{ background:"white", borderRadius:20, padding:"20px", border:"1px solid #f1f5f9", boxShadow:"0 4px 14px rgba(2,6,23,.04)" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:14, fontWeight:800, color:"#0f172a" }}>🎯 Top Signal Categories</h3>
            {topCatSignals.length === 0
              ? <p style={{ fontSize:12, color:"#94a3b8", textAlign:"center", padding:"16px 0", margin:0 }}>No signal data yet.</p>
              : topCatSignals.map(c => {
                const meta = getCat(c.category);
                return (
                  <div key={c.category} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
                    <span style={{ fontSize:11, color:"#64748b", width:80, flexShrink:0, textTransform:"capitalize", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{meta.icon} {c.category}</span>
                    <div style={{ flex:1, background:"#f1f5f9", borderRadius:999, height:5, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:meta.color, borderRadius:999, width:`${Math.round((c.signal_count / maxCatCount) * 100)}%`, transition:"width .5s" }} />
                    </div>
                    <span style={{ fontSize:10, color:"#94a3b8", width:20, textAlign:"right", flexShrink:0 }}>{c.signal_count}</span>
                  </div>
                );
              })
            }
          </div>

          <div style={{ background:"white", borderRadius:20, padding:"20px", border:"1px solid #f1f5f9", boxShadow:"0 4px 14px rgba(2,6,23,.04)" }}>
            <h3 style={{ margin:"0 0 10px", fontSize:14, fontWeight:800, color:"#0f172a" }}>⚡ Activity (7 days)</h3>
            <div style={{ display:"flex", gap:14, marginBottom:10 }}>
              {[{ color:"#2563eb", label:"Spotlights" }, { color:"#10b981", label:"Calls" }].map(l => (
                <span key={l.label} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#64748b" }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:l.color, display:"inline-block" }} />{l.label}
                </span>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:72 }}>
              {activityHistory.map((a, i) => {
                const sh = Math.round((a.spotlights / maxActivity) * 64);
                const ch = Math.round((a.calls / maxActivity) * 64);
                const day = new Date(a.date).toLocaleDateString("en-IN", { weekday:"short" }).slice(0, 2);
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, height:"100%" }}>
                    <div style={{ flex:1, display:"flex", alignItems:"flex-end", gap:1, width:"100%" }}>
                      <div style={{ flex:1, height:Math.max(sh, 2), background:"#2563eb", borderRadius:"3px 3px 0 0", opacity:.8 }} />
                      <div style={{ flex:1, height:Math.max(ch, 2), background:"#10b981", borderRadius:"3px 3px 0 0", opacity:.8 }} />
                    </div>
                    <div style={{ fontSize:8, color:"#94a3b8", fontWeight:600 }}>{day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div className="cf-tabs-row" style={{ display:"flex", gap:5, background:"white", borderRadius:16, padding:5, border:"1px solid #f1f5f9", width:"fit-content", marginBottom:22, maxWidth:"100%" }}>
          {([
            { key:"forges",      icon:"⚒️", label:"Your Forges",   count: skillForges.length },
            { key:"submissions", icon:"📥", label:"Submissions",   count: forgeSubmissions.length },
            { key:"spotlighted", icon:"🔦", label:"Spotlighted",   count: spotlightedCandidates.length },
          ] as { key: ActiveTab; icon: string; label: string; count: number }[]).map(tab => (
            <button key={tab.key} className="cf-btn"
              onClick={() => setActiveTab(tab.key)}
              style={{ display:"flex", alignItems:"center", gap:7, background: activeTab === tab.key ? "#f8fafc" : "transparent", border:"none", padding:"10px 18px", borderRadius:12, fontWeight:800, fontSize:14, color: activeTab === tab.key ? "#0f172a" : "#64748b", boxShadow: activeTab === tab.key ? "0 4px 12px rgba(2,6,23,.08)" : "none", whiteSpace:"nowrap", flexShrink:0 }}>
              <span>{tab.icon}</span>
              {tab.label}
              <span style={{ background: activeTab === tab.key ? "#eef2ff" : "#f1f5f9", color: activeTab === tab.key ? "#2563eb" : "#94a3b8", padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:800 }}>{tab.count}</span>
            </button>
          ))}
          <span className="cf-tab-swipe">→ swipe</span>
        </div>

        {/* ══ FORGES TAB ══ */}
        {activeTab === "forges" && (
          <div className="cf-anim">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:"#0f172a" }}>Your Skill Forges</h2>
              <Link href="/skill-forges/create" style={{ textDecoration:"none" }}>
                <button className="cf-btn" style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"10px 18px", borderRadius:12, fontWeight:800, fontSize:13, boxShadow:"0 6px 16px rgba(37,99,235,.3)" }}>
                  + Create Forge
                </button>
              </Link>
            </div>
            {skillForges.length === 0 ? (
              <EmptyState icon="⚒️" title="No Forges yet" desc="Create a SkillForge to start challenging candidates." cta="Create your first Forge" href="/skill-forges/create" />
            ) : (
              <div className="cf-forges-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
                {skillForges.map((f, idx) => {
                  const cat = getCat(f.category);
                  const diff = getDiff(f.difficulty);
                  const subCount = forgeSubmissions.filter(s => s.forge_id === f.id).length;
                  const pct = f.max_submissions ? Math.min(100, Math.round((subCount / f.max_submissions) * 100)) : null;
                  const barGrad = `linear-gradient(90deg,${cat.color},#7c3aed)`;
                  return (
                    <div key={f.id} className="cf-card" style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 6px 22px rgba(2,6,23,.06)", border:"1px solid #f1f5f9", display:"flex", flexDirection:"column", animationDelay:`${Math.min(idx * 40, 240)}ms` }}>
                      <div style={{ height:64, background:`linear-gradient(135deg,${cat.bg},#f8fafc)`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", borderBottom:`1px solid ${cat.border || "#f1f5f9"}` }}>
                        <div style={{ width:42, height:42, borderRadius:12, background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 2px 8px ${cat.color}22`, border:`1px solid ${cat.border || "#f1f5f9"}` }}>
                          {cat.icon}
                        </div>
                        <span style={{ background: f.status === "active" ? "#dcfce7" : "#fee2e2", color: f.status === "active" ? "#166534" : "#991b1b", border:`1px solid ${f.status === "active" ? "#bbf7d0" : "#fecaca"}`, padding:"4px 11px", borderRadius:999, fontSize:11, fontWeight:800 }}>
                          {f.status === "active" ? "Active" : "Closed"}
                        </span>
                      </div>
                      <div style={{ padding:"16px 18px 18px", flex:1, display:"flex", flexDirection:"column" }}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                          <span style={{ background:cat.bg, color:cat.color, border:`1px solid ${cat.border || cat.color+"33"}`, padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800, textTransform:"capitalize" }}>{cat.icon} {f.category}</span>
                          <span style={{ background:diff.bg, color:diff.color, border:`1px solid ${diff.border}`, padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800 }}>{diff.label}</span>
                          <span style={{ background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a", padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800, marginLeft:"auto" }}>🏆 {f.reward_clout} Clout</span>
                        </div>
                        <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:900, color:"#0f172a", letterSpacing:"-0.02em", lineHeight:1.3 }}>{f.title}</h3>
                        <p style={{ margin:"0 0 14px", fontSize:13, color:"#64748b", lineHeight:1.65, flex:1 }}>{(f.description || "").slice(0, 100)}{(f.description || "").length > 100 ? "…" : ""}</p>
                        <div style={{ display:"flex", gap:12, fontSize:12, color:"#94a3b8", marginBottom:12, flexWrap:"wrap" }}>
                          <span>📅 {f.deadline ? new Date(f.deadline).toLocaleDateString("en-IN", { day:"numeric", month:"short" }) : "No deadline"}</span>
                          {f.estimated_time && <span>⏱️ {f.estimated_time}</span>}
                          <span>📥 {subCount} submissions</span>
                        </div>
                        {pct !== null && (
                          <>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#94a3b8", marginBottom:5 }}>
                              <span>{subCount} of {f.max_submissions} submissions</span>
                              <span>{pct}%</span>
                            </div>
                            <div style={{ background:"#f1f5f9", borderRadius:999, height:5, marginBottom:14, overflow:"hidden" }}>
                              <div style={{ height:"100%", background:barGrad, borderRadius:999, width:`${pct}%`, transition:"width .5s ease" }} />
                            </div>
                          </>
                        )}
                        {f.max_submissions && (
                          <p style={{ margin:"0 0 12px", fontSize:12, color:"#64748b" }}>
                            <strong style={{ color:"#0f172a" }}>{f.max_submissions - subCount}</strong> slots remaining
                          </p>
                        )}

                        <div className="cf-action-buttons" style={{ display:"flex", gap:6, marginTop:"auto" }}>
                          <Link href={`/skill-forges/${f.id}/edit`} style={{ textDecoration:"none", flex:1 }}>
                            <button className="cf-icon-btn" style={{ width:"100%", background:"#eef2ff", border:"1px solid #c7d2fe", color:"#1d4ed8", padding:"10px 8px", borderRadius:10, fontSize:13, fontWeight:700, whiteSpace:"nowrap" }}>
                              ✏️ Edit
                            </button>
                          </Link>
                          <button className="cf-icon-btn" onClick={() => setDeleteTarget(f.id)} style={{ flex:1, background:"#fee2e2", border:"1px solid #fecaca", color:"#991b1b", padding:"10px 8px", borderRadius:10, fontSize:13, fontWeight:700, whiteSpace:"nowrap" }}>
                            🗑️ Delete
                          </button>
                          <Link href={`/skill-forges/${f.id}`} style={{ textDecoration:"none", flex:1 }}>
                            <button className="cf-btn" style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"10px 8px", borderRadius:10, fontWeight:900, fontSize:13, boxShadow:"0 4px 12px rgba(37,99,235,.25)", whiteSpace:"nowrap" }}>
                              → Manage
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ SUBMISSIONS TAB ══ */}
        {activeTab === "submissions" && (
          <div className="cf-anim">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:"#0f172a" }}>Incoming Submissions</h2>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <select value={subFilter} onChange={e => setSubFilter(e.target.value)} className="cf-input"
                  style={{ padding:"9px 12px", borderRadius:12, border:"1.5px solid #e2e8f0", fontSize:13, background:"white", color:"#0f172a", cursor:"pointer" }}>
                  <option value="">All Forges</option>
                  {skillForges.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
                <select value={subStatusFilter} onChange={e => setSubStatusFilter(e.target.value)} className="cf-input"
                  style={{ padding:"9px 12px", borderRadius:12, border:"1.5px solid #e2e8f0", fontSize:13, background:"white", color:"#0f172a", cursor:"pointer" }}>
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            {filteredSubs.length === 0 ? (
              <EmptyState icon="📥" title="No submissions yet" desc="Candidates will appear here once they submit to your SkillForges." />
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {filteredSubs.map(sub => {
                  const forgeName = skillForges.find(f => f.id === sub.forge_id)?.title || "SkillForge";
                  const forgeCat = getCat(skillForges.find(f => f.id === sub.forge_id)?.category || "");
                  return (
                    <div key={sub.id} style={{ background:"white", borderRadius:20, overflow:"hidden", border:"1px solid #f1f5f9", boxShadow:"0 4px 16px rgba(2,6,23,.04)" }}>
                      <div style={{ height:4, background:`linear-gradient(90deg,${forgeCat.color},#7c3aed)` }} />
                      <div style={{ padding:"16px 18px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12, flexWrap:"wrap" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
                            {sub.users?.avatar_url
                              ? <img src={sub.users.avatar_url} alt="" style={{ width:40, height:40, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"2px solid #f1f5f9" }} />
                              : <div style={{ width:40, height:40, borderRadius:"50%", background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#2563eb", fontSize:14, flexShrink:0 }}>
                                  {(sub.users?.full_name || "U")[0].toUpperCase()}
                                </div>
                            }
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{sub.users?.full_name || sub.users?.email}</div>
                              <div style={{ fontSize:12, color:"#64748b" }}>⚒️ {forgeName} · {new Date(sub.submitted_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</div>
                            </div>
                          </div>
                          <span style={{ background: sub.status === "selected" ? "#dcfce7" : sub.status === "rejected" ? "#fee2e2" : "#fef3c7", color: sub.status === "selected" ? "#166534" : sub.status === "rejected" ? "#991b1b" : "#92400e", border:`1px solid ${sub.status === "selected" ? "#bbf7d0" : sub.status === "rejected" ? "#fecaca" : "#fde68a"}`, padding:"4px 12px", borderRadius:999, fontSize:11, fontWeight:800, flexShrink:0, textTransform:"capitalize" }}>
                            {sub.status}
                          </span>
                        </div>
                        <div style={{ background:"#f8fafc", borderRadius:12, padding:"9px 14px", marginBottom:12, display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#475569" }}>
                          📎 <strong>{sub.skill_capsules?.title || "Untitled Capsule"}</strong>
                        </div>
                        <div className="cf-sub-actions" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {sub.skill_capsules?.link_url && (
                            <a href={sub.skill_capsules.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                              <button className="cf-btn" style={{ background:"#eef2ff", border:"1px solid #c7d2fe", color:"#1d4ed8", padding:"7px 14px", borderRadius:999, fontSize:12, fontWeight:700, cursor:"pointer" }}>🔗 View Capsule</button>
                            </a>
                          )}
                          <button className="cf-btn" onClick={() => router.push(`/candidate/${sub.users?.id}`)} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", color:"#475569", padding:"7px 14px", borderRadius:999, fontSize:12, fontWeight:700, cursor:"pointer" }}>👤 Profile</button>
                          <button className="cf-btn" onClick={() => updateSubmissionStatus(sub.id, "selected")} style={{ background:"#dcfce7", border:"1px solid #bbf7d0", color:"#166534", padding:"7px 14px", borderRadius:999, fontSize:12, fontWeight:700, cursor:"pointer" }}>✅ Select</button>
                          <button className="cf-btn" onClick={() => sendCall(sub.user_id, sub.capsule_id, sub.users?.full_name)} style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#2563eb", padding:"7px 14px", borderRadius:999, fontSize:12, fontWeight:700, cursor:"pointer" }}>📞 Send Call</button>
                          <button className="cf-btn" onClick={() => updateSubmissionStatus(sub.id, "rejected")} style={{ background:"#fff7f7", border:"1px solid #fecaca", color:"#991b1b", padding:"7px 14px", borderRadius:999, fontSize:12, fontWeight:700, cursor:"pointer" }}>✕ Reject</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ SPOTLIGHTED TAB ══ */}
        {activeTab === "spotlighted" && (
          <div className="cf-anim">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:"#0f172a" }}>Spotlighted Talent</h2>
              <Link href="/the-stage" style={{ textDecoration:"none" }}>
                <button className="cf-btn" style={{ background:"#fef3c7", border:"1px solid #fde68a", color:"#92400e", padding:"9px 16px", borderRadius:12, fontWeight:800, fontSize:13, cursor:"pointer" }}>
                  🔦 Spot more on Showfloor →
                </button>
              </Link>
            </div>
            {spotlightedCandidates.length === 0 ? (
              <EmptyState icon="🔦" title="No spotlighted talent" desc="Go to The Showfloor and click Spotlight on SkillCapsules you love." cta="Browse The Showfloor" href="/the-stage" />
            ) : (
              <div className="cf-spots-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
                {spotlightedCandidates.map(spot => (
                  <div key={spot.id} className="cf-card" style={{ background:"white", borderRadius:20, overflow:"hidden", border:"1px solid #f1f5f9", boxShadow:"0 4px 16px rgba(2,6,23,.05)", display:"flex", flexDirection:"column" }}>
                    <div style={{ height:4, background:"linear-gradient(90deg,#f59e0b,#fbbf24)" }} />
                    <div style={{ padding:"16px 18px 18px", display:"flex", flexDirection:"column", gap:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        {spot.candidate?.avatar_url
                          ? <img src={spot.candidate.avatar_url} alt="" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"2px solid #fde68a" }} />
                          : <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#fef3c7,#fde68a)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#92400e", fontSize:16, flexShrink:0 }}>
                              {(spot.candidate?.full_name || "?")[0].toUpperCase()}
                            </div>
                        }
                        <div>
                          <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{spot.candidate?.full_name || spot.candidate?.email}</div>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>Spotlighted {new Date(spot.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</div>
                        </div>
                        <span style={{ marginLeft:"auto", background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a", padding:"3px 9px", borderRadius:999, fontSize:10, fontWeight:800, flexShrink:0 }}>🔦 Spotlighted</span>
                      </div>
                      {spot.capsule && (
                        <div style={{ background:"#fef9ee", borderRadius:10, padding:"8px 12px", fontSize:12, color:"#92400e", display:"flex", alignItems:"center", gap:6, border:"1px solid #fde68a" }}>
                          📎 {spot.capsule.title}
                        </div>
                      )}
                      <div style={{ display:"flex", gap:8 }}>
                        <button className="cf-btn" onClick={() => router.push(`/candidate/${spot.candidate_id}`)} style={{ flex:1, background:"#eef2ff", border:"1px solid #c7d2fe", color:"#1d4ed8", padding:"9px", borderRadius:12, fontSize:12, fontWeight:700, cursor:"pointer" }}>👤 View Profile</button>
                        <button className="cf-btn" onClick={() => sendCall(spot.candidate_id, spot.capsule_id, spot.candidate?.full_name)} style={{ flex:1, background:"#dcfce7", border:"1px solid #bbf7d0", color:"#166534", padding:"9px", borderRadius:12, fontSize:12, fontWeight:700, cursor:"pointer" }}>📞 Send Call</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ BOTTOM STRIP ══ */}
        <div style={{ marginTop:40, background:"linear-gradient(135deg,#f0f9ff,#eef2ff)", borderRadius:22, padding:"24px 26px", border:"1px solid #bfdbfe", display:"flex", gap:20, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ flex:1, minWidth:220 }}>
            <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:900, color:"#0f172a" }}>Submissions become SkillCapsules on The Showfloor</h3>
            <p style={{ margin:0, color:"#475569", fontSize:14, lineHeight:1.7 }}>Every candidate who completes your Forge gets published. Recruiters across the platform can Spotlight &amp; Call them.</p>
          </div>
          <Link href="/the-stage" style={{ textDecoration:"none", flexShrink:0 }}>
            <button className="cf-btn" style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"12px 22px", borderRadius:14, fontWeight:800, fontSize:14, boxShadow:"0 8px 20px rgba(37,99,235,.3)" }}>
              View The Showfloor →
            </button>
          </Link>
        </div>

      </div>
    </>
  );
}

function EmptyState({ icon, title, desc, cta, href }: { icon: string; title: string; desc: string; cta?: string; href?: string }) {
  return (
    <div style={{ background:"#f8fafc", borderRadius:22, padding:"52px 24px", textAlign:"center", border:"1px dashed #dbe3ee" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:900, color:"#0f172a" }}>{title}</h3>
      <p style={{ margin:"0 0 20px", color:"#64748b", fontSize:14, lineHeight:1.7 }}>{desc}</p>
      {cta && href && (
        <Link href={href} style={{ textDecoration:"none" }}>
          <button style={{ background:"#0f172a", color:"white", border:"none", padding:"11px 24px", borderRadius:14, fontWeight:800, cursor:"pointer", fontSize:14 }}>{cta} →</button>
        </Link>
      )}
    </div>
  );
}