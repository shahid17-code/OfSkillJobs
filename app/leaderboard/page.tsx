"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { getTierFromPoints, getTierColor } from "@/lib/tiers";

type RankedUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  score: number;
  display_label: string;
  is_boosted: boolean;
  tier?: string;
  tierColor?: string;
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  min_points: number;
};

type TabType = "points" | "problem_solvers" | "recruiter_interest" | "rising_talent" | "designers" | "communicators" | "consistent";

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: "points",            label: "Overall Clout",     icon: "🏆" },
  { key: "problem_solvers",   label: "Problem Solvers",   icon: "🧩" },
  { key: "recruiter_interest",label: "Recruiter Interest",icon: "👀" },
  { key: "rising_talent",     label: "Rising Talent",     icon: "📈" },
  { key: "designers",         label: "Designers",         icon: "🎨" },
  { key: "communicators",     label: "Communicators",     icon: "💬" },
  { key: "consistent",        label: "Most Consistent",   icon: "🔥" },
];

const TIER_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Diamond: { label: "Diamond", color: "#534AB7", bg: "#EEEDFE", border: "#AFA9EC" },
  Gold:    { label: "Gold",    color: "#185FA5", bg: "#E6F1FB", border: "#85B7EB" },
  Silver:  { label: "Silver",  color: "#0F6E56", bg: "#E1F5EE", border: "#5DCAA5" },
  Bronze:  { label: "Bronze",  color: "#854F0B", bg: "#FAEEDA", border: "#EF9F27" },
  Starter: { label: "Starter", color: "#5F5E5A", bg: "#F1EFE8", border: "#B4B2A9" },
};

const AVATAR_BG = [
  { bg: "#EEEDFE", color: "#534AB7" },
  { bg: "#E6F1FB", color: "#185FA5" },
  { bg: "#E1F5EE", color: "#0F6E56" },
  { bg: "#FAEEDA", color: "#854F0B" },
  { bg: "#fdf4ff", color: "#7c3aed" },
  { bg: "#ecfeff", color: "#0891b2" },
];

function getAvatarStyle(idx: number) {
  return AVATAR_BG[idx % AVATAR_BG.length];
}

function initials(name: string | null, username: string | null): string {
  if (name) return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  if (username) return username.slice(0, 2).toUpperCase();
  return "??";
}

