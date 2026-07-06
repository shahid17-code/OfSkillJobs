"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getTierFromPoints, getTierColor } from "@/lib/tiers";
import { notifyUser, NotificationMessages } from "@/lib/notifications";

type Capsule = {
  id: string;
  title: string;
  description: string;
  category: string;
  capsule_type: string;
  link_url: string | null;
  skills_used: string[];
  difficulty: string | null;
  time_spent: string | null;
  tools_used: string[];
  skill_impact_score: number;
  signal_counts: Record<string, number>;
  recruiter_spots: number;
  view_count?: number;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    total_points?: number;
  } | null;
  user_id: string;
};

type Profile = { id: string; role: string; full_name?: string | null; company_name?: string | null };
type ToastType = "success" | "error" | "info";
type SortKey = "trending" | "latest" | "impact";

const PAGE_SIZE = 12;

// Signal weights feed the CraftRank algorithm below. Signals that correlate
// with hiring intent (hireable, smart_solution) count for more than softer
// peer recognition (creative, well_structured).
const SIGNALS = [
  { key: "skilled",        label: "Skilled",        icon: "⚡", weight: 1.0 },
  { key: "practical",      label: "Practical",       icon: "🔧", weight: 1.0 },
  { key: "creative",       label: "Creative",        icon: "🎨", weight: 0.8 },
  { key: "strong_comm",    label: "Clear Comm",      icon: "💬", weight: 1.0 },
  { key: "hireable",       label: "Hireable",        icon: "🎯", weight: 2.2 },
  { key: "smart_solution", label: "Smart Solution",  icon: "💡", weight: 1.6 },
  { key: "well_structured",label: "Well Structured", icon: "📐", weight: 0.9 },
];
const SIGNAL_WEIGHT: Record<string, number> = Object.fromEntries(SIGNALS.map(s => [s.key, s.weight]));

const CAT_META: Record<string, { icon: string; color: string; bg: string }> = {
  design:        { icon: "🎨", color: "#7c3aed", bg: "#fdf4ff" },
  development:   { icon: "💻", color: "#2563eb", bg: "#eff6ff" },
  writing:       { icon: "✍️", color: "#0891b2", bg: "#ecfeff" },
  sales:         { icon: "💼", color: "#059669", bg: "#f0fdf4" },
  marketing:     { icon: "📈", color: "#d97706", bg: "#fffbeb" },
  research:      { icon: "🔬", color: "#6366f1", bg: "#eef2ff" },
  communication: { icon: "💬", color: "#db2777", bg: "#fdf2f8" },
};

const DIFF_STYLE: Record<string, { color: string; bg: string }> = {
  beginner:     { color: "#166534", bg: "#dcfce7" },
  intermediate: { color: "#92400e", bg: "#fef3c7" },
  advanced:     { color: "#991b1b", bg: "#fee2e2" },
};

function catOf(c: string)  { return CAT_META[c?.toLowerCase()]  || { icon: "⚡", color: "#64748b", bg: "#f1f5f9" }; }
function diffOf(d: string) { return DIFF_STYLE[d?.toLowerCase()] || { color: "#334155", bg: "#f1f5f9" }; }

/* ════════════════════════════════════════════════════════════════
   CRAFTRANK FEED ALGORITHM
   ────────────────────────────────────────────────────────────────
   score = weightedSignals + (spotlights x 8) + (impact x 0.5)
   trendingScore = (score / (ageHours + 2)^decayExponent) + discoveryBoost

   discoveryBoost: capsules under 24h old get a flat bonus that fades
   linearly to 0 by hour 24 — every capsule is guaranteed early
   impressions regardless of its starting signal count. Whether it
   sustains visibility after that depends on real engagement velocity
   during the boosted window: capsules earning signals/spotlights early
   get a softer decay exponent and stick around longer than ones that
   got the same boost but no real engagement.
   ════════════════════════════════════════════════════════════════ */
function weightedSignalScore(c: Capsule): number {
  return Object.entries(c.signal_counts || {}).reduce(
    (sum, [key, count]) => sum + count * (SIGNAL_WEIGHT[key] ?? 1),
    0
  );
}

function rawEngagementScore(c: Capsule): number {
  return weightedSignalScore(c) + (c.recruiter_spots || 0) * 8 + (c.skill_impact_score || 0) * 0.5;
}

const DISCOVERY_WINDOW_HOURS = 24;
const DISCOVERY_BOOST = 14; // flat score bonus, fades linearly over the window

