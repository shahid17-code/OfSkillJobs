"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SystemForge = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  points_reward: number;
};

type CompanyForge = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  reward_clout: number;
  estimated_time: string | null;
  company_name: string | null;
};

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  design:        { icon: "🎨", color: "#7c3aed", bg: "#fdf4ff", border: "#e9d5ff" },
  development:   { icon: "💻", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  writing:       { icon: "✍️", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  sales:         { icon: "💼", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  marketing:     { icon: "📈", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  research:      { icon: "🔬", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
  communication: { icon: "💬", color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
};

const DIFFICULTY_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  beginner:     { color: "#166534", bg: "#dcfce7", border: "#bbf7d0", label: "Beginner" },
  intermediate: { color: "#92400e", bg: "#fef3c7", border: "#fde68a", label: "Intermediate" },
  advanced:     { color: "#991b1b", bg: "#fee2e2", border: "#fecaca", label: "Advanced" },
};

function getCatMeta(cat: string) {
  return CATEGORY_META[cat?.toLowerCase()] || { icon: "⚡", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
}
function getDiffStyle(diff: string) {
  return DIFFICULTY_STYLE[diff?.toLowerCase()] || DIFFICULTY_STYLE.intermediate;
}

export default function SkillForgesPage() {
  const [systemForges, setSystemForges] = useState<SystemForge[]>([]);
  const [companyForges, setCompanyForges] = useState<CompanyForge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ofskilljob" | "company">("ofskilljob");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  useEffect(() => { loadAllForges(); }, []);

  async function loadAllForges() {
    setLoading(true);
    try {
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, title, description, difficulty, category, points_reward")
        .order("created_at", { ascending: false });
      setSystemForges(challenges || []);

      const { data: forges } = await supabase
        .from("skill_forges")
        .select("id, title, description, category, difficulty, reward_clout, estimated_time, users:company_sponsor_id ( company_name )")
        .order("created_at", { ascending: false })
        .eq("status", "active");
      setCompanyForges(
        (forges || []).map((f: any) => ({
          id: f.id, title: f.title, description: f.description,
          category: f.category, difficulty: f.difficulty, reward_clout: f.reward_clout,
          estimated_time: f.estimated_time, company_name: f.users?.company_name || "Anonymous",
        }))
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function filterForges<T extends { title: string; category: string; difficulty: string }>(list: T[]) {
    return list.filter(f => {
      const q = searchTerm.toLowerCase();
      return (
        (!searchTerm || f.title.toLowerCase().includes(q)) &&
        (!categoryFilter || f.category === categoryFilter) &&
        (!difficultyFilter || f.difficulty === difficultyFilter)
      );
    });
  }

  const filteredSystem = filterForges(systemForges);
  const filteredCompany = filterForges(companyForges);
  const allCategories = Array.from(new Set([...systemForges.map(f => f.category), ...companyForges.map(f => f.category)].filter(Boolean)));
  const allDifficulties = ["beginner", "intermediate", "advanced"];
  const hasFilters = !!(searchTerm || categoryFilter || difficultyFilter);
  const currentList = activeTab === "ofskilljob" ? filteredSystem : filteredCompany;

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.45} }
        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }

        .sf-card { transition:transform .2s ease,box-shadow .2s ease; }
        .sf-card:hover { transform:translateY(-4px); box-shadow:0 20px 50px rgba(2,6,23,.12) !important; }
        .sf-btn { transition:transform .15s,box-shadow .15s,opacity .15s; cursor:pointer; }
        .sf-btn:hover { transform:translateY(-1px); }
        .sf-btn:active { transform:scale(.97); opacity:.9; }
        .sf-input:focus { border-color:#2563eb !important; box-shadow:0 0 0 3px rgba(37,99,235,.12) !important; outline:none; }
        .sf-anim { animation:fadeUp .4s ease both; }

        /* Badges row: nowrap on desktop, wrap on mobile */
        .sf-badges {
          display: flex;
          gap: 6px;
          flex-wrap: nowrap;
          margin-bottom: 10px;
          align-items: center;
          overflow: hidden;
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .sf-badges {
            flex-wrap: wrap !important;
          }
          .sf-hero-inner  { flex-direction:column !important; gap:20px !important; padding:24px 18px !important; }
          .sf-hero-title  { font-size:26px !important; }
          .sf-hero-sub    { font-size:14px !important; }
          .sf-how-card {
            display: block !important;
            width: 100% !important;
            min-width: 0 !important;
            margin-top: 8px !important;
          }

          .sf-stat-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .sf-stat-grid > *:last-child {
            grid-column: 1 / -1 !important;
            justify-self: center !important;
            width: 50% !important;
          }

          .sf-filter-row  { flex-direction:column !important; gap:8px !important; }
          .sf-filter-row > * { width:100% !important; min-width:0 !important; }
          .sf-search-wrap { width:100% !important; }

          .sf-cat-bar {
            overflow-x:auto !important;
            flex-wrap:nowrap !important;
            -webkit-overflow-scrolling:touch;
            scrollbar-width:none;
            padding-bottom:4px;
          }
          .sf-cat-bar::-webkit-scrollbar { display:none; }
          .sf-cat-bar button { flex-shrink:0 !important; }

          .sf-grid { grid-template-columns:1fr !important; }
          .sf-card { width:100% !important; max-width:100% !important; }

          .sf-bottom-strip { flex-direction:column !important; gap:16px !important; }
          .sf-bottom-strip button { width:100% !important; }

          .sf-tabs-row {
            flex-wrap: wrap !important;
            justify-content: center !important;
            overflow-x: visible !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .sf-tabs-row button {
            flex: 1 1 auto !important;
            padding: 8px 12px !important;
            font-size: 13px !important;
            justify-content: center !important;
          }

          .sf-meta-row { flex-wrap:wrap !important; gap:6px !important; }
        }
      `}</style>

      <div style={{ maxWidth:1240, margin:"0 auto", padding:"24px 16px 60px", fontFamily:"Inter,system-ui,-apple-system,'Segoe UI',sans-serif" }}>

        {/* ══════════ HERO ══════════ */}
        <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 55%,#1e40af 100%)", borderRadius:28, marginBottom:22, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220, borderRadius:"50%", background:"rgba(124,58,237,.18)", filter:"blur(44px)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-50, left:-40, width:180, height:180, borderRadius:"50%", background:"rgba(37,99,235,.2)", filter:"blur(36px)", pointerEvents:"none" }} />

          <div className="sf-hero-inner" style={{ position:"relative", zIndex:1, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:36, flexWrap:"wrap", padding:"36px 32px" }}>
            <div style={{ flex:1, minWidth:240 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", color:"#93c5fd", padding:"5px 14px", borderRadius:999, fontSize:11, fontWeight:800, marginBottom:14, letterSpacing:"0.06em" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", animation:"pulse 2s infinite", display:"inline-block" }} />
                SKILL FORGES · LIVE CHALLENGES
              </div>
              <h1 className="sf-hero-title" style={{ margin:"0 0 12px", fontSize:38, fontWeight:900, color:"white", letterSpacing:"-0.04em", lineHeight:1.1 }}>
                Complete Real Challenges.<br />
                <span style={{ background:"linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Earn Clout. Get Hired.</span>
              </h1>
              <p className="sf-hero-sub" style={{ margin:"0 0 20px", color:"#bfdbfe", fontSize:15, lineHeight:1.75, maxWidth:500 }}>
                Submit a <strong style={{ color:"white" }}>SkillCapsule</strong> to prove your ability, earn Clout, and get spotted by recruiters on <strong style={{ color:"white" }}>The Showfloor</strong>.
              </p>

              <div className="sf-stat-grid" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[
                  { icon:"🏆", val: loading ? "—" : systemForges.length + companyForges.length, label:"Active Forges" },
                  { icon:"🏢", val: loading ? "—" : companyForges.length, label:"Company Forges" },
                  { icon:"📚", val: loading ? "—" : systemForges.length, label:"OfSkillJob Forges" },
                ].map((s, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", borderRadius:14, padding:"10px 14px", flex:"1 1 auto", minWidth:120 }}>
                    <span style={{ fontSize:18 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize:20, fontWeight:900, color:"white", lineHeight:1 }}>{s.val}</div>
                      <div style={{ fontSize:11, color:"#93c5fd", fontWeight:700 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sf-how-card" style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:22, padding:"20px 18px", minWidth:230, flexShrink:0 }}>
              <p style={{ margin:"0 0 12px", fontSize:12, fontWeight:800, color:"#93c5fd", textTransform:"uppercase", letterSpacing:"0.08em" }}>How it works</p>
              {[
                { icon:"🔍", text:"Browse & pick a Forge" },
                { icon:"💻", text:"Build & submit a SkillCapsule" },
                { icon:"🏆", text:"Earn Clout points" },
                { icon:"👀", text:"Get spotted on The Showfloor" },
              ].map((s, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom: i < 3 ? 10 : 0 }}>
                  <div style={{ width:30, height:30, borderRadius:9, background:"rgba(255,255,255,.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{s.icon}</div>
                  <span style={{ fontSize:13, color:"#e2e8f0", fontWeight:600, lineHeight:1.4 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ TABS ══════════ */}
        <div className="sf-tabs-row" style={{ display:"flex", gap:6, marginBottom:18, background:"#f8fafc", borderRadius:16, padding:5, border:"1px solid #f1f5f9", width:"fit-content", maxWidth:"100%" }}>
          {[
            { key:"ofskilljob", icon:"📚", label:"OfSkillJob Forges", count: filteredSystem.length },
            { key:"company",    icon:"🏢", label:"Company Forges",    count: filteredCompany.length },
          ].map(tab => (
            <button
              key={tab.key}
              className="sf-btn"
              onClick={() => setActiveTab(tab.key as "ofskilljob" | "company")}
              style={{ display:"flex", alignItems:"center", gap:7, background: activeTab === tab.key ? "white" : "transparent", border:"none", padding:"10px 18px", borderRadius:12, fontWeight:800, fontSize:14, color: activeTab === tab.key ? "#0f172a" : "#64748b", boxShadow: activeTab === tab.key ? "0 4px 12px rgba(2,6,23,.08)" : "none", whiteSpace:"nowrap", flexShrink:0 }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span style={{ background: activeTab === tab.key ? "#eef2ff" : "#f1f5f9", color: activeTab === tab.key ? "#2563eb" : "#94a3b8", padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:800 }}>
                {loading ? "—" : tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ══════════ FILTERS ══════════ */}
        <div style={{ marginBottom:20 }}>
          <div className="sf-filter-row" style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
            <div className="sf-search-wrap" style={{ position:"relative", flex:1, minWidth:220 }}>
              <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#94a3b8", pointerEvents:"none" }}>🔍</span>
              <input
                type="text"
                placeholder="Search forges…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="sf-input"
                style={{ width:"100%", padding:"11px 14px 11px 38px", borderRadius:13, border:"1.5px solid #e2e8f0", fontSize:14, color:"#0f172a", background:"white", boxSizing:"border-box" }}
              />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="sf-input"
              style={{ padding:"11px 14px", borderRadius:13, border:"1.5px solid #e2e8f0", fontSize:14, background:"white", color:"#0f172a", cursor:"pointer", minWidth:150 }}>
              <option value="">All Categories</option>
              {allCategories.map(cat => <option key={cat} value={cat}>{getCatMeta(cat).icon} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
            </select>
            <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)} className="sf-input"
              style={{ padding:"11px 14px", borderRadius:13, border:"1.5px solid #e2e8f0", fontSize:14, background:"white", color:"#0f172a", cursor:"pointer", minWidth:140 }}>
              <option value="">All Levels</option>
              {allDifficulties.map(d => <option key={d} value={d}>{getDiffStyle(d).label}</option>)}
            </select>
            {hasFilters && (
              <button className="sf-btn"
                onClick={() => { setSearchTerm(""); setCategoryFilter(""); setDifficultyFilter(""); }}
                style={{ padding:"11px 16px", borderRadius:13, background:"#fee2e2", border:"1px solid #fecaca", color:"#991b1b", fontSize:13, fontWeight:700, flexShrink:0 }}>
                ✕ Clear
              </button>
            )}
          </div>

          <div className="sf-cat-bar" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button className="sf-btn"
              onClick={() => setCategoryFilter("")}
              style={{ padding:"6px 14px", borderRadius:999, border:`1.5px solid ${!categoryFilter ? "#2563eb" : "#e2e8f0"}`, background: !categoryFilter ? "#eef2ff" : "white", color: !categoryFilter ? "#2563eb" : "#64748b", fontSize:13, fontWeight:700, whiteSpace:"nowrap" }}>
              All
            </button>
            {allCategories.map(cat => {
              const meta = getCatMeta(cat);
              const active = categoryFilter === cat;
              return (
                <button key={cat} className="sf-btn"
                  onClick={() => setCategoryFilter(active ? "" : cat)}
                  style={{ padding:"6px 14px", borderRadius:999, border:`1.5px solid ${active ? meta.color : "#e2e8f0"}`, background: active ? meta.bg : "white", color: active ? meta.color : "#64748b", fontSize:13, fontWeight:700, whiteSpace:"nowrap" }}>
                  {meta.icon} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p style={{ margin:"0 0 16px", color:"#64748b", fontSize:14, fontWeight:600 }}>
            Showing <strong style={{ color:"#0f172a" }}>{currentList.length}</strong> {activeTab === "ofskilljob" ? "OfSkillJob" : "Company"} forge{currentList.length !== 1 ? "s" : ""}
            {hasFilters && <span style={{ color:"#2563eb" }}> · filtered</span>}
          </p>
        )}

        {/* ══════════ LOADING ══════════ */}
        {loading && (
          <div style={{ background:"white", borderRadius:22, padding:"52px 24px", textAlign:"center", border:"1px solid #f1f5f9" }}>
            <div style={{ width:38, height:38, borderRadius:"50%", border:"4px solid #dbe3ee", borderTopColor:"#2563eb", margin:"0 auto 14px", animation:"spin 0.8s linear infinite" }} />
            <p style={{ margin:0, color:"#64748b", fontWeight:700 }}>Loading Skill Forges…</p>
          </div>
        )}

        {/* ══════════ FORGE GRID ══════════ */}
        {!loading && activeTab === "ofskilljob" && (
          filteredSystem.length === 0
            ? <EmptyState hasFilters={hasFilters} onClear={() => { setSearchTerm(""); setCategoryFilter(""); setDifficultyFilter(""); }} />
            : <div className="sf-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
                {filteredSystem.map((f, idx) => (
                  <ForgeCard key={f.id} title={f.title} description={f.description} category={f.category} difficulty={f.difficulty} clout={f.points_reward} href={`/challenges/${f.id}`} badge={{ icon:"📚", label:"OfSkillJob", color:"#4338ca", bg:"#eef2ff" }} idx={idx} />
                ))}
              </div>
        )}

        {!loading && activeTab === "company" && (
          filteredCompany.length === 0
            ? <EmptyState hasFilters={hasFilters} onClear={() => { setSearchTerm(""); setCategoryFilter(""); setDifficultyFilter(""); }} />
            : <div className="sf-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
                {filteredCompany.map((f, idx) => (
                  <ForgeCard key={f.id} title={f.title} description={f.description} category={f.category} difficulty={f.difficulty} clout={f.reward_clout} href={`/skill-forges/${f.id}`} estimatedTime={f.estimated_time} companyName={f.company_name} badge={{ icon:"🏢", label:f.company_name || "Company", color:"#059669", bg:"#f0fdf4" }} idx={idx} />
                ))}
              </div>
        )}

        {/* ══════════ BOTTOM STRIP ══════════ */}
        {!loading && (
          <div className="sf-bottom-strip" style={{ marginTop:40, background:"linear-gradient(135deg,#f0f9ff,#eef2ff)", borderRadius:22, padding:"24px 26px", border:"1px solid #bfdbfe", display:"flex", gap:20, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ flex:1, minWidth:220 }}>
              <h3 style={{ margin:"0 0 6px", fontSize:17, fontWeight:900, color:"#0f172a" }}>Your submission becomes a SkillCapsule</h3>
              <p style={{ margin:0, color:"#475569", fontSize:14, lineHeight:1.7 }}>
                Published on <strong>The Showfloor</strong> · earns Clout · recruiters can Spotlight & Call you.
              </p>
            </div>
            <Link href="/the-stage" style={{ textDecoration:"none", flexShrink:0 }}>
              <button className="sf-btn" style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"12px 22px", borderRadius:14, fontWeight:800, fontSize:14, boxShadow:"0 8px 20px rgba(37,99,235,.3)" }}>
                View The Showfloor →
              </button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

// ── ForgeCard – IDENTICAL design for both tabs, clout never wraps ──
function ForgeCard({ title, description, category, difficulty, clout, href, estimatedTime, companyName, badge, idx }: {
  title: string; description: string; category: string; difficulty: string; clout: number; href: string;
  estimatedTime?: string | null; companyName?: string | null;
  badge: { icon: string; label: string; color: string; bg: string }; idx: number;
}) {
  const cat = getCatMeta(category);
  const diff = getDiffStyle(difficulty);

  const truncatedCompanyName = companyName && companyName.length > 20
    ? companyName.slice(0, 20) + "…"
    : companyName;

  const status = { label: "Open", color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" };

  return (
    <div className="sf-card sf-anim" style={{
      background:"white",
      borderRadius:20,
      overflow:"hidden",
      boxShadow:"0 6px 22px rgba(2,6,23,.06)",
      border:"1px solid #f1f5f9",
      display:"flex",
      flexDirection:"column",
      animationDelay:`${Math.min(idx * 40, 280)}ms`
    }}>
      {/* Banner */}
      <div style={{
        height:64,
        background:`linear-gradient(135deg,${cat.bg},#f8fafc)`,
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        padding:"0 18px",
        borderBottom:`1px solid ${cat.border || "#f1f5f9"}`
      }}>
        <div style={{
          width:42,
          height:42,
          borderRadius:12,
          background:"white",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          fontSize:20,
          boxShadow:`0 2px 8px ${cat.color}22`,
          border:`1px solid ${cat.border || "#f1f5f9"}`
        }}>
          {cat.icon}
        </div>
        <span style={{
          background:status.bg,
          color:status.color,
          border:`1px solid ${status.border}`,
          padding:"4px 11px",
          borderRadius:999,
          fontSize:11,
          fontWeight:800
        }}>
          {status.label}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding:"16px 18px 18px", flex:1, display:"flex", flexDirection:"column" }}>
        {/* Badges row – uses class .sf-badges for nowrap on desktop, wrap on mobile */}
        <div className="sf-badges">
          <span style={{
            background:badge.bg,
            color:badge.color,
            border:`1px solid ${badge.color}33`,
            padding:"3px 9px",
            borderRadius:999,
            fontSize:11,
            fontWeight:800,
            flexShrink:0,
            maxWidth:140,
            overflow:"hidden",
            textOverflow:"ellipsis",
            whiteSpace:"nowrap"
          }}>
            {badge.icon} {badge.label}
          </span>
          <span style={{
            background:diff.bg,
            color:diff.color,
            border:`1px solid ${diff.border}`,
            padding:"3px 9px",
            borderRadius:999,
            fontSize:11,
            fontWeight:800,
            flexShrink:0,
            whiteSpace:"nowrap"
          }}>
            {diff.label}
          </span>
          {/* Clout badge – always on the same line, never wraps */}
          <span style={{
            background:"#fef3c7",
            border:"1px solid #fde68a",
            color:"#92400e",
            padding:"3px 9px",
            borderRadius:999,
            fontSize:11,
            fontWeight:800,
            marginLeft:"auto",
            flexShrink:0,
            display:"flex",
            alignItems:"center",
            gap:4,
            whiteSpace:"nowrap"
          }}>
            🏆 {clout} <span style={{ fontWeight:700, fontSize:10 }}>Clout</span>
          </span>
        </div>

        <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:900, color:"#0f172a", letterSpacing:"-0.02em", lineHeight:1.3 }}>{title}</h3>
        <p style={{ margin:"0 0 14px", fontSize:13, color:"#64748b", lineHeight:1.65, flex:1 }}>
          {(description || "").slice(0, 100)}{(description || "").length > 100 ? "…" : ""}
        </p>

        {/* Meta row */}
        {(estimatedTime || truncatedCompanyName) && (
          <div className="sf-meta-row" style={{ display:"flex", gap:12, fontSize:12, color:"#94a3b8", marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
            {estimatedTime && <span>⏱️ {estimatedTime}</span>}
            {truncatedCompanyName && (
              <span style={{
                display:"flex",
                alignItems:"center",
                gap:4,
                maxWidth:180,
                overflow:"hidden",
                textOverflow:"ellipsis",
                whiteSpace:"nowrap"
              }}>
                🏢 {truncatedCompanyName}
              </span>
            )}
          </div>
        )}

        <div style={{ height:1, background:"#f1f5f9", marginBottom:14 }} />

        <Link href={href} style={{ textDecoration:"none", display:"block", width:"100%" }}>
          <button className="sf-btn" style={{
            width:"100%",
            background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
            color:"white",
            border:"none",
            padding:"12px",
            borderRadius:13,
            fontWeight:900,
            fontSize:14,
            boxShadow:"0 6px 16px rgba(37,99,235,.25)",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            gap:6
          }}>
            Submit a SkillCapsule <span>→</span>
          </button>
        </Link>

        <p style={{ margin:"8px 0 0", fontSize:11, color:"#94a3b8", fontWeight:600, textAlign:"center" }}>
          Earns {clout} Clout · Published on Showfloor
        </p>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div style={{ background:"white", borderRadius:22, padding:"52px 24px", textAlign:"center", border:"1px dashed #dbe3ee" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>⚒️</div>
      <h3 style={{ margin:"0 0 8px", fontSize:19, fontWeight:900, color:"#0f172a" }}>
        {hasFilters ? "No forges match your filters" : "No forges available yet"}
      </h3>
      <p style={{ margin:"0 0 18px", color:"#64748b", fontSize:14, lineHeight:1.7 }}>
        {hasFilters ? "Try clearing your filters or changing the search term." : "Check back soon — new challenges are added regularly."}
      </p>
      {hasFilters && (
        <button onClick={onClear} style={{ background:"#0f172a", color:"white", border:"none", padding:"11px 22px", borderRadius:13, fontWeight:800, cursor:"pointer", fontSize:14 }}>Clear filters</button>
      )}
    </div>
  );
}