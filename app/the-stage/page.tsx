"use client";

import { Suspense } from "react";
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
type Burst = { id: string; capsuleId: string; icon: string; label: string };

const PAGE_SIZE = 12;

const SIGNALS = [
  { key: "skilled",        label: "Skilled",        icon: "⚡", weight: 1.0, color: "#2563eb" },
  { key: "practical",      label: "Practical",       icon: "🔧", weight: 1.0, color: "#059669" },
  { key: "creative",       label: "Creative",        icon: "🎨", weight: 0.8, color: "#7c3aed" },
  { key: "strong_comm",    label: "Clear Comm",      icon: "💬", weight: 1.0, color: "#db2777" },
  { key: "hireable",       label: "Hireable",        icon: "🎯", weight: 2.2, color: "#d97706" },
  { key: "smart_solution", label: "Smart Solution",  icon: "💡", weight: 1.6, color: "#0891b2" },
  { key: "well_structured",label: "Well Structured", icon: "📐", weight: 0.9, color: "#4338ca" },
];
const SIGNAL_WEIGHT: Record<string, number> = Object.fromEntries(SIGNALS.map(s => [s.key, s.weight]));
const SIGNAL_META: Record<string, typeof SIGNALS[number]> = Object.fromEntries(SIGNALS.map(s => [s.key, s]));

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