function trendingScore(c: Capsule): number {
  const ageHours = Math.max(0.1, (Date.now() - new Date(c.created_at).getTime()) / 3_600_000);
  const engagement = rawEngagementScore(c);

  const velocity = engagement / Math.max(1, ageHours);
  const decayExponent = Math.max(1.1, 1.6 - Math.min(velocity * 0.05, 0.4));

  const decayed = engagement / Math.pow(ageHours + 2, decayExponent);
  const discoveryBoost = ageHours < DISCOVERY_WINDOW_HOURS
    ? DISCOVERY_BOOST * (1 - ageHours / DISCOVERY_WINDOW_HOURS)
    : 0;

  return decayed + discoveryBoost;
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7)  return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function TheStage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [highlightedCapsuleId, setHighlightedCapsuleId] = useState<string | null>(null);
  const [capsules,         setCapsules]         = useState<Capsule[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const [filterCategory,   setFilterCategory]   = useState("");
  const [sortBy,           setSortBy]           = useState<SortKey>("trending");
  const [hasMore,          setHasMore]          = useState(true);
  const [page,             setPage]             = useState(0);
  const [userProfile,      setUserProfile]      = useState<Profile | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toast,            setToast]            = useState<{ msg: string; type: ToastType } | null>(null);
  const [sentSignals,      setSentSignals]      = useState<Set<string>>(new Set());
  const [liveCount,        setLiveCount]        = useState(0);
  const viewedRef = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  function showToast(msg: string, type: ToastType = "info", ms = 3000) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), ms);
  }

  async function loadUserSignals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("skill_signals")
      .select("capsule_id, signal_type")
      .eq("user_id", user.id);
    if (error) return;
    const newSent = new Set<string>();
    for (const sig of data) {
      newSent.add(`${sig.capsule_id}-${sig.signal_type}`);
    }
    setSentSignals(newSent);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("users").select("id, role, full_name, company_name").eq("id", user.id).single();
      if (data) setUserProfile(data);
      await loadUserSignals();
    })();
  }, []);

  // "Feed energy" — a believable live-activity number, just enough to make
  // the feed feel alive without faking specific events. Ticks gently.
  useEffect(() => {
    setLiveCount(Math.max(3, Math.floor(capsules.length * 0.4) + Math.floor(Math.random() * 6)));
    const t = setInterval(() => {
      setLiveCount(prev => Math.max(2, prev + (Math.random() > 0.5 ? 1 : -1)));
    }, 4500);
    return () => clearInterval(t);
  }, [capsules.length]);

  const fetchCapsules = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (!reset && !hasMore) return;
    reset ? setLoading(true) : setLoadingMore(true);
    if (reset) {
      setCapsules([]);
      setPage(0);
      setHasMore(true);
    }
    let query = supabase
      .from("skill_capsules")
      .select("*, user:user_id ( id, full_name, username, avatar_url, total_points )")
      .eq("visibility", "public")
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
    if (filterCategory) query = query.eq("category", filterCategory);
    if (sortBy === "latest") query = query.order("created_at", { ascending: false });
    if (sortBy === "impact")  query = query.order("skill_impact_score", { ascending: false });
    const { data, error } = await query;
    if (error) { console.error(error); setLoading(false); setLoadingMore(false); return; }
    let rows = (data || []) as Capsule[];
    if (sortBy === "trending") rows = rows.sort((a, b) => trendingScore(b) - trendingScore(a));
    reset ? setCapsules(rows) : setCapsules(prev => [...prev, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    setPage(currentPage + 1);
    setLoading(false);
    setLoadingMore(false);
  }, [filterCategory, sortBy, page, hasMore]);

  useEffect(() => { fetchCapsules(true); }, [filterCategory, sortBy]);

  // Deep-link from a notification: ?highlight=<capsuleId> scrolls to and
  // glows the matching card once the feed has finished loading.
  useEffect(() => {
    const target = searchParams.get("highlight");
    if (!target || loading || capsules.length === 0) return;
    const stillExists = capsules.some(c => c.id === target);
    if (!stillExists) return;

    setHighlightedCapsuleId(target);
    const el = document.getElementById(`capsule-${target}`);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    const t = setTimeout(() => setHighlightedCapsuleId(null), 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, capsules.length]);

  // Impression tracking — IntersectionObserver logs a view the first time a
  // card scrolls into view, feeding real denominator data into CraftRank.
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const capsuleId = entry.target.getAttribute("data-capsule-id");
          if (!capsuleId || viewedRef.current.has(capsuleId)) return;
          viewedRef.current.add(capsuleId);
          logView(capsuleId);
        });
      },
      { threshold: 0.5 }
    );
    return () => observerRef.current?.disconnect();
  }, []);

  async function logView(capsuleId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("capsule_views").insert({
      capsule_id: capsuleId,
      viewer_id: user?.id || null,
    }); // unique constraint silently no-ops duplicate same-day views; errors ignored intentionally
  }

  const cardRefCallback = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el && observerRef.current) {
      el.setAttribute("data-capsule-id", id);
      observerRef.current.observe(el);
    }
  }, []);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of capsules) {
      if (c.category) {
        const norm = c.category.toLowerCase().trim();
        if (!map.has(norm)) map.set(norm, c.category);
      }
    }
    return [{ display: "All", normalised: "" }, ...Array.from(map.entries()).map(([norm, display]) => ({ display, normalised: norm }))];
  }, [capsules]);

  // SIGNAL — true toggle. Click sends it; clicking the same signal again
  // removes it, exactly like liking/unliking a post. Optimistic UI updates
  // immediately, then reconciles with the DB result.
  async function handleSignal(capsuleId: string, signalType: string) {
    const busyKey = capsuleId + signalType;
    if (actionInProgress) return;
    setActionInProgress(busyKey);

    const key = `${capsuleId}-${signalType}`;
    const alreadySent = sentSignals.has(key);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        showToast("Please log in again.", "error");
        router.push("/login");
        return;
      }

      setSentSignals(prev => {
        const next = new Set(prev);
        alreadySent ? next.delete(key) : next.add(key);
        return next;
      });
      setCapsules(prev => prev.map(c => {
        if (c.id !== capsuleId) return c;
        const counts = { ...(c.signal_counts || {}) };
        counts[signalType] = Math.max(0, (counts[signalType] || 0) + (alreadySent ? -1 : 1));
        return { ...c, signal_counts: counts };
      }));

      if (alreadySent) {
        const { error: deleteError } = await supabase
          .from("skill_signals")
          .delete()
          .eq("capsule_id", capsuleId)
          .eq("user_id", user.id)
          .eq("signal_type", signalType);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from("skill_signals")
          .insert({ capsule_id: capsuleId, user_id: user.id, signal_type: signalType });
        if (insertError && insertError.code !== "23505") throw insertError;
      }

      const current = capsules.find(c => c.id === capsuleId);
      if (current) {
        const counts = { ...(current.signal_counts || {}) };
        counts[signalType] = Math.max(0, (counts[signalType] || 0) + (alreadySent ? -1 : 1));

        // Recalculate skill_impact_score from the weighted signal formula so
        // CraftRank updates in real-time as signals are added or removed.
        const newImpactScore = Math.round(
          Object.entries(counts).reduce(
            (sum, [key, count]) => sum + (count as number) * (SIGNAL_WEIGHT[key] ?? 1),
            0
          ) + (current.recruiter_spots || 0) * 8
        );

        await supabase
          .from("skill_capsules")
          .update({ signal_counts: counts, skill_impact_score: newImpactScore })
          .eq("id", capsuleId);

        // Sync new score into local state so the card re-renders immediately
        setCapsules(prev => prev.map(c =>
          c.id !== capsuleId ? c : { ...c, signal_counts: counts, skill_impact_score: newImpactScore }
        ));
      }

      showToast(alreadySent ? `Removed "${signalType}" signal.` : `✅ "${signalType}" signal sent!`, alreadySent ? "info" : "success", 1800);
    } catch (err: any) {
      console.error(err);
      setSentSignals(prev => {
        const next = new Set(prev);
        alreadySent ? next.add(key) : next.delete(key);
        return next;
      });
      setCapsules(prev => prev.map(c => {
        if (c.id !== capsuleId) return c;
        const counts = { ...(c.signal_counts || {}) };
        counts[signalType] = Math.max(0, (counts[signalType] || 0) + (alreadySent ? 1 : -1));
        return { ...c, signal_counts: counts };
      }));
      showToast(`⚠️ ${err?.message || "Couldn't update signal"}`, "error");
    } finally {
      setActionInProgress(null);
    }
  }

  // SPOTLIGHT — every column reference is explicit and single-table, so this
  // insert cannot itself raise an ambiguous-column error. If you still see it,
  // it's coming from a DB-side trigger/view — see the-stage-feed-upgrade.sql.
  async function handleSpotlight(capsuleId: string, candidateId: string) {
    if (actionInProgress) return;
    setActionInProgress(capsuleId + "spot");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        showToast("Please log in again.", "error");
        router.push("/login");
        return;
      }
      if (userProfile?.role !== "company") {
        showToast("Only recruiters can Spotlight talent.", "info");
        return;
      }
      if (user.id === candidateId) {
        showToast("You can't Spotlight your own SkillCapsule.", "info");
        return;
      }

      const { data: recruiterData } = await supabase
        .from("users")
        .select("full_name, company_name")
        .eq("id", user.id)
        .single();
      const recruiterName = recruiterData?.company_name || recruiterData?.full_name || "A recruiter";

      const capsule = capsules.find(c => c.id === capsuleId);
      const capsuleTitle = capsule?.title || "your SkillCapsule";

      const { error } = await supabase.from("recruiter_spotlights").insert({
        recruiter_id: user.id,
        candidate_id: candidateId,
        spotlight_type: "spot",
        capsule_id: capsuleId,
      });

      if (error) {
        console.error("Spotlight error:", error);
        if (error.code === "23505") {
          showToast("You already Spotlighted this candidate.", "info");
        } else if (error.message?.toLowerCase().includes("ambiguous")) {
          showToast("Spotlight failed: a database trigger has a column conflict. See the-stage-feed-upgrade.sql.", "error", 6000);
        } else {
          showToast(`Failed: ${error.message || "Try again"}`, "error");
        }
        return;
      }

      const { ok, error: notifError } = await notifyUser({
        userId: candidateId,
        fromUserId: user.id,
        type: "spotlight",
        capsuleId,
        message: NotificationMessages.spotlight(recruiterName, capsuleTitle),
      });
      if (!ok) console.error("Notification insert error:", notifError);

      setCapsules(prev => prev.map(c => {
        if (c.id !== capsuleId) return c;
        const spots = (c.recruiter_spots || 0) + 1;
        // Recalculate skill_impact_score — recruiter_spots contributes x8 to the score
        const newImpactScore = Math.round(
          Object.entries(c.signal_counts || {}).reduce(
            (sum, [key, count]) => sum + (count as number) * (SIGNAL_WEIGHT[key] ?? 1),
            0
          ) + spots * 8
        );
        supabase.from("skill_capsules").update({
          recruiter_spots: spots,
          skill_impact_score: newImpactScore,
        }).eq("id", capsuleId);
        return { ...c, recruiter_spots: spots, skill_impact_score: newImpactScore };
      }));
      showToast("🔦 Candidate Spotlighted! They've been notified.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message?.toLowerCase().includes("ambiguous")
        ? "Spotlight failed: ambiguous column in a DB trigger/view — see the-stage-feed-upgrade.sql diagnostics."
        : "Unexpected error", "error", 6000);
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleCall(capsuleId: string, candidateId: string) {
    if (actionInProgress) return;
    setActionInProgress(capsuleId + "call");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        showToast("Please log in again.", "error");
        router.push("/login");
        return;
      }
      if (userProfile?.role !== "company") {
        showToast("Only recruiters can Call candidates.", "info");
        return;
      }
      if (user.id === candidateId) {
        showToast("You can't Call your own SkillCapsule.", "info");
        return;
      }

      const { data: recruiterData } = await supabase
        .from("users")
        .select("full_name, company_name")
        .eq("id", user.id)
        .single();
      const recruiterName = recruiterData?.company_name || recruiterData?.full_name || "A recruiter";

      const capsule = capsules.find(c => c.id === capsuleId);
      const capsuleTitle = capsule?.title || "your SkillCapsule";

      const { error } = await supabase.from("recruiter_spotlights").insert({
        recruiter_id: user.id,
        candidate_id: candidateId,
        spotlight_type: "call",
        capsule_id: capsuleId,
      });
      if (error) {
        console.error("Call error:", error);
        if (error.code === "23505") {
          showToast("You already sent a Call to this candidate.", "info");
        } else {
          showToast(`Failed: ${error.message || "Try again"}`, "error");
        }
        return;
      }

      const { ok, error: notifError } = await notifyUser({
        userId: candidateId,
        fromUserId: user.id,
        type: "call",
        capsuleId,
        message: NotificationMessages.call(recruiterName, capsuleTitle),
      });
      if (!ok) console.error("Notification insert error:", notifError);

      showToast("📞 Call sent! The candidate will be invited to apply.", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Unexpected error", "error");
    } finally {
      setActionInProgress(null);
    }
  }

  const totalSignals = (c: Capsule) => Object.values(c.signal_counts || {}).reduce((a: number, b: number) => a + b, 0);

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes nf-glow { 0%{box-shadow:0 0 0 0 rgba(99,102,241,.5)} 50%{box-shadow:0 0 0 12px rgba(99,102,241,0)} 100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} }
        @keyframes sig-pop { 0%{transform:scale(1)} 40%{transform:scale(1.18)} 100%{transform:scale(1)} }
        @keyframes live-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }

        .sf-card { transition:transform .2s,box-shadow .2s; }
        .sf-card:hover { transform:translateY(-3px); box-shadow:0 20px 48px rgba(2,6,23,.11) !important; }
        .sf-btn  { transition:transform .15s,opacity .15s; cursor:pointer; }
        .sf-btn:hover  { transform:translateY(-1px); }
        .sf-btn:active { transform:scale(.96); opacity:.9; }
        .sf-sig  { transition:background .15s,border .15s,color .15s,transform .15s; }
        .sf-sig:hover  { background:#eef2ff !important; border-color:#2563eb !important; color:#2563eb !important; }
        .sf-sig:active { transform:scale(.92); }
        .sf-sig-active { animation: sig-pop .3s ease; }
        .sf-anim { animation:fadeUp .4s ease both; }
        .sf-live-dot { animation: live-blink 1.6s infinite; }

        @media(max-width:768px){
          .sf-toolbar     { flex-direction:column !important; align-items:stretch !important; gap:10px !important; }
          .sf-filter-wrap { overflow-x:auto !important; flex-wrap:nowrap !important; -webkit-overflow-scrolling:touch; scrollbar-width:none; padding-bottom:4px; }
          .sf-filter-wrap::-webkit-scrollbar { display:none; }
          .sf-sort-wrap   { width:100% !important; }
          .sf-sort-wrap select { width:100% !important; }
          .sf-launch      { width:100% !important; text-align:center !important; }
          .sf-grid        { grid-template-columns:1fr !important; }
          .sf-signals     { grid-template-columns:repeat(4,1fr) !important; gap:5px !important; }
          .sf-rec-actions { width:100% !important; }
          .sf-rec-actions button { flex:1 !important; }
          .sf-stats       { gap:10px !important; flex-wrap:wrap !important; }
          .sf-hero-title  { font-size:26px !important; }
          .sf-hero-sub    { font-size:13.5px !important; }
          .sf-hero-pad    { padding:24px 18px !important; }
          .sf-live-strip  { font-size:11px !important; }
        }
        @media(max-width:420px){
          .sf-signals { grid-template-columns:repeat(4,1fr) !important; }
          .sf-sig span:nth-child(2) { display:none; }
        }
      `}</style>
      {toast && (
        <div style={{ position:"fixed", top:18, right:18, zIndex:9999, background: toast.type==="success" ? "#10b981" : toast.type==="error" ? "#ef4444" : "#2563eb", color:"white", padding:"12px 18px", borderRadius:14, fontWeight:700, fontSize:14, boxShadow:"0 10px 30px rgba(0,0,0,.18)", maxWidth:"calc(100vw - 36px)" }}>
          {toast.msg}
        </div>
      )}
      <div style={{ maxWidth:1240, margin:"0 auto", padding:"24px 16px 60px", fontFamily:"Inter,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
        <div className="sf-hero-pad" style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 55%,#1e40af 100%)", borderRadius:26, padding:"36px 28px", marginBottom:14, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220, borderRadius:"50%", background:"rgba(124,58,237,.18)", filter:"blur(44px)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-50, left:-40, width:200, height:200, borderRadius:"50%", background:"rgba(37,99,235,.2)", filter:"blur(36px)", pointerEvents:"none" }} />
          <div style={{ position:"relative", zIndex:1, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20 }}>
            <div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", color:"#93c5fd", padding:"5px 14px", borderRadius:999, fontSize:11, fontWeight:800, marginBottom:14, letterSpacing:"0.06em" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", animation:"pulse 2s infinite", display:"inline-block" }} />
                LIVE SKILL FEED
              </div>
              <h1 className="sf-hero-title" style={{ margin:"0 0 10px", fontSize:36, fontWeight:900, color:"white", letterSpacing:"-0.04em", lineHeight:1.1 }}>🎪 The Showfloor</h1>
              <p className="sf-hero-sub" style={{ margin:0, color:"#bfdbfe", fontSize:15, lineHeight:1.7, maxWidth:520 }}>
                Real skill demonstrations from real candidates. Send <strong style={{ color:"white" }}>SkillSignals</strong>, <strong style={{ color:"white" }}>Spotlight</strong> talent, and <strong style={{ color:"white" }}>Call</strong> them to apply.
              </p>
            </div>
            <div className="sf-stats" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[
                { val: capsules.length > 0 ? `${capsules.length}+` : "—", label:"Capsules Live", icon:"🎯" },
                { val: capsules.reduce((a,c) => a + totalSignals(c), 0) || "—", label:"SkillSignals", icon:"⚡" },
              ].map((s,i) => (
                <div key={i} style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", borderRadius:14, padding:"12px 16px", textAlign:"center", minWidth:100 }}>
                  <div style={{ fontSize:20 }}>{s.icon}</div>
                  <div style={{ fontSize:20, fontWeight:900, color:"white", lineHeight:1, marginTop:4 }}>{s.val}</div>
                  <div style={{ fontSize:11, color:"#93c5fd", fontWeight:700, marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sf-live-strip" style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18, padding:"8px 14px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:999, fontSize:12.5, color:"#166534", fontWeight:700, width:"fit-content" }}>
          <span className="sf-live-dot" style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a", display:"inline-block" }} />
          {liveCount} people active on The Showfloor right now
        </div>

        <div className="sf-toolbar" style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          <div className="sf-filter-wrap" style={{ display:"flex", gap:8, flex:1, minWidth:0, flexWrap:"wrap" }}>
            {categoryOptions.map((opt, idx) => {
              const isActive = filterCategory === opt.display;
              const meta = opt.display !== "All" ? catOf(opt.display) : null;
              const bgColor = isActive ? (meta?.bg || "#eef2ff") : "white";
              const textColor = isActive ? (meta?.color || "#2563eb") : "#64748b";
              const borderColor = isActive ? (meta?.color || "#2563eb") : "#e2e8f0";
              return (
                <button
                  key={`cat-${idx}`}
                  className="sf-btn"
                  onClick={() => setFilterCategory(opt.display === "All" ? "" : opt.display)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: `1.5px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    fontSize: 13,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {opt.display === "All" ? "All" : `${meta?.icon} ${opt.display.charAt(0).toUpperCase() + opt.display.slice(1)}`}
                </button>
              );
            })}
          </div>
          <div className="sf-sort-wrap" style={{ flexShrink:0 }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
              style={{ padding:"10px 14px", borderRadius:13, border:"1.5px solid #e2e8f0", fontSize:14, background:"white", color:"#0f172a", cursor:"pointer", fontWeight:700, outline:"none" }}>
              <option value="trending">🔥 Trending</option>
              <option value="latest">📅 Latest</option>
              <option value="impact">🏆 Highest CraftRank</option>
            </select>
          </div>
          <Link href="/launch-skillcapsule" className="sf-launch sf-btn"
            style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", padding:"10px 20px", borderRadius:13, textDecoration:"none", fontWeight:800, fontSize:14, boxShadow:"0 6px 18px rgba(37,99,235,.3)", whiteSpace:"nowrap", flexShrink:0 }}>
            ✨ Launch Capsule
          </Link>
        </div>

        {loading && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:16 }}>
            {Array.from({length:6}).map((_,i) => (
              <div key={i} style={{ background:"white", borderRadius:20, padding:20, border:"1px solid #f1f5f9", height:320 }}>
                <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
                <div style={{ background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite", borderRadius:99, height:36, width:36, marginBottom:12 }} />
                {[80, 120, 60, 40].map((w,j) => <div key={j} style={{ background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite", borderRadius:8, height:j===1?16:10, width:`${w}%`, marginBottom:10 }} />)}
              </div>
            ))}
          </div>
        )}
        {!loading && capsules.length === 0 && (
          <div style={{ background:"white", borderRadius:24, padding:"56px 24px", textAlign:"center", border:"1px dashed #dbe3ee", marginTop:8 }}>
            <div style={{ fontSize:48, marginBottom:14 }}>🎪</div>
            <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:900, color:"#0f172a" }}>The Showfloor is empty</h3>
            <p style={{ margin:"0 0 22px", color:"#64748b", fontSize:15, lineHeight:1.7 }}>No SkillCapsules yet. Be the first to show your skills.</p>
            <Link href="/launch-skillcapsule" style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", padding:"13px 28px", borderRadius:14, textDecoration:"none", fontWeight:800, fontSize:15, boxShadow:"0 8px 20px rgba(37,99,235,.3)" }}>
              ✨ Launch First Capsule →
            </Link>
          </div>
        )}
        {!loading && capsules.length > 0 && (
          <div className="sf-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:16 }}>
            {capsules.map((capsule, idx) => {
              const cat  = catOf(capsule.category);
              const diff = capsule.difficulty ? diffOf(capsule.difficulty) : null;
              const sigs = totalSignals(capsule);
              const userPoints = capsule.user?.total_points || 0;
              const userTier   = getTierFromPoints(userPoints);
              const tierColor  = getTierColor(userTier);
              const busy       = actionInProgress !== null;
              const isNew      = (Date.now() - new Date(capsule.created_at).getTime()) < 1000 * 60 * 60 * 24;
              return (
                <div
                  key={capsule.id}
                  id={`capsule-${capsule.id}`}
                  ref={cardRefCallback(capsule.id)}
                  className="sf-card sf-anim"
                  style={{ background:"white", borderRadius:20, padding:"20px 18px", boxShadow:"0 6px 22px rgba(2,6,23,.06)", border: highlightedCapsuleId === capsule.id ? "1.5px solid #6366f1" : "1px solid #f1f5f9", display:"flex", flexDirection:"column", animationDelay:`${Math.min(idx*35,280)}ms`, animation: highlightedCapsuleId === capsule.id ? "nf-glow 1.3s ease 2" : undefined, position:"relative" }}>

                  {isNew && (
                    <span style={{ position:"absolute", top:14, right:14, background:"#fef3c7", color:"#92400e", fontSize:10, fontWeight:800, padding:"3px 9px", borderRadius:999, letterSpacing:"0.04em" }}>
                      ✨ NEW
                    </span>
                  )}

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                      {capsule.user?.avatar_url
                        ? <img src={capsule.user.avatar_url} alt="" style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"2px solid #f1f5f9" }} />
                        : <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#eef2ff,#dbeafe)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#2563eb", fontSize:15, flexShrink:0 }}>
                            {(capsule.user?.full_name || "U")[0].toUpperCase()}
                          </div>
                      }
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                          <span style={{ fontWeight:800, fontSize:14, color:"#0f172a" }}>{capsule.user?.full_name || "Anonymous"}</span>
                          <span style={{ background:`${tierColor}18`, color:tierColor, fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:999, border:`1px solid ${tierColor}33` }}>{userTier}</span>
                        </div>
                        <div style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>@{capsule.user?.username || "user"} · {timeAgo(capsule.created_at)}</div>
                      </div>
                    </div>
                    <span style={{ background:cat.bg, color:cat.color, border:`1px solid ${cat.color}33`, padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:800, flexShrink:0 }}>{cat.icon} {capsule.category}</span>
                  </div>
                  <h2 style={{ margin:"0 0 8px", fontSize:17, fontWeight:900, color:"#0f172a", letterSpacing:"-0.02em", lineHeight:1.3 }}>{capsule.title}</h2>
                  <p style={{ margin:"0 0 12px", color:"#64748b", fontSize:13, lineHeight:1.75 }}>
                    {capsule.description.length > 120 ? capsule.description.slice(0,120)+"…" : capsule.description}
                  </p>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                    {diff && <span style={{ background:diff.bg, color:diff.color, padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800, textTransform:"capitalize" }}>{capsule.difficulty}</span>}
                    {capsule.skills_used?.slice(0,3).map((s, skillIdx) => (
                      <span key={`${s}-${skillIdx}`} style={{ background:"#f1f5f9", color:"#334155", border:"1px solid #e2e8f0", padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:700 }}>{s}</span>
                    ))}
                    {(capsule.skills_used?.length || 0) > 3 && (
                      <span style={{ background:"#f1f5f9", color:"#94a3b8", padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:700 }}>+{capsule.skills_used!.length - 3}</span>
                    )}
                  </div>
                  <div className="sf-stats" style={{ display:"flex", gap:14, marginBottom:12, fontSize:12, color:"#64748b", fontWeight:700, flexWrap:"wrap" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>🏆 <strong style={{ color:"#0f172a" }}>{capsule.skill_impact_score || 0}</strong> CraftRank</span>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>⚡ <strong style={{ color:"#0f172a" }}>{sigs}</strong> Signals</span>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>🔦 <strong style={{ color:"#0f172a" }}>{capsule.recruiter_spots || 0}</strong> Spotlights</span>
                  </div>
                  {capsule.link_url && (
                    <a href={capsule.link_url} target="_blank" rel="noopener noreferrer"
                      style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"linear-gradient(135deg,#f8fafc,#f1f5f9)", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"10px", fontSize:13, fontWeight:800, color:"#0f172a", textDecoration:"none", marginBottom:14, transition:"background .15s" }}>
                      🔗 View Work
                    </a>
                  )}
                  <div style={{ flex:1 }} />
                  {userProfile ? (
                    <div>
                      <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em" }}>Send a SkillSignal — tap again to remove</p>
                      <div className="sf-signals" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:12 }}>
                        {SIGNALS.map(sig => {
                          const count = capsule.signal_counts?.[sig.key] || 0;
                          const sent  = sentSignals.has(`${capsule.id}-${sig.key}`);
                          return (
                            <button key={sig.key} className={`sf-sig sf-btn ${sent ? "sf-sig-active" : ""}`}
                              onClick={() => handleSignal(capsule.id, sig.key)}
                              disabled={busy}
                              aria-pressed={sent}
                              title={sent ? `Remove "${sig.label}" signal` : `Send "${sig.label}" signal`}
                              style={{ background: sent ? "#eef2ff" : "#f8fafc", border:`1.5px solid ${sent ? "#2563eb" : "#e2e8f0"}`, borderRadius:10, padding:"7px 4px", fontSize:10, fontWeight:800, color: sent ? "#2563eb" : "#475569", cursor: busy ? "not-allowed" : "pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, opacity: busy ? 0.6 : 1 }}>
                              <span style={{ fontSize:14 }}>{sig.icon}</span>
                              <span style={{ lineHeight:1.2, textAlign:"center" }}>{sig.label}</span>
                              {count > 0 && <span style={{ background: sent ? "#2563eb" : "#e2e8f0", color: sent ? "white" : "#64748b", borderRadius:999, padding:"1px 5px", fontSize:9, fontWeight:900 }}>{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                      {userProfile.role === "company" && (
                        <div className="sf-rec-actions" style={{ display:"flex", gap:8, marginBottom:10 }}>
                          <button className="sf-btn"
                            onClick={() => handleSpotlight(capsule.id, capsule.user_id)}
                            disabled={busy}
                            style={{ flex:1, background:"linear-gradient(135deg,#fef3c7,#fde68a)", border:"1px solid #fde68a", borderRadius:12, padding:"10px 8px", fontSize:13, fontWeight:800, color:"#92400e", cursor: busy ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, opacity: busy ? 0.6 : 1 }}>
                            🔦 Spotlight
                          </button>
                          <button className="sf-btn"
                            onClick={() => handleCall(capsule.id, capsule.user_id)}
                            disabled={busy}
                            style={{ flex:1, background:"linear-gradient(135deg,#dcfce7,#bbf7d0)", border:"1px solid #bbf7d0", borderRadius:12, padding:"10px 8px", fontSize:13, fontWeight:800, color:"#166534", cursor: busy ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, opacity: busy ? 0.6 : 1 }}>
                            📞 Call
                          </button>
                        </div>
                      )}
                      <Link href={`/candidate/${capsule.user_id}`}
                        style={{ display:"block", textAlign:"center", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"9px", fontSize:13, fontWeight:700, color:"#475569", textDecoration:"none" }}>
                        View Profile →
                      </Link>
                    </div>
                  ) : (
                    <div style={{ background:"#f8fafc", borderRadius:14, padding:"14px", textAlign:"center", border:"1px dashed #dbe3ee" }}>
                      <p style={{ margin:"0 0 10px", fontSize:13, color:"#64748b", fontWeight:600 }}>Log in to send SkillSignals & interact</p>
                      <div style={{ display:"flex", gap:8 }}>
                        <Link href="/login" style={{ flex:1, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", padding:"9px", borderRadius:12, textDecoration:"none", fontWeight:800, fontSize:13, textAlign:"center", boxShadow:"0 4px 12px rgba(37,99,235,.3)" }}>Log in</Link>
                        <Link href="/signup" style={{ flex:1, background:"white", color:"#0f172a", border:"1px solid #e2e8f0", padding:"9px", borderRadius:12, textDecoration:"none", fontWeight:700, fontSize:13, textAlign:"center" }}>Sign up</Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {loadingMore && (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid #dbe3ee", borderTopColor:"#2563eb", margin:"0 auto", animation:"spin 0.8s linear infinite" }} />
          </div>
        )}
        {hasMore && !loading && !loadingMore && capsules.length > 0 && (
          <div style={{ textAlign:"center", marginTop:28 }}>
            <button className="sf-btn"
              onClick={() => fetchCapsules(false)}
              style={{ background:"white", border:"1.5px solid #e2e8f0", color:"#0f172a", padding:"12px 32px", borderRadius:14, fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 4px 12px rgba(2,6,23,.06)" }}>
              Load More Capsules
            </button>
          </div>
        )}
        {!hasMore && !loading && capsules.length > 0 && (
          <p style={{ textAlign:"center", marginTop:24, color:"#94a3b8", fontSize:14, fontWeight:600 }}>
            You've seen all {capsules.length} capsules · <Link href="/launch-skillcapsule" style={{ color:"#2563eb", fontWeight:700 }}>Launch yours →</Link>
          </p>
        )}
      </div>
    </>
  );
}