export default function RosterPage() {
  const [users,        setUsers]        = useState<RankedUser[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<TabType>("points");
  const [myRank,       setMyRank]       = useState<number | null>(null);
  const [myScore,      setMyScore]      = useState<number | null>(null);
  const [myTier,       setMyTier]       = useState<string>("");
  const [currentUser,  setCurrentUser]  = useState<any>(null);
  const [badges,       setBadges]       = useState<Badge[]>([]);
  const [userBadgeIds, setUserBadgeIds] = useState<Set<string>>(new Set());
  const [activeBoost,  setActiveBoost]  = useState<any>(null);
  const [purchasing,   setPurchasing]   = useState(false);
  const [boostsMap,    setBoostsMap]    = useState<Map<string, boolean>>(new Map());
  const [totalDevs,    setTotalDevs]    = useState(0);
  const [totalSignals, setTotalSignals] = useState(0);
  const [totalCapsules,setTotalCapsules]= useState(0);
  const [totalSpots,   setTotalSpots]   = useState(0);
  const [toast,        setToast]        = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    loadBoosts();
    loadBadges();
    loadHeroStats();
  }, []);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, boostsMap]);

  async function loadHeroStats() {
    const { count: devCount }  = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "developer");
    const { count: sigCount }  = await supabase.from("skill_signals").select("*", { count: "exact", head: true });
    const { count: capCount }  = await supabase.from("skill_capsules").select("*", { count: "exact", head: true });
    const { count: spotCount } = await supabase.from("recruiter_spotlights").select("*", { count: "exact", head: true }).eq("spotlight_type", "spot");
    setTotalDevs(devCount || 0);
    setTotalSignals(sigCount || 0);
    setTotalCapsules(capCount || 0);
    setTotalSpots(spotCount || 0);
  }

  async function loadBoosts() {
    const { data } = await supabase
      .from("premium_purchases")
      .select("user_id, expires_at")
      .eq("feature_type", "profile_boost")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());
    const map = new Map<string, boolean>();
    data?.forEach((p: any) => map.set(p.user_id, true));
    setBoostsMap(map);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: myBoost } = await supabase
        .from("premium_purchases")
        .select("*")
        .eq("user_id", user.id)
        .eq("feature_type", "profile_boost")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      setActiveBoost(myBoost);
    }
  }

  async function loadBadges() {
    const { data: badgesData } = await supabase.from("badges").select("*").order("min_points", { ascending: true });
    if (badgesData) setBadges(badgesData);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userBadges } = await supabase.from("user_badges").select("badge_id").eq("user_id", user.id);
      if (userBadges) setUserBadgeIds(new Set(userBadges.map((ub: any) => ub.badge_id)));
    }
  }

  async function fetchData(tab: TabType) {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    let ranked: RankedUser[] = [];
    if (tab === "points")             ranked = await fetchPointsRanking();
    else if (tab === "problem_solvers")   ranked = await fetchProblemSolvers();
    else if (tab === "recruiter_interest") ranked = await fetchRecruiterInterest();
    else if (tab === "rising_talent")     ranked = await fetchRisingTalent();
    else if (tab === "designers")         ranked = await fetchTopDesigners();
    else if (tab === "communicators")     ranked = await fetchTopCommunicators();
    else if (tab === "consistent")        ranked = await fetchMostConsistent();

    ranked = ranked.map(u => {
      const tier = tab === "points" ? getTierFromPoints(u.score) : "";
      const tierColor = tier ? getTierColor(tier) : "";
      return { ...u, is_boosted: boostsMap.get(u.id) || false, tier, tierColor };
    });

    // Boosted users bubble up within their existing position range
    ranked = [
      ...ranked.filter(u => u.is_boosted),
      ...ranked.filter(u => !u.is_boosted),
    ];

    setUsers(ranked);

    if (user) {
      const idx = ranked.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        setMyRank(idx + 1);
        setMyScore(ranked[idx].score);
        setMyTier(tab === "points" ? getTierFromPoints(ranked[idx].score) : "");
      } else {
        setMyRank(null); setMyScore(null); setMyTier("");
      }
    }
    setLoading(false);
  }

  async function fetchPointsRanking(): Promise<RankedUser[]> {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, username, avatar_url, total_points")
      .eq("role", "developer")
      .order("total_points", { ascending: false });
    return data?.map((u: any) => ({
      id: u.id, full_name: u.full_name, username: u.username, avatar_url: u.avatar_url,
      score: u.total_points || 0,
      display_label: `${(u.total_points || 0).toLocaleString()} Clout`,
      is_boosted: false,
    })) || [];
  }

  async function fetchProblemSolvers(): Promise<RankedUser[]> {
    const { data: submissions } = await supabase.from("submissions").select("user_id");
    const counts = new Map<string, number>();
    submissions?.forEach((s: any) => counts.set(s.user_id, (counts.get(s.user_id) || 0) + 1));
    const userIds = Array.from(counts.keys());
    if (!userIds.length) return [];
    const { data: users } = await supabase.from("users").select("id, full_name, username, avatar_url").in("id", userIds);
    return users?.map((u: any) => ({
      id: u.id, full_name: u.full_name, username: u.username, avatar_url: u.avatar_url,
      score: counts.get(u.id) || 0,
      display_label: `${counts.get(u.id) || 0} submissions`,
      is_boosted: false,
    })).sort((a: any, b: any) => b.score - a.score) || [];
  }

  async function fetchRecruiterInterest(): Promise<RankedUser[]> {
    const { data: spotlights } = await supabase.from("recruiter_spotlights").select("candidate_id").eq("spotlight_type", "spot");
    const counts = new Map<string, number>();
    spotlights?.forEach((s: any) => counts.set(s.candidate_id, (counts.get(s.candidate_id) || 0) + 1));
    const userIds = Array.from(counts.keys());
    if (!userIds.length) return [];
    const { data: users } = await supabase.from("users").select("id, full_name, username, avatar_url").in("id", userIds);
    return users?.map((u: any) => ({
      id: u.id, full_name: u.full_name, username: u.username, avatar_url: u.avatar_url,
      score: counts.get(u.id) || 0,
      display_label: `${counts.get(u.id) || 0} Spotlights`,
      is_boosted: false,
    })).sort((a: any, b: any) => b.score - a.score) || [];
  }

  async function fetchRisingTalent(): Promise<RankedUser[]> {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data } = await supabase
      .from("users")
      .select("id, full_name, username, avatar_url, total_points")
      .eq("role", "developer")
      .gte("last_login", thirtyDaysAgo.toISOString())
      .order("total_points", { ascending: false });
    return data?.map((u: any) => ({
      id: u.id, full_name: u.full_name, username: u.username, avatar_url: u.avatar_url,
      score: u.total_points || 0,
      display_label: `${(u.total_points || 0).toLocaleString()} Clout (30d)`,
      is_boosted: false,
    })) || [];
  }

  async function fetchTopDesigners(): Promise<RankedUser[]> {
    const { data: capsules } = await supabase.from("skill_capsules").select("user_id, skill_impact_score").eq("category", "design");
    const scores = new Map<string, number>();
    capsules?.forEach((c: any) => scores.set(c.user_id, (scores.get(c.user_id) || 0) + (c.skill_impact_score || 0)));
    const userIds = Array.from(scores.keys());
    if (!userIds.length) return [];
    const { data: users } = await supabase.from("users").select("id, full_name, username, avatar_url").in("id", userIds);
    return users?.map((u: any) => ({
      id: u.id, full_name: u.full_name, username: u.username, avatar_url: u.avatar_url,
      score: scores.get(u.id) || 0,
      display_label: `CraftRank ${scores.get(u.id) || 0}`,
      is_boosted: false,
    })).sort((a: any, b: any) => b.score - a.score) || [];
  }

  async function fetchTopCommunicators(): Promise<RankedUser[]> {
    const { data: signals } = await supabase.from("skill_signals").select("user_id").eq("signal_type", "strong_comm");
    const counts = new Map<string, number>();
    signals?.forEach((s: any) => counts.set(s.user_id, (counts.get(s.user_id) || 0) + 1));
    const userIds = Array.from(counts.keys());
    if (!userIds.length) return [];
    const { data: users } = await supabase.from("users").select("id, full_name, username, avatar_url").in("id", userIds);
    return users?.map((u: any) => ({
      id: u.id, full_name: u.full_name, username: u.username, avatar_url: u.avatar_url,
      score: counts.get(u.id) || 0,
      display_label: `${counts.get(u.id) || 0} Clear Comm signals`,
      is_boosted: false,
    })).sort((a: any, b: any) => b.score - a.score) || [];
  }

  async function fetchMostConsistent(): Promise<RankedUser[]> {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, username, avatar_url, login_streak")
      .eq("role", "developer")
      .order("login_streak", { ascending: false });
    return data?.map((u: any) => ({
      id: u.id, full_name: u.full_name, username: u.username, avatar_url: u.avatar_url,
      score: u.login_streak || 0,
      display_label: `${u.login_streak || 0}-day streak`,
      is_boosted: false,
    })) || [];
  }

  async function purchaseBoost() {
    if (!currentUser) { showToast("Please log in to purchase a Roster Boost."); return; }
    const { data: userRow } = await supabase.from("users").select("total_points").eq("id", currentUser.id).single();
    if (!userRow || userRow.total_points < 500) { showToast("You need at least 500 Clout to purchase a Roster Boost."); return; }
    setPurchasing(true);
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
    const { error } = await supabase.from("premium_purchases").insert({
      user_id: currentUser.id, feature_type: "profile_boost",
      points_spent: 500, expires_at: expiresAt.toISOString(), status: "active",
    });
    if (error) { showToast("Failed to purchase. Please try again."); }
    else {
      await supabase.from("users").update({ total_points: userRow.total_points - 500 }).eq("id", currentUser.id);
      showToast("🚀 Roster Boost activated! Your profile is highlighted for 30 days.");
      await loadBoosts();
      fetchData(activeTab);
    }
    setPurchasing(false);
  }

  const top3   = users.slice(0, 3);
  const others = users.slice(3);
  const topPercent = myRank && users.length ? Math.ceil((myRank / users.length) * 100) : null;
  const myUser = users.find(u => u.id === currentUser?.id);
  const myAvatarStyle = getAvatarStyle(0);
  const tierInfo = myTier ? TIER_META[myTier] : null;

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer { 0%{background-position:-400% 0} 100%{background-position:400% 0} }
        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }

        .ros-btn { transition:transform .15s,opacity .15s; cursor:pointer; }
        .ros-btn:hover  { transform:translateY(-1px); }
        .ros-btn:active { transform:scale(.97); opacity:.9; }
        .ros-card { transition:transform .2s ease,box-shadow .2s ease; }
        .ros-card:hover { transform:translateY(-3px); box-shadow:0 16px 40px rgba(2,6,23,.1) !important; }
        .ros-row:hover  { background:#f8fafc !important; }
        .ros-tab { transition:all .15s; cursor:pointer; white-space:nowrap; flex-shrink:0; }
        .ros-anim { animation:fadeUp .4s ease both; }

        .ros-shimmer {
          background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
          background-size:400% 100%;
          animation:shimmer 1.4s infinite;
          border-radius:8px;
        }

        @media (max-width:768px) {
          .ros-hero-inner  { flex-direction:column !important; }
          .ros-hero-title  { font-size:24px !important; }
          .ros-stat-grid   { grid-template-columns:1fr 1fr !important; }
          .ros-tabs-wrap   { padding-bottom:4px; }
          .ros-tabs-wrap::-webkit-scrollbar { display:none; }
          .ros-podium      { grid-template-columns:1fr !important; gap:10px !important; }
          .ros-boost-inner { flex-direction:column !important; align-items:flex-start !important; }
          .ros-boost-btn   { width:100% !important; justify-content:center !important; }
          .ros-badges-grid { grid-template-columns:1fr !important; }
          .ros-rank-inner  { flex-wrap:wrap !important; }
          .ros-row-meta    { display:none !important; }
        }
        @media (max-width:480px) {
          .ros-stat-grid { grid-template-columns:1fr 1fr !important; }
        }
      `}</style>

      {toast && (
        <div style={{ position:"fixed", top:18, right:18, zIndex:9999, background:"#0f172a", color:"white", padding:"12px 18px", borderRadius:14, fontWeight:700, fontSize:14, boxShadow:"0 10px 30px rgba(0,0,0,.2)", maxWidth:"calc(100vw - 36px)", animation:"fadeUp .3s ease" }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 16px 60px", fontFamily:"Inter,system-ui,-apple-system,'Segoe UI',sans-serif" }}>

        {/* ══ HERO ══ */}
        <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 55%,#1e40af 100%)", borderRadius:28, padding:"32px 28px", marginBottom:22, position:"relative", overflow:"hidden" }} className="ros-anim">
          <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220, borderRadius:"50%", background:"rgba(124,58,237,.18)", filter:"blur(44px)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-50, left:-40, width:180, height:180, borderRadius:"50%", background:"rgba(37,99,235,.2)", filter:"blur(36px)", pointerEvents:"none" }} />
          <div className="ros-hero-inner" style={{ position:"relative", zIndex:1, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:24, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:240 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", color:"#93c5fd", padding:"5px 14px", borderRadius:999, fontSize:11, fontWeight:800, marginBottom:14, letterSpacing:"0.06em" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", animation:"pulse 2s infinite", display:"inline-block" }} />
                THE ROSTER · LIVE RANKINGS
              </div>
              <h1 className="ros-hero-title" style={{ margin:"0 0 10px", fontSize:32, fontWeight:900, color:"white", letterSpacing:"-0.04em", lineHeight:1.15 }}>
                The Roster
              </h1>
              <p style={{ margin:"0 0 22px", color:"#bfdbfe", fontSize:15, lineHeight:1.7, maxWidth:460 }}>
                Top-ranked candidates across Clout, recruiter interest, and consistency. Find your next hire — or climb the board.
              </p>
              <div className="ros-stat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {[
                  { icon:"👤", val: totalDevs.toLocaleString(),    label:"Active devs"   },
                  { icon:"⚡", val: totalSignals.toLocaleString(),  label:"SkillSignals"  },
                  { icon:"📎", val: totalCapsules.toLocaleString(), label:"Capsules live" },
                  { icon:"🔦", val: totalSpots.toLocaleString(),    label:"Spotlights"    },
                ].map((s, i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", borderRadius:14, padding:"10px 12px" }}>
                    <div style={{ fontSize:16, marginBottom:4 }}>{s.icon}</div>
                    <div style={{ fontSize:18, fontWeight:900, color:"white", lineHeight:1 }}>{s.val}</div>
                    <div style={{ fontSize:11, color:"#93c5fd", fontWeight:700, marginTop:3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* How it works card */}
            <div style={{ background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:20, padding:"18px 18px", minWidth:210, flexShrink:0 }}>
              <p style={{ margin:"0 0 12px", fontSize:11, fontWeight:800, color:"#93c5fd", textTransform:"uppercase", letterSpacing:"0.08em" }}>How Clout is earned</p>
              {[
                { icon:"📎", text:"Launch a SkillCapsule" },
                { icon:"⚒️", text:"Complete a Skill Forge" },
                { icon:"⚡", text:"Receive SkillSignals" },
                { icon:"🔦", text:"Get Spotlighted by recruiters" },
              ].map((s, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom: i < 3 ? 9 : 0 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:"rgba(255,255,255,.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{s.icon}</div>
                  <span style={{ fontSize:13, color:"#e2e8f0", fontWeight:600, lineHeight:1.4 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div className="ros-tabs-wrap" style={{ overflowX:"auto", scrollbarWidth:"none", marginBottom:20 }}>
          <div style={{ display:"flex", gap:6, width:"max-content", paddingBottom:2 }}>
            {TABS.map(tab => (
              <button key={tab.key} className="ros-tab ros-btn"
                onClick={() => setActiveTab(tab.key)}
                style={{ display:"flex", alignItems:"center", gap:7, background: activeTab === tab.key ? "#0f172a" : "white", border: activeTab === tab.key ? "1px solid #0f172a" : "1px solid #e2e8f0", padding:"9px 18px", borderRadius:999, fontWeight:800, fontSize:13, color: activeTab === tab.key ? "white" : "#64748b" }}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ MY RANK CARD ══ */}
        {myRank && myUser && (
          <div className="ros-anim" style={{ background:"white", borderRadius:18, padding:"16px 20px", marginBottom:18, border:"1px solid #f1f5f9", boxShadow:"0 4px 16px rgba(2,6,23,.05)", borderLeft:`4px solid ${tierInfo?.color || "#2563eb"}` }}>
            <div className="ros-rank-inner" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background: myAvatarStyle.bg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color: myAvatarStyle.color, flexShrink:0 }}>
                  {initials(currentUser?.user_metadata?.full_name, currentUser?.user_metadata?.username)}
                </div>
                <div>
                  <div style={{ fontWeight:900, fontSize:15, color:"#0f172a", marginBottom:3 }}>Your position on The Roster</div>
                  <div style={{ fontSize:13, color:"#64748b" }}>
                    Rank <strong style={{ color:"#0f172a" }}>#{myRank}</strong> · Top <strong style={{ color:"#0f172a" }}>{topPercent}%</strong> of developers
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                {activeTab === "points" && tierInfo && (
                  <span style={{ background: tierInfo.bg, color: tierInfo.color, border:`1px solid ${tierInfo.border}`, padding:"5px 14px", borderRadius:999, fontSize:12, fontWeight:800 }}>
                    {tierInfo.label}
                  </span>
                )}
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:20, fontWeight:900, color:"#0f172a", lineHeight:1 }}>
                    {activeTab === "points" ? `${myScore?.toLocaleString()} Clout` : myUser.display_label}
                  </div>
                  {activeBoost && (
                    <div style={{ fontSize:11, color:"#f59e0b", fontWeight:700, marginTop:3 }}>⭐ Boost active</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TIER LEGEND (points tab only) ══ */}
        {activeTab === "points" && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
            {Object.values(TIER_META).map(t => (
              <span key={t.label} style={{ background: t.bg, color: t.color, border:`1px solid ${t.border}`, padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:800 }}>
                {t.label}
              </span>
            ))}
          </div>
        )}

        {/* ══ LOADING ══ */}
        {loading && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14, marginBottom:16 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ background:"white", borderRadius:20, padding:24, border:"1px solid #f1f5f9", height:200 }}>
                  <div className="ros-shimmer" style={{ width:52, height:52, borderRadius:"50%", marginBottom:12 }} />
                  <div className="ros-shimmer" style={{ height:14, width:"70%", marginBottom:8 }} />
                  <div className="ros-shimmer" style={{ height:10, width:"50%", marginBottom:8 }} />
                  <div className="ros-shimmer" style={{ height:10, width:"40%" }} />
                </div>
              ))}
            </div>
            <div style={{ background:"white", borderRadius:20, padding:20, border:"1px solid #f1f5f9" }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #f8fafc" }}>
                  <div className="ros-shimmer" style={{ width:32, height:14, borderRadius:6 }} />
                  <div className="ros-shimmer" style={{ width:32, height:32, borderRadius:"50%", flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div className="ros-shimmer" style={{ height:12, width:"60%", marginBottom:6 }} />
                    <div className="ros-shimmer" style={{ height:10, width:"40%" }} />
                  </div>
                  <div className="ros-shimmer" style={{ width:80, height:14, borderRadius:6 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PODIUM TOP 3 ══ */}
        {!loading && top3.length > 0 && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:"#0f172a" }}>
                {TABS.find(t => t.key === activeTab)?.icon} {TABS.find(t => t.key === activeTab)?.label}
              </h2>
              <span style={{ fontSize:13, color:"#64748b", fontWeight:600 }}>{users.length} ranked</span>
            </div>
            <div className="ros-podium" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:16 }}>
              {top3.map((user, idx) => {
                const avStyle = getAvatarStyle(idx);
                const tierMeta = user.tier ? TIER_META[user.tier] : null;
                const medals = ["🥇","🥈","🥉"];
                const isFirst = idx === 0;
                return (
                  <Link key={user.id} href={`/u/${user.username}`} style={{ textDecoration:"none" }}>
                    <div className="ros-card" style={{ background:"white", borderRadius:22, padding:"22px 18px", border:`1px solid ${isFirst ? "#fde68a" : "#f1f5f9"}`, boxShadow: isFirst ? "0 8px 28px rgba(245,158,11,.12)" : "0 6px 20px rgba(2,6,23,.05)", textAlign:"center", position:"relative", cursor:"pointer", borderTop: isFirst ? "3px solid #f59e0b" : "1px solid #f1f5f9" }}>
                      {user.is_boosted && (
                        <div style={{ position:"absolute", top:10, right:10, background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a", padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:800 }}>⭐ Boosted</div>
                      )}
                      <div style={{ fontSize:24, marginBottom:10 }}>{medals[idx]}</div>
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" style={{ width:60, height:60, borderRadius:"50%", objectFit:"cover", margin:"0 auto 10px", display:"block", border:`2px solid ${avStyle.bg}` }} />
                        : <div style={{ width:60, height:60, borderRadius:"50%", background: avStyle.bg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:20, color: avStyle.color, margin:"0 auto 10px", border:`2px solid ${avStyle.color}22` }}>
                            {initials(user.full_name, user.username)}
                          </div>
                      }
                      <div style={{ fontWeight:900, fontSize:16, color:"#0f172a", marginBottom:3 }}>{user.full_name || "Developer"}</div>
                      <div style={{ fontSize:12, color:"#94a3b8", marginBottom:10 }}>@{user.username}</div>
                      <div style={{ fontSize:15, fontWeight:900, color:"#0f172a", marginBottom:8 }}>
                        {activeTab === "points" ? `${user.score.toLocaleString()} Clout` : user.display_label}
                      </div>
                      {tierMeta && activeTab === "points" && (
                        <span style={{ background: tierMeta.bg, color: tierMeta.color, border:`1px solid ${tierMeta.border}`, padding:"4px 12px", borderRadius:999, fontSize:11, fontWeight:800 }}>
                          {tierMeta.label}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ REST OF RANKINGS ══ */}
        {!loading && others.length > 0 && (
          <div style={{ background:"white", borderRadius:20, border:"1px solid #f1f5f9", boxShadow:"0 6px 22px rgba(2,6,23,.05)", overflow:"hidden", marginBottom:22 }}>
            {others.map((user, idx) => {
              const avStyle = getAvatarStyle(idx + 3);
              const tierMeta = user.tier ? TIER_META[user.tier] : null;
              const isMe = user.id === currentUser?.id;
              return (
                <Link key={user.id} href={`/u/${user.username}`} style={{ textDecoration:"none" }}>
                  <div className="ros-row" style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 18px", borderBottom:"1px solid #f8fafc", background: isMe ? "#f0f9ff" : user.is_boosted ? "#fefce8" : "white", cursor:"pointer", transition:"background .15s" }}>
                    {/* Rank */}
                    <div style={{ fontSize:13, fontWeight:800, color:"#94a3b8", minWidth:36, flexShrink:0 }}>
                      #{idx + 4}
                      {user.is_boosted && <span style={{ marginLeft:4, color:"#f59e0b" }}>⭐</span>}
                    </div>
                    {/* Avatar */}
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"2px solid #f1f5f9" }} />
                      : <div style={{ width:38, height:38, borderRadius:"50%", background: avStyle.bg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, color: avStyle.color, flexShrink:0 }}>
                          {initials(user.full_name, user.username)}
                        </div>
                    }
                    {/* Name + username */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:14, color:"#0f172a", display:"flex", alignItems:"center", gap:6 }}>
                        {user.full_name || "Developer"}
                        {isMe && <span style={{ background:"#eef2ff", color:"#2563eb", border:"1px solid #c7d2fe", padding:"1px 7px", borderRadius:999, fontSize:10, fontWeight:800 }}>You</span>}
                      </div>
                      <div className="ros-row-meta" style={{ fontSize:12, color:"#94a3b8" }}>@{user.username}</div>
                    </div>
                    {/* Score + tier */}
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:14, fontWeight:900, color:"#0f172a" }}>
                        {activeTab === "points" ? `${user.score.toLocaleString()} Clout` : user.display_label}
                      </div>
                      {tierMeta && activeTab === "points" && (
                        <span style={{ background: tierMeta.bg, color: tierMeta.color, fontSize:11, fontWeight:800, padding:"2px 8px", borderRadius:999, border:`1px solid ${tierMeta.border}` }}>
                          {tierMeta.label}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ══ EMPTY ══ */}
        {!loading && users.length === 0 && (
          <div style={{ background:"white", borderRadius:22, padding:"52px 24px", textAlign:"center", border:"1px dashed #dbe3ee" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🏆</div>
            <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:900, color:"#0f172a" }}>No one ranked yet</h3>
            <p style={{ margin:"0 0 20px", color:"#64748b", fontSize:14, lineHeight:1.7 }}>Be the first to earn Clout in this category.</p>
            <Link href="/skill-forges" style={{ textDecoration:"none" }}>
              <button className="ros-btn" style={{ background:"#0f172a", color:"white", border:"none", padding:"11px 24px", borderRadius:14, fontWeight:800, cursor:"pointer", fontSize:14 }}>
                Browse Skill Forges →
              </button>
            </Link>
          </div>
        )}

        {/* ══ ROSTER BOOST ══ */}
        <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7)", borderRadius:22, padding:"20px 22px", marginBottom:22, border:"1px solid #fde68a" }}>
          <div className="ros-boost-inner" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:900, fontSize:16, color:"#0f172a", marginBottom:4 }}>⭐ Roster Boost</div>
              <div style={{ fontSize:13, color:"#92400e", lineHeight:1.6 }}>
                Get a special badge and highlighted border on The Roster for 30 days. Stand out to recruiters and rise to the top.
              </div>
              <div style={{ fontSize:13, color:"#92400e", marginTop:6, fontWeight:700 }}>
                Cost: <strong style={{ color:"#0f172a" }}>500 Clout</strong>
                {myScore !== null && <span style={{ color:"#64748b", fontWeight:600, marginLeft:8 }}>· You have {myScore.toLocaleString()} Clout</span>}
              </div>
            </div>
            <div style={{ flexShrink:0 }}>
              {activeBoost ? (
                <div style={{ background:"#dcfce7", color:"#166534", border:"1px solid #bbf7d0", padding:"10px 18px", borderRadius:999, fontWeight:800, fontSize:13 }}>
                  ✓ Active until {new Date(activeBoost.expires_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                </div>
              ) : (
                <button className="ros-btn ros-boost-btn"
                  onClick={purchaseBoost}
                  disabled={purchasing}
                  style={{ background: purchasing ? "#94a3b8" : "linear-gradient(135deg,#f59e0b,#d97706)", color:"white", border:"none", padding:"12px 22px", borderRadius:999, fontWeight:900, fontSize:14, cursor: purchasing ? "not-allowed" : "pointer", boxShadow:"0 6px 16px rgba(245,158,11,.35)", display:"flex", alignItems:"center", gap:8 }}>
                  {purchasing ? "Processing…" : "⭐ Buy Boost (500 Clout)"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ══ TALENT INSIGNIAS ══ */}
        <div style={{ background:"white", borderRadius:22, padding:"22px 20px", border:"1px solid #f1f5f9", boxShadow:"0 6px 22px rgba(2,6,23,.05)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, flexWrap:"wrap", gap:10 }}>
            <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:"#0f172a" }}>🎖️ Talent Insignias</h2>
            <span style={{ background:"#eef2ff", color:"#2563eb", border:"1px solid #c7d2fe", padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:800 }}>
              {userBadgeIds.size} / {badges.length} earned
            </span>
          </div>
          <p style={{ margin:"0 0 18px", color:"#64748b", fontSize:13, lineHeight:1.6 }}>
            Earn insignias by reaching Clout milestones and completing platform achievements. They appear on your profile.
          </p>
          <div className="ros-badges-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10 }}>
            {badges.map((badge, i) => {
              const earned = userBadgeIds.has(badge.id);
              const avStyle = getAvatarStyle(i);
              return (
                <div key={badge.id} style={{ background: earned ? "#f0fdf4" : "#f8fafc", border:`1px solid ${earned ? "#bbf7d0" : "#e2e8f0"}`, borderRadius:16, padding:"14px 14px", display:"flex", alignItems:"center", gap:12, transition:"transform .2s" }}>
                  <div style={{ width:42, height:42, borderRadius:12, background: earned ? "#dcfce7" : avStyle.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                    {badge.icon || "🏅"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:13, color:"#0f172a", marginBottom:3 }}>{badge.name}</div>
                    <div style={{ fontSize:12, color:"#64748b", marginBottom:3, lineHeight:1.4 }}>{badge.description}</div>
                    {earned
                      ? <span style={{ fontSize:11, fontWeight:800, color:"#166534" }}>✓ Earned</span>
                      : <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600 }}>Requires {badge.min_points.toLocaleString()} Clout</span>
                    }
                  </div>
                </div>
              );
            })}
            {badges.length === 0 && (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"32px 20px", color:"#94a3b8", fontSize:13 }}>
                No insignias configured yet.
              </div>
            )}
          </div>
        </div>

        {/* ══ BOTTOM CTA ══ */}
        <div style={{ marginTop:28, background:"linear-gradient(135deg,#f0f9ff,#eef2ff)", borderRadius:22, padding:"24px 26px", border:"1px solid #bfdbfe", display:"flex", gap:20, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:900, color:"#0f172a" }}>Earn more Clout to climb The Roster</h3>
            <p style={{ margin:0, color:"#475569", fontSize:13, lineHeight:1.7 }}>Complete Skill Forges, launch SkillCapsules, and earn SkillSignals from recruiters.</p>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Link href="/skill-forges" style={{ textDecoration:"none" }}>
              <button className="ros-btn" style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", padding:"11px 20px", borderRadius:14, fontWeight:800, fontSize:13, boxShadow:"0 6px 16px rgba(37,99,235,.3)" }}>
                ⚒️ Skill Forges →
              </button>
            </Link>
            <Link href="/launch-skillcapsule" style={{ textDecoration:"none" }}>
              <button className="ros-btn" style={{ background:"white", color:"#0f172a", border:"1px solid #e2e8f0", padding:"11px 20px", borderRadius:14, fontWeight:800, fontSize:13 }}>
                ✨ Launch Capsule
              </button>
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}