function weightedSignalScore(c: Capsule): number {
  return Object.entries(c.signal_counts || {}).reduce((sum, [key, count]) => sum + count * (SIGNAL_WEIGHT[key] ?? 1), 0);
}
function rawEngagementScore(c: Capsule): number {
  return weightedSignalScore(c) + (c.recruiter_spots || 0) * 8 + (c.skill_impact_score || 0) * 0.5;
}
const DISCOVERY_WINDOW_HOURS = 24;
const DISCOVERY_BOOST = 14;
function trendingScore(c: Capsule): number {
  const ageHours = Math.max(0.1, (Date.now() - new Date(c.created_at).getTime()) / 3_600_000);
  const engagement = rawEngagementScore(c);
  const velocity = engagement / Math.max(1, ageHours);
  const decayExponent = Math.max(1.1, 1.6 - Math.min(velocity * 0.05, 0.4));
  const decayed = engagement / Math.pow(ageHours + 2, decayExponent);
  const discoveryBoost = ageHours < DISCOVERY_WINDOW_HOURS ? DISCOVERY_BOOST * (1 - ageHours / DISCOVERY_WINDOW_HOURS) : 0;
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

/* Signal-composition mini bar — a proportional stacked bar showing which
   signal types make up a capsule's total, at a glance. Not just a number. */
function SignalCompositionBar({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts || {}).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", marginBottom: 10, background: "#f1f5f9" }}>
      {SIGNALS.filter(s => (counts[s.key] || 0) > 0).map(s => (
        <div key={s.key} title={`${s.label}: ${counts[s.key]}`} style={{ width: `${((counts[s.key] || 0) / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  );
}

/* Scroll-reveal wrapper for feed cards, independent of the impression
   IntersectionObserver used for view-count logging. */
function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── The main component that uses useSearchParams ──────────────────
function TheStageContent() {
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
  const [bursts,           setBursts]           = useState<Burst[]>([]);
  const [expandedIds,      setExpandedIds]      = useState<Set<string>>(new Set());
  const viewedRef = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  function showToast(msg: string, type: ToastType = "info", ms = 3000) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), ms);
  }

  function fireBurst(capsuleId: string, signalKey: string) {
    const meta = SIGNAL_META[signalKey];
    const id = `${capsuleId}-${signalKey}-${Date.now()}`;
    setBursts(prev => [...prev, { id, capsuleId, icon: meta.icon, label: meta.label }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 1100);
  }

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function loadUserSignals(capsuleIds?: string[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let query = supabase.from("skill_signals").select("capsule_id, signal_type").eq("user_id", user.id);
    if (capsuleIds && capsuleIds.length > 0) query = query.in("capsule_id", capsuleIds);
    const { data, error } = await query;
    if (error) return;
    setSentSignals(prev => {
      const next = new Set(prev);
      for (const sig of data) next.add(`${sig.capsule_id}-${sig.signal_type}`);
      return next;
    });
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("users").select("id, role, full_name, company_name").eq("id", user.id).single();
      if (data) setUserProfile(data);
      await loadUserSignals();
    })();
  }, []);

  useEffect(() => {
    setLiveCount(Math.max(3, Math.floor(capsules.length * 0.4) + Math.floor(Math.random() * 6)));
    const t = setInterval(() => { setLiveCount(prev => Math.max(2, prev + (Math.random() > 0.5 ? 1 : -1))); }, 4500);
    return () => clearInterval(t);
  }, [capsules.length]);

  const fetchCapsules = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (!reset && !hasMore) return;
    reset ? setLoading(true) : setLoadingMore(true);
    if (reset) { setCapsules([]); setPage(0); setHasMore(true); }
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
    if (sortBy === "impact")   rows = rows.sort((a, b) => (b.skill_impact_score || 0) - (a.skill_impact_score || 0));
    reset ? setCapsules(rows) : setCapsules(prev => [...prev, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    setPage(currentPage + 1);
    setLoading(false);
    setLoadingMore(false);
    if (rows.length > 0) loadUserSignals(rows.map((r: Capsule) => r.id));
  }, [filterCategory, sortBy, page, hasMore]);

  useEffect(() => { fetchCapsules(true); }, [filterCategory, sortBy]);

  // Deep-link from notification: ?highlight=<capsuleId>
  useEffect(() => {
    const target = searchParams.get("highlight");
    if (!target || loading || capsules.length === 0) return;
    const stillExists = capsules.some(c => c.id === target);
    if (!stillExists) return;
    setHighlightedCapsuleId(target);
    const el = document.getElementById(`capsule-${target}`);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    const t = setTimeout(() => setHighlightedCapsuleId(null), 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, capsules.length]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const capsuleId = entry.target.getAttribute("data-capsule-id");
        if (!capsuleId || viewedRef.current.has(capsuleId)) return;
        viewedRef.current.add(capsuleId);
        logView(capsuleId);
      });
    }, { threshold: 0.5 });
    return () => observerRef.current?.disconnect();
  }, []);

  async function logView(capsuleId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("capsule_views").insert({ capsule_id: capsuleId, viewer_id: user?.id || null });
  }

  const cardRefCallback = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el && observerRef.current) { el.setAttribute("data-capsule-id", id); observerRef.current.observe(el); }
  }, []);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of capsules) {
      if (c.category) { const norm = c.category.toLowerCase().trim(); if (!map.has(norm)) map.set(norm, c.category); }
    }
    return [{ display: "All", normalised: "" }, ...Array.from(map.entries()).map(([norm, display]) => ({ display, normalised: norm }))];
  }, [capsules]);

  const topMovers = useMemo(() => {
    return [...capsules].sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, 5);
  }, [capsules]);

  async function handleSignal(capsuleId: string, signalType: string) {
    const busyKey = capsuleId + signalType;
    if (actionInProgress) return;
    setActionInProgress(busyKey);
    const key = `${capsuleId}-${signalType}`;
    const wasAlreadySent = sentSignals.has(key);

    setSentSignals(prev => { const next = new Set(prev); wasAlreadySent ? next.delete(key) : next.add(key); return next; });
    if (!wasAlreadySent) fireBurst(capsuleId, signalType);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        showToast("Please log in again.", "error");
        router.push("/login");
        setSentSignals(prev => { const n = new Set(prev); wasAlreadySent ? n.add(key) : n.delete(key); return n; });
        return;
      }
      const { data, error } = await supabase.rpc("toggle_skill_signal", { p_capsule_id: capsuleId, p_signal_type: signalType });
      if (error) throw error;

      const result = data as { sent: boolean; signal_counts: Record<string, number>; skill_impact_score: number };
      setCapsules(prev => prev.map(c => c.id !== capsuleId ? c : { ...c, signal_counts: result.signal_counts, skill_impact_score: result.skill_impact_score }));
      setSentSignals(prev => { const next = new Set(prev); result.sent ? next.add(key) : next.delete(key); return next; });
      showToast(result.sent ? `✅ "${signalType}" signal sent!` : `Removed "${signalType}" signal.`, result.sent ? "success" : "info", 1600);
    } catch (err: any) {
      console.error(err);
      setSentSignals(prev => { const n = new Set(prev); wasAlreadySent ? n.add(key) : n.delete(key); return n; });
      showToast(`⚠️ ${err?.message || "Couldn't update signal — run fix-signal-and-call-bugs-v2.sql if this persists."}`, "error");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleSpotlight(capsuleId: string, candidateId: string) {
    if (actionInProgress) return;
    setActionInProgress(capsuleId + "spot");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { showToast("Please log in again.", "error"); router.push("/login"); return; }
      if (userProfile?.role !== "company") { showToast("Only recruiters can Spotlight talent.", "info"); return; }
      if (user.id === candidateId) { showToast("You can't Spotlight your own SkillCapsule.", "info"); return; }

      const { data: recruiterData } = await supabase.from("users").select("full_name, company_name").eq("id", user.id).single();
      const recruiterName = recruiterData?.company_name || recruiterData?.full_name || "A recruiter";
      const capsule = capsules.find(c => c.id === capsuleId);
      const capsuleTitle = capsule?.title || "your SkillCapsule";

      const { error } = await supabase.from("recruiter_spotlights").insert({ recruiter_id: user.id, candidate_id: candidateId, spotlight_type: "spot", capsule_id: capsuleId });
      if (error) {
        if (error.code === "23505") showToast("You already Spotlighted this candidate.", "info");
        else if (error.message?.toLowerCase().includes("ambiguous")) showToast("Spotlight failed: DB trigger column conflict — run fix-signal-and-call-bugs-v2.sql.", "error", 6000);
        else showToast(`Failed: ${error.message || "Try again"}`, "error");
        return;
      }
      const { ok, error: notifError } = await notifyUser({ userId: candidateId, fromUserId: user.id, type: "spotlight", capsuleId, message: NotificationMessages.spotlight(recruiterName, capsuleTitle) });
      if (!ok) console.error("Notification insert error:", notifError);

      setCapsules(prev => prev.map(c => {
        if (c.id !== capsuleId) return c;
        const spots = (c.recruiter_spots || 0) + 1;
        const newImpactScore = Math.round(Object.entries(c.signal_counts || {}).reduce((sum, [k, v]) => sum + (v as number) * (SIGNAL_WEIGHT[k] ?? 1), 0) + spots * 8);
        return { ...c, recruiter_spots: spots, skill_impact_score: newImpactScore };
      }));
      showToast("🔦 Candidate Spotlighted! They've been notified.", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Unexpected error", "error");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleCall(capsuleId: string, candidateId: string) {
    if (actionInProgress) return;
    setActionInProgress(capsuleId + "call");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { showToast("Please log in again.", "error"); router.push("/login"); return; }
      if (userProfile?.role !== "company") { showToast("Only recruiters can Call candidates.", "info"); return; }
      if (user.id === candidateId) { showToast("You can't Call your own SkillCapsule.", "info"); return; }

      const { data: recruiterData } = await supabase.from("users").select("full_name, company_name").eq("id", user.id).single();
      const recruiterName = recruiterData?.company_name || recruiterData?.full_name || "A recruiter";
      const capsule = capsules.find(c => c.id === capsuleId);
      const capsuleTitle = capsule?.title || "your SkillCapsule";

      const { error } = await supabase.from("recruiter_spotlights").insert({ recruiter_id: user.id, candidate_id: candidateId, spotlight_type: "call", capsule_id: capsuleId });
      if (error) {
        if (error.code === "23505") showToast("You already sent a Call to this candidate.", "info");
        else showToast(`Call failed: ${error.message || "Try again"} — if this repeats, run fix-signal-and-call-bugs-v2.sql.`, "error", 6000);
        return;
      }
      const { ok, error: notifError } = await notifyUser({ userId: candidateId, fromUserId: user.id, type: "call", capsuleId, message: NotificationMessages.call(recruiterName, capsuleTitle) });
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
        @keyframes spin        { to { transform:rotate(360deg); } }
        @keyframes fadeUp      { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes nf-glow     { 0%{box-shadow:0 0 0 0 rgba(99,102,241,.5)} 50%{box-shadow:0 0 0 12px rgba(99,102,241,0)} 100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} }
        @keyframes sig-pop     { 0%{transform:scale(1)} 45%{transform:scale(1.22)} 100%{transform:scale(1)} }
        @keyframes live-blink  { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes shimmer     { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes moverFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes burst-float { 0%{opacity:0;transform:translate(-50%,0) scale(.7)} 15%{opacity:1;transform:translate(-50%,-6px) scale(1.08)} 70%{opacity:1;transform:translate(-50%,-38px) scale(1)} 100%{opacity:0;transform:translate(-50%,-58px) scale(.95)} }
        @keyframes burst-ring  { 0%{opacity:.55;transform:translate(-50%,-50%) scale(.3)} 100%{opacity:0;transform:translate(-50%,-50%) scale(2.4)} }
        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }

        .sf-sticky-toolbar { position:sticky; top:0; z-index:30; backdrop-filter:blur(14px) saturate(160%); -webkit-backdrop-filter:blur(14px) saturate(160%); background:rgba(248,250,252,.82); border-bottom:1px solid #eef0f4; }
        .sf-tab { position:relative; padding:10px 4px; cursor:pointer; font-size:13px; font-weight:700; white-space:nowrap; background:none; border:none; transition:color .15s; }
        .sf-tab-underline { position:absolute; bottom:-1px; height:2px; border-radius:2px; background:#2563eb; transition:left .28s cubic-bezier(.2,.8,.2,1), width .28s cubic-bezier(.2,.8,.2,1); }

        .sf-card { transition:transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease; position:relative; opacity:0; transform:translateY(20px); }
        .sf-card-visible { opacity:1 !important; transform:translateY(0) !important; }
        .sf-card:hover { transform:translateY(-4px) !important; box-shadow:0 24px 52px rgba(2,6,23,.12) !important; }
        .sf-cat-rail { position:absolute; top:14px; bottom:14px; left:0; width:4px; border-radius:0 4px 4px 0; }

        .sf-avatar-ring { padding:2.5px; border-radius:50%; }

        .sf-btn  { transition:transform .15s,opacity .15s,box-shadow .15s; cursor:pointer; }
        .sf-btn:hover  { transform:translateY(-1px); }
        .sf-btn:active { transform:scale(.96); opacity:.9; }
        .sf-sig  { transition:background .15s,border-color .15s,color .15s,transform .15s; position:relative; overflow:visible; }
        .sf-sig:hover  { background:#eef2ff !important; border-color:#c7d2fe !important; }
        .sf-sig:active { transform:scale(.92); }
        .sf-sig-active { animation: sig-pop .32s cubic-bezier(.34,1.56,.64,1); }
        .sf-anim { animation:fadeUp .5s cubic-bezier(.2,.8,.2,1) both; }
        .sf-live-dot { animation: live-blink 1.6s infinite; }
        .sf-shimmer { background:linear-gradient(90deg,#f1f5f9 25%,#e9edf3 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
        .sf-mover { animation: moverFloat 3s ease-in-out infinite; }
        .sf-burst-text { position:absolute; left:50%; bottom:100%; white-space:nowrap; font-size:13px; font-weight:900; pointer-events:none; animation: burst-float 1.05s cubic-bezier(.2,.8,.2,1) forwards; z-index:40; text-shadow:0 1px 2px rgba(255,255,255,.9); }
        .sf-burst-ring { position:absolute; left:50%; top:0; width:44px; height:44px; border-radius:50%; pointer-events:none; animation: burst-ring .6s ease-out forwards; z-index:39; }
        .sf-readmore { cursor:pointer; font-weight:700; }
        .sf-mobile-fab { display:none; }

        @media(max-width:768px){
          .sf-filter-wrap { overflow-x:auto !important; flex-wrap:nowrap !important; -webkit-overflow-scrolling:touch; scrollbar-width:none; max-width:100%; }
          .sf-filter-wrap::-webkit-scrollbar { display:none; }
          .sf-sort-wrap   { width:100% !important; }
          .sf-sort-wrap select { width:100% !important; }
          .sf-launch      { width:100% !important; text-align:center !important; }
          .sf-toolbar-row { flex-direction:column !important; align-items:stretch !important; gap:10px !important; }
          .sf-grid        { grid-template-columns:1fr !important; width:100% !important; }
          .sf-card        { padding:20px 14px 16px 20px !important; max-width:100% !important; }
          .sf-cat-rail    { width:3px !important; }
          .sf-signals     { grid-template-columns:repeat(4,1fr) !important; gap:5px !important; }
          .sf-sig         { padding:6px 3px !important; font-size:9px !important; }
          .sf-sig span:first-child { font-size:13px !important; }
          .sf-rec-actions { position:sticky; bottom:0; background:linear-gradient(0deg,white 60%,transparent); padding-top:8px !important; }
          .sf-stats       { gap:10px !important; flex-wrap:wrap !important; }
          .sf-hero-title  { font-size:26px !important; }
          .sf-hero-sub    { font-size:13.5px !important; }
          .sf-hero-pad    { padding:24px 18px !important; }
          .sf-live-strip  { font-size:11px !important; }
          .sf-movers-strip{ padding:10px 12px !important; overflow-x:auto !important; max-width:100% !important; }
        }
        @media(max-width:380px){
          .sf-hero-title  { font-size:22px !important; }
          .sf-card        { padding:18px 12px 14px 16px !important; }
          .sf-signals     { gap:4px !important; }
          .sf-sig         { padding:5px 2px !important; font-size:8.5px !important; }
          .sf-rec-actions button { font-size:12px !important; padding:9px 6px !important; }
        }
      `}</style>
      {toast && (
        <div style={{ position:"fixed", top:18, right:18, zIndex:9999, background: toast.type==="success" ? "#10b981" : toast.type==="error" ? "#ef4444" : "#2563eb", color:"white", padding:"12px 18px", borderRadius:14, fontWeight:700, fontSize:14, boxShadow:"0 10px 30px rgba(0,0,0,.18)", maxWidth:"calc(100vw - 36px)" }}>
          {toast.msg}
        </div>
      )}
      <div style={{ maxWidth:1240, width:"100%", margin:"0 auto", padding:"24px 16px 60px", fontFamily:"Inter,system-ui,-apple-system,'Segoe UI',sans-serif", boxSizing:"border-box", overflowX:"hidden" }}>
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

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:14, flexWrap:"wrap" }}>
          <div className="sf-live-strip" style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:999, fontSize:12.5, color:"#166534", fontWeight:700, width:"fit-content" }}>
            <span className="sf-live-dot" style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a", display:"inline-block" }} />
            {liveCount} people active right now
          </div>
        </div>

        {/* Top Movers — today's fastest-rising capsules, at a glance */}
        {topMovers.length >= 3 && (
          <div className="sf-movers-strip" style={{ display:"flex", alignItems:"center", gap:12, background:"white", border:"1px solid #f1f5f9", borderRadius:18, padding:"12px 16px", marginBottom:20, overflowX:"auto" }}>
            <span style={{ fontSize:12, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em", flexShrink:0 }}>🔥 Top Movers</span>
            {topMovers.map((c, i) => (
              <a key={c.id} href={`#capsule-${c.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`capsule-${c.id}`)?.scrollIntoView({ behavior:"smooth", block:"center" }); }}
                style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, textDecoration:"none", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:999, padding:"5px 12px 5px 5px" }}>
                <div className="sf-mover" style={{ animationDelay:`${i * 0.15}s`, width:26, height:26, borderRadius:"50%", overflow:"hidden", flexShrink:0, background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:11, color:"#2563eb" }}>
                  {c.user?.avatar_url ? <img src={c.user.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (c.user?.full_name || "U")[0].toUpperCase()}
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:"#334155", maxWidth:110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</span>
              </a>
            ))}
          </div>
        )}

        <div className="sf-sticky-toolbar" style={{ marginBottom:20, paddingTop:10, paddingBottom:10 }}>
          <div className="sf-toolbar-row" style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <div className="sf-filter-wrap" style={{ display:"flex", gap:18, flex:1, minWidth:0, position:"relative" }}>
              {categoryOptions.map((opt, idx) => {
                const isActive = filterCategory === opt.display;
                const meta = opt.display !== "All" ? catOf(opt.display) : null;
                return (
                  <button key={`cat-${idx}`} className="sf-tab" onClick={() => setFilterCategory(opt.display === "All" ? "" : opt.display)}
                    style={{ color: isActive ? (meta?.color || "#0f172a") : "#94a3b8" }}>
                    {opt.display === "All" ? "All" : `${meta?.icon} ${opt.display.charAt(0).toUpperCase() + opt.display.slice(1)}`}
                    {isActive && <span className="sf-tab-underline" style={{ left:0, right:0, background: meta?.color || "#0f172a" }} />}
                  </button>
                );
              })}
            </div>
            <div className="sf-sort-wrap" style={{ flexShrink:0 }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
                style={{ padding:"9px 14px", borderRadius:12, border:"1.5px solid #e2e8f0", fontSize:13.5, background:"white", color:"#0f172a", cursor:"pointer", fontWeight:700, outline:"none" }}>
                <option value="trending">🔥 Trending</option>
                <option value="latest">📅 Latest</option>
                <option value="impact">🏆 Highest CraftRank</option>
              </select>
            </div>
            <Link href="/launch-skillcapsule" className="sf-launch sf-btn"
              style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", padding:"9px 18px", borderRadius:12, textDecoration:"none", fontWeight:800, fontSize:13.5, boxShadow:"0 6px 18px rgba(37,99,235,.3)", whiteSpace:"nowrap", flexShrink:0 }}>
              ✨ Launch Capsule
            </Link>
          </div>
        </div>

        {loading && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:16 }}>
            {Array.from({length:6}).map((_,i) => (
              <div key={i} style={{ background:"white", borderRadius:20, padding:20, border:"1px solid #f1f5f9", height:340 }}>
                <div className="sf-shimmer" style={{ borderRadius:99, height:36, width:36, marginBottom:12 }} />
                {[80, 120, 60, 40].map((w,j) => <div key={j} className="sf-shimmer" style={{ borderRadius:8, height:j===1?16:10, width:`${w}%`, marginBottom:10 }} />)}
              </div>
            ))}
          </div>
        )}
        {!loading && capsules.length === 0 && (
          <div style={{ background:"white", borderRadius:24, padding:"56px 24px", textAlign:"center", border:"1px dashed #dbe3ee", marginTop:8 }}>
            <div style={{ fontSize:48, marginBottom:14 }}>🎪</div>
            <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:900, color:"#0f172a" }}>The Showfloor is empty</h3>
            <p style={{ margin:"0 0 22px", color:#64748b", fontSize:15, lineHeight:1.7 }}>No SkillCapsules yet. Be the first to show your skills.</p>
            <Link href="/launch-skillcapsule" style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", padding:"13px 28px", borderRadius:14, textDecoration:"none", fontWeight:800, fontSize:15, boxShadow:"0 8px 20px rgba(37,99,235,.3)" }}>
              ✨ Launch First Capsule →
            </Link>
          </div>
        )}
        {!loading && capsules.length > 0 && (
          <div className="sf-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:16 }}>
            {capsules.map((capsule) => (
              <FeedCard
                key={capsule.id}
                capsule={capsule}
                highlighted={highlightedCapsuleId === capsule.id}
                userProfile={userProfile}
                sentSignals={sentSignals}
                bursts={bursts}
                busy={actionInProgress !== null}
                expanded={expandedIds.has(capsule.id)}
                onToggleExpand={() => toggleExpanded(capsule.id)}
                onSignal={handleSignal}
                onSpotlight={handleSpotlight}
                onCall={handleCall}
                cardRef={cardRefCallback(capsule.id)}
              />
            ))}
          </div>
        )}
        {loadingMore && (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid #dbe3ee", borderTopColor:"#2563eb", margin:"0 auto", animation:"spin 0.8s linear infinite" }} />
          </div>
        )}
        {hasMore && !loading && !loadingMore && capsules.length > 0 && (
          <div style={{ textAlign:"center", marginTop:28 }}>
            <button className="sf-btn" onClick={() => fetchCapsules(false)}
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

function FeedCard({
  capsule, highlighted, userProfile, sentSignals, bursts, busy, expanded, onToggleExpand,
  onSignal, onSpotlight, onCall, cardRef,
}: {
  capsule: Capsule;
  highlighted: boolean;
  userProfile: Profile | null;
  sentSignals: Set<string>;
  bursts: Burst[];
  busy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSignal: (capsuleId: string, signalType: string) => void;
  onSpotlight: (capsuleId: string, candidateId: string) => void;
  onCall: (capsuleId: string, candidateId: string) => void;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const { ref: revealRef, visible } = useRevealOnScroll();
  const cat  = catOf(capsule.category);
  const diff = capsule.difficulty ? diffOf(capsule.difficulty) : null;
  const sigs = Object.values(capsule.signal_counts || {}).reduce((a: number, b: number) => a + b, 0);
  const userPoints = capsule.user?.total_points || 0;
  const userTier   = getTierFromPoints(userPoints);
  const tierColor  = getTierColor(userTier);
  const isNew      = (Date.now() - new Date(capsule.created_at).getTime()) < 1000 * 60 * 60 * 24;
  const isLong     = capsule.description.length > 120;

  return (
    <div
      ref={(el) => { revealRef.current = el; cardRef(el); }}
      id={`capsule-${capsule.id}`}
      className={`sf-card sf-anim ${visible ? "sf-card-visible" : ""}`}
      style={{ background:"white", borderRadius:20, padding:"22px 18px 18px 24px", boxShadow:"0 6px 22px rgba(2,6,23,.06)", border: highlighted ? "1.5px solid #6366f1" : "1px solid #f1f5f9", display:"flex", flexDirection:"column", animation: highlighted ? "nf-glow 1.3s ease 2" : undefined }}>

      <span className="sf-cat-rail" style={{ background:`linear-gradient(180deg,${cat.color},${cat.color}66)` }} />

      {isNew && (
        <span style={{ position:"absolute", top:14, right:14, background:"#fef3c7", color:"#92400e", fontSize:10, fontWeight:800, padding:"3px 9px", borderRadius:999, letterSpacing:"0.04em" }}>
          ✨ NEW
        </span>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <div className="sf-avatar-ring" style={{ background:`linear-gradient(135deg,${tierColor},${tierColor}66)`, flexShrink:0 }}>
            {capsule.user?.avatar_url
              ? <img src={capsule.user.avatar_url} alt="" style={{ width:34, height:34, borderRadius:"50%", objectFit:"cover", display:"block", border:"2px solid white" }} />
              : <div style={{ width:34, height:34, borderRadius:"50%", background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:tierColor, fontSize:14 }}>
                  {(capsule.user?.full_name || "U")[0].toUpperCase()}
                </div>}
          </div>
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
      <p style={{ margin:"0 0 8px", color:"#64748b", fontSize:13, lineHeight:1.75 }}>
        {expanded || !isLong ? capsule.description : capsule.description.slice(0, 120) + "…"}
      </p>
      {isLong && (
        <span className="sf-readmore" onClick={onToggleExpand} style={{ color:"#2563eb", fontSize:12.5, marginBottom:10, display:"inline-block" }}>
          {expanded ? "Show less ▲" : "Read more ▼"}
        </span>
      )}

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
        {diff && <span style={{ background:diff.bg, color:diff.color, padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:800, textTransform:"capitalize" }}>{capsule.difficulty}</span>}
        {capsule.skills_used?.slice(0,3).map((s, skillIdx) => (
          <span key={`${s}-${skillIdx}`} style={{ background:"#f1f5f9", color:"#334155", border:"1px solid #e2e8f0", padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:700 }}>{s}</span>
        ))}
        {(capsule.skills_used?.length || 0) > 3 && (
          <span style={{ background:"#f1f5f9", color:"#94a3b8", padding:"3px 9px", borderRadius:999, fontSize:11, fontWeight:700 }}>+{capsule.skills_used!.length - 3}</span>
        )}
      </div>

      <SignalCompositionBar counts={capsule.signal_counts || {}} />

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
              const capsuleBursts = bursts.filter(b => b.capsuleId === capsule.id && b.label === sig.label);
              return (
                <button key={sig.key} className={`sf-sig sf-btn ${sent ? "sf-sig-active" : ""}`}
                  onClick={() => onSignal(capsule.id, sig.key)}
                  disabled={busy}
                  aria-pressed={sent}
                  title={sent ? `Remove "${sig.label}" signal` : `Send "${sig.label}" signal`}
                  style={{ background: sent ? "#eef2ff" : "#f8fafc", border:`1.5px solid ${sent ? sig.color : "#e2e8f0"}`, borderRadius:10, padding:"7px 6px", fontSize:10, fontWeight:800, color: sent ? sig.color : "#475569", cursor: busy ? "not-allowed" : "pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, opacity: busy ? 0.6 : 1 }}>
                  <span style={{ fontSize:14 }}>{sig.icon}</span>
                  <span style={{ lineHeight:1.2, textAlign:"center" }}>{sig.label}</span>
                  {count > 0 && <span style={{ background: sent ? sig.color : "#e2e8f0", color: sent ? "white" : "#64748b", borderRadius:999, padding:"1px 5px", fontSize:9, fontWeight:900 }}>{count}</span>}
                  {capsuleBursts.map(b => (
                    <span key={b.id}>
                      <span className="sf-burst-ring" style={{ background:`radial-gradient(circle,${sig.color}55,transparent 70%)` }} />
                      <span className="sf-burst-text" style={{ color: sig.color }}>+1 {b.icon}</span>
                    </span>
                  ))}
                </button>
              );
            })}
          </div>
          {userProfile.role === "company" && (
            <div className="sf-rec-actions" style={{ display:"flex", gap:8, marginBottom:10 }}>
              <button className="sf-btn" onClick={() => onSpotlight(capsule.id, capsule.user_id)} disabled={busy}
                style={{ flex:1, background:"linear-gradient(135deg,#fef3c7,#fde68a)", border:"1px solid #fde68a", borderRadius:12, padding:"10px 8px", fontSize:13, fontWeight:800, color:"#92400e", cursor: busy ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, opacity: busy ? 0.6 : 1 }}>
                🔦 Spotlight
              </button>
              <button className="sf-btn" onClick={() => onCall(capsule.id, capsule.user_id)} disabled={busy}
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
}

// ── Wrap in Suspense to satisfy Next.js static rendering ──────────
export default function TheStage() {
  return (
    <Suspense fallback={
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", fontFamily:"Inter,system-ui,sans-serif" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"4px solid #dbe3ee", borderTopColor:"#2563eb", animation:"spin 0.8s linear infinite", marginBottom:16 }} />
        <p style={{ color:"#64748b", fontWeight:700, margin:0 }}>Loading The Showfloor…</p>
      </div>
    }>
      <TheStageContent />
    </Suspense>
  );
}