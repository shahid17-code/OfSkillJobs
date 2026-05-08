"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = { id: string; email?: string };

// ── Animated counter hook ──────────────────────────────────────────
function useCounter(target: number, duration = 1600, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// ── Role-block modal ───────────────────────────────────────────────
function RoleBlockModal({ role, action, onClose }: { role: string; action: "hire" | "seek"; onClose: () => void }) {
  const isCompany = role === "company";
  const blockedAction = action === "hire" ? "hire talent" : "get hired";
  const currentRole = isCompany ? "Company" : "Job Seeker";
  const suggestion = isCompany
    ? "To apply for jobs, create a separate job seeker account."
    : "To post jobs, create a separate company account.";
  const redirectLabel = isCompany ? "Go to Company Dashboard" : "Go to My Profile";
  const redirectPath = isCompany ? "/company/dashboard" : "/profile/edit";
  const router = useRouter();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 24, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 30px 80px rgba(0,0,0,0.28)" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 16 }}>🔒</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>You're logged in as a {currentRole}</h3>
        <p style={{ margin: "0 0 6px", color: "#475569", fontSize: 15, lineHeight: 1.6 }}>
          You can't <strong>{blockedAction}</strong> from this account. {suggestion}
        </p>
        <p style={{ margin: "0 0 24px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#854d0e", fontWeight: 600 }}>
          💡 Each account type has its own dedicated dashboard.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, background: "#0f172a", color: "white", border: "none", padding: "12px 16px", borderRadius: 14, fontWeight: 800, cursor: "pointer", fontSize: 14 }}
            onClick={() => { router.push(redirectPath); onClose(); }}>
            {redirectLabel}
          </button>
          <button style={{ flex: 1, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: 14, fontWeight: 800, cursor: "pointer", fontSize: 14 }}
            onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomeClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleBlock, setRoleBlock] = useState<{ action: "hire" | "seek" } | null>(null);

  // Real stats from DB
  const [liveStats, setLiveStats] = useState({ jobs: 0, companies: 0, applications: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  // Animated counters
  const [countStart, setCountStart] = useState(false);
  const jobCount = useCounter(liveStats.jobs, 1400, countStart);
  const companyCount = useCounter(liveStats.companies, 1600, countStart);
  const appCount = useCounter(liveStats.applications, 1800, countStart);

  // ── Rotating real jobs ──
  interface Job {
    id: string;
    title: string;
    company_id: string;
    company_name?: string;
    location: string | null;
    salary_min: number | null;
    salary_max: number | null;
    task_title: string | null;
    slug: string;
  }
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [currentJobSet, setCurrentJobSet] = useState<Job[]>([]);
  const [jobRotateIndex, setJobRotateIndex] = useState(0);
  const [jobFade, setJobFade] = useState(true);

  // Fetch real stats and real jobs
  useEffect(() => {
    async function fetchStats() {
      const [jobRes, companyRes, appRes] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "company"),
        supabase.from("job_applications").select("id", { count: "exact", head: true }),
      ]);
      setLiveStats({
        jobs: jobRes.count || 0,
        companies: companyRes.count || 0,
        applications: appRes.count || 0,
      });
      setStatsLoaded(true);
    }
    fetchStats();

    // Fetch all active jobs for rotation
    async function fetchJobs() {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id, title, company_id, location, salary_min, salary_max, task_title, slug,
          users:company_id ( company_name )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (!error && data) {
        const formatted = data.map((job: any) => ({
          id: job.id,
          title: job.title,
          company_id: job.company_id,
          company_name: job.users?.company_name || "Company",
          location: job.location,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          task_title: job.task_title,
          slug: job.slug,
        }));
        setAllJobs(formatted);
        if (formatted.length >= 3) setCurrentJobSet(formatted.slice(0, 3));
        else setCurrentJobSet(formatted);
      }
    }
    fetchJobs();
  }, []);

  // Rotate jobs every 7 seconds (if at least 3 jobs exist)
  useEffect(() => {
    if (allJobs.length < 3) return;
    const interval = setInterval(() => {
      setJobFade(false);
      setTimeout(() => {
        const nextIndex = (jobRotateIndex + 3) % allJobs.length;
        setCurrentJobSet(allJobs.slice(nextIndex, nextIndex + 3));
        setJobRotateIndex(nextIndex);
        setJobFade(true);
      }, 200);
    }, 7000);
    return () => clearInterval(interval);
  }, [allJobs, jobRotateIndex]);

  // Auth init (unchanged)
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
        setRole(data?.role || null);
      }
      setLoading(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        supabase.from("users").select("role").eq("id", session.user.id).single()
          .then(({ data }) => setRole(data?.role || null));
      } else {
        setRole(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Intersection observer for counters
  useEffect(() => {
    if (!statsLoaded) return;
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setCountStart(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [statsLoaded]);

  function handleGetHired() {
    if (user && role === "company") { setRoleBlock({ action: "seek" }); return; }
    localStorage.setItem("selectedRole", "developer");
    router.push(user ? "/profile/edit" : "/signup");
  }

  function handleHireTalent() {
    if (user && role !== "company" && role !== null) { setRoleBlock({ action: "hire" }); return; }
    localStorage.setItem("selectedRole", "company");
    if (user && role === "company") router.push("/company/jobs/new");
    else router.push("/signup");
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid #e2e8f0", borderTopColor: "#2563eb", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const isLoggedIn = !!user;
  const isSeeker = isLoggedIn && role !== "company";
  const isCompany = isLoggedIn && role === "company";

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeJob { 0% { opacity:0; transform:translateY(12px); } 100% { opacity:1; transform:translateY(0); } }

        *,*::before,*::after { box-sizing:border-box; }
        html,body { overflow-x:hidden !important; }

        .osj-btn { transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease; cursor:pointer; }
        .osj-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(37,99,235,.28); }
        .osj-btn:active { transform:scale(.97); opacity:.9; }
        .osj-card { transition:transform .22s ease,box-shadow .22s ease; }
        .osj-card:hover { transform:translateY(-4px); box-shadow:0 20px 48px rgba(2,6,23,.1); }
        .osj-fade { animation:fadeUp .6s ease both; }
        .float-a { animation:floatA 4s ease-in-out infinite; }
        .float-b { animation:floatB 5.5s ease-in-out infinite; }

        .job-rotate-enter { animation: fadeJob 0.4s ease-out forwards; }

        @media(max-width:768px){
          .hero-wrap   { flex-direction:column !important; margin:36px 0 56px !important; gap:28px !important; }
          .hero-title  { font-size:34px !important; }
          .hero-sub    { font-size:15px !important; }
          /* ✅ Hero visual now visible on mobile (removed display:none) */
          .hero-visual { display:block !important; max-width:100% !important; margin-top:20px !important; }
          .btn-group   { flex-direction:column !important; }
          .btn-group button,.btn-group a { width:100% !important; text-align:center !important; }
          .stats-grid  { grid-template-columns:1fr 1fr !important; gap:12px !important; }
          .flow-grid   { flex-direction:column !important; }
          .flow-arrow  { display:none !important; }
          .flow-arrow-m{ display:block !important; }
          .diff-grid   { grid-template-columns:1fr !important; }
          .grid3       { grid-template-columns:1fr !important; }
          .section-alt { padding:32px 18px !important; }
          .cta-section { padding:48px 20px !important; }
          .community-bar { flex-direction:column !important; align-items:flex-start !important; gap:14px !important; }
          .trust-grid  { grid-template-columns:1fr !important; }
          .brand-name  { font-size:24px !important; }
          .tabs-row    { overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
          .tabs-row::-webkit-scrollbar { display:none; }
          .hero-badge  { flex-wrap:wrap !important; gap:6px !important; }
          .jobs-rotate-grid { grid-template-columns:1fr !important; gap:16px !important; }
        }
        @media(min-width:769px){ .flow-arrow-m { display:none !important; } }
      `}</style>

      {/* Role block modal */}
      {roleBlock && role && (
        <RoleBlockModal role={role} action={roleBlock.action} onClose={() => setRoleBlock(null)} />
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", fontFamily: "Inter,system-ui,-apple-system,'Segoe UI',sans-serif" }}>

        {/* ══════════ HEROsj ══════════ */}
        <div className="hero-wrap osj-fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 56, margin: "60px 0 80px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>

            {/* Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <img src="/favicon.png" alt="OfSkillJob" width={46} height={46} style={{ borderRadius: 13, boxShadow: "0 6px 18px rgba(37,99,235,.25)" }} />
              <span className="brand-name" style={{ fontSize: 28, fontWeight: 900, background: "linear-gradient(135deg,#2563eb,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.03em" }}>OfSkillJob</span>
            </div>

            {/* Logged-in context badge */}
            {isLoggedIn && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: isCompany ? "#f0fdf4" : "#eff6ff", border: `1px solid ${isCompany ? "#bbf7d0" : "#bfdbfe"}`, color: isCompany ? "#166534" : "#1d4ed8", padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                {isCompany ? "🏢 Logged in as Company" : "👤 Logged in as Job Seeker"}
                {isCompany && <Link href="/company/dashboard" style={{ color: "#166534", fontWeight: 800, textDecoration: "underline", marginLeft: 4 }}>Dashboard →</Link>}
                {isSeeker && <Link href="/profile/edit" style={{ color: "#1d4ed8", fontWeight: 800, textDecoration: "underline", marginLeft: 4 }}>My Profile →</Link>}
              </div>
            )}

            {/* Eyebrow */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4338ca", padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4f46e5", animation: "pulse 2s infinite", display: "inline-block", flexShrink: 0 }} />
              India's skill-first hiring platform
            </div>

            <h1 className="hero-title" style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.04em", margin: "0 0 20px", color: "#0f172a" }}>
              Show Skills.{" "}
              <span style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Get Hired.</span>
            </h1>

            <p className="hero-sub" style={{ fontSize: 18, color: "#475569", lineHeight: 1.75, margin: "0 0 36px", maxWidth: 500 }}>
              The only platform where you <strong style={{ color: "#0f172a" }}>prove your skills with real tasks</strong> before you apply. Companies Post Challenges — You complete them — then apply — no black‑hole resumes, no fake listings.
            </p>

            <div className="btn-group" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button onClick={handleGetHired} className="osj-btn" style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", padding: "14px 28px", borderRadius: 16, border: "none", fontWeight: 800, fontSize: 16, boxShadow: "0 8px 24px rgba(37,99,235,.35)" }}>
                {isSeeker ? "Update My Profile →" : "Get Hired Free →"}
              </button>
              <button onClick={handleHireTalent} className="osj-btn" style={{ background: "white", color: "#0f172a", padding: "14px 28px", borderRadius: 16, border: "1.5px solid #e2e8f0", fontWeight: 800, fontSize: 16, boxShadow: "0 4px 12px rgba(2,6,23,.06)" }}>
                {isCompany ? "Post a Job →" : "Hire Talent →"}
              </button>
            </div>

            {/* Social proof */}
            <div className="hero-badge" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, flexWrap: "nowrap" }}>
              <div style={{ display: "flex" }}>
                {["🧑‍💻", "👩‍🎨", "🧑‍💼", "👨‍🔬", "👩‍💻"].map((e, i) => (
                  <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", background: "#eef2ff", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, marginLeft: i > 0 ? -8 : 0, flexShrink: 0 }}>{e}</div>
                ))}
              </div>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>
                {statsLoaded && liveStats.applications > 0 ? `${liveStats.applications}+ applications submitted` : "Join the community today"}
              </span>
            </div>
          </div>

          {/* Hero visual — skill cards (now visible on mobile) */}
          <div className="hero-visual" style={{ flex: 1, maxWidth: 440 }}>
            <div style={{ position: "relative", padding: "20px 0" }}>
              <div className="float-a" style={{ background: "white", borderRadius: 20, padding: "18px 20px", boxShadow: "0 12px 36px rgba(2,6,23,.1)", border: "1px solid #f1f5f9", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#dbeafe,#eff6ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💻</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, color: "#0f172a", fontSize: 14 }}>Task submitted</p>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Frontend challenge · 2 hours ago</p>
                  </div>
                  <div style={{ marginLeft: "auto", background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>✓ Done</div>
                </div>
                <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999 }}>
                  <div style={{ width: "87%", height: "100%", background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: 999 }} />
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Skill score: 87/100</p>
              </div>

              <div className="float-b" style={{ background: "white", borderRadius: 20, padding: "18px 20px", boxShadow: "0 12px 36px rgba(2,6,23,.1)", border: "1px solid #f1f5f9", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#dcfce7,#f0fdf4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎯</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, color: "#0f172a", fontSize: 14 }}>Application reviewed</p>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Hiring team opened your Drive</p>
                  </div>
                  <div style={{ background: "#dbeafe", color: "#1d4ed8", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>Reviewed</div>
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 20, padding: "18px 20px", boxShadow: "0 12px 36px rgba(2,6,23,.1)", border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#fef3c7,#fffbeb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⭐</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, color: "#0f172a", fontSize: 14 }}>Shortlisted!</p>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>You're in the top 5 candidates</p>
                  </div>
                  <div style={{ background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>⭐ Top 5</div>
                </div>
              </div>

              <div style={{ position: "absolute", top: 0, right: -10, background: "linear-gradient(135deg,#7c3aed,#9333ea)", color: "white", borderRadius: 14, padding: "10px 14px", fontSize: 13, fontWeight: 800, boxShadow: "0 8px 20px rgba(124,58,237,.35)", transform: "rotate(3deg)" }}>
                🏆 +10 pts
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ LIVE STATS (real data) ══════════ */}
        <div ref={statsRef} className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 80 }}>
          {[
            { value: companyCount, suffix: "+", label: "Verified Companies", icon: "🏢", color: "#eef2ff", sub: "All manually reviewed" },
            { value: jobCount, suffix: "+", label: "Active Job Listings", icon: "💼", color: "#f0fdf4", sub: statsLoaded ? "Updated live" : "Loading…" },
            { value: appCount, suffix: "+", label: "Applications Submitted", icon: "📥", color: "#fef3c7", sub: "Real candidates, real tasks" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 20, padding: "24px 20px", textAlign: "center", boxShadow: "0 4px 16px rgba(2,6,23,.05)", border: "1px solid #f1f5f9" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>{s.icon}</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.05em", lineHeight: 1 }}>
                {statsLoaded ? `${s.value}${s.suffix}` : <span style={{ background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>—</span>}
              </div>
              <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 700, margin: "6px 0 4px" }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ══════════ HOW IT WORKS ══════════ */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>How it works</p>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: "0 0 12px" }}>Apply with proof, not promises</h2>
            <p style={{ color: "#64748b", fontSize: 16, margin: 0, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>OfSkillJob replaces keyword-matched resumes with verified skill output.</p>
          </div>
          <div className="flow-grid" style={{ display: "flex", alignItems: "stretch", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {[
              { n: "01", icon: "📋", title: "Company posts a skill task", desc: "Every job listing on OfSkillJob includes a real challenge — a coding problem, design brief, marketing plan, or business scenario." },
              { n: "02", icon: "💪", title: "You complete and submit", desc: "Upload your solution via Google Drive or a public link. No account needed to see tasks. No fees to apply." },
              { n: "03", icon: "🎯", title: "Company reviews & hires", desc: "Hiring teams see your actual work output. No resume black-holes. You get notified when your Drive is opened." },
            ].map((step, i) => (
              <div key={i} style={{ display: "contents" }}>
                <div className="osj-card" style={{ flex: 1, minWidth: 240, background: "white", borderRadius: 24, padding: "32px 24px", boxShadow: "0 8px 24px rgba(2,6,23,.06)", border: "1px solid #f1f5f9", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -8, right: 14, fontSize: 88, fontWeight: 900, color: "#f8fafc", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>{step.n}</div>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg,#eef2ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 18 }}>{step.icon}</div>
                  <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em" }}>{step.title}</h3>
                  <p style={{ margin: 0, color: "#64748b", lineHeight: 1.75, fontSize: 14 }}>{step.desc}</p>
                </div>
                {i < 2 && (
                  <>
                    <div className="flow-arrow" style={{ fontSize: 26, color: "#c7d2fe", fontWeight: 900, alignSelf: "center", flexShrink: 0 }}>→</div>
                    <div className="flow-arrow-m" style={{ textAlign: "center", fontSize: 22, color: "#c7d2fe", margin: "4px 0" }}>↓</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ TRUST ══════════ */}
        <div style={{ marginBottom: 80, background: "linear-gradient(135deg,#f0f9ff,#eef2ff)", borderRadius: 28, padding: "40px 32px", border: "1px solid #dbeafe" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>No fake promises</p>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: "0 0 10px" }}>Why candidates trust OfSkillJob</h2>
            <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>We built this because we were frustrated with fake job listings and ignored applications.</p>
          </div>
          <div className="trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            {[
              { icon: "💸", title: "100% Free to Apply", desc: "No subscription, no premium tier, no hidden charges. Every feature is free for job seekers — always." },
              { icon: "🔍", title: "Manually Verified Listings", desc: "We review every job before it goes live. Fake, scam, and unpaid internship traps are removed." },
              { icon: "🔒", title: "Zero Sensitive Data", desc: "We never ask for Aadhaar, PAN, bank details, or passwords. Your profile data is encrypted end-to-end." },
              { icon: "📊", title: "Real-Time Transparency", desc: "You see exactly when a company opens your resume or views your profile. No more wondering." },
            ].map((t, i) => (
              <div key={i} className="osj-card" style={{ background: "white", borderRadius: 20, padding: "22px 20px", boxShadow: "0 4px 14px rgba(2,6,23,.06)", border: "1px solid #e8eef5" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{t.title}</h3>
                <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.65 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ DIFFERENTIATORS ══════════ */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>Why we're different</p>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: "0 0 10px" }}>Not just another job board</h2>
            <p style={{ color: "#64748b", fontSize: 16, margin: 0 }}>OfSkillJob was built to fix what's broken with traditional hiring.</p>
          </div>
          <div className="diff-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            {[
              { icon: "✅", bg: "#dcfce7", title: "Task‑First Screening", desc: "You submit real work before applying. Companies see what you can actually do — not just what you claim on a resume." },
              { icon: "🏆", bg: "#fef3c7", title: "Points & Leaderboard", desc: "Earn points for completing tasks, applying, and daily streaks. A higher rank = more visibility to recruiters." },
              { icon: "📊", bg: "#dbeafe", title: "Full Application Tracking", desc: "Know when your profile is viewed, resume opened, or you're shortlisted — in real time." },
              { icon: "🎥", bg: "#fdf4ff", title: "Video Intro = 2× Callbacks", desc: "Add a 60-second intro video. Recruiters consistently prefer candidates they can see before interviewing." },
            ].map((d, i) => (
              <div key={i} className="osj-card" style={{ background: "white", borderRadius: 22, padding: "28px 24px", boxShadow: "0 8px 24px rgba(2,6,23,.06)", border: "1px solid #f1f5f9" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: d.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 18 }}>{d.icon}</div>
                <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>{d.title}</h3>
                <p style={{ margin: 0, color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ 3-STEP JOURNEY ══════════ */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>For job seekers</p>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>From signup to hired in 3 steps</h2>
          </div>
          <div className="grid3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            {[
              { icon: "📝", step: "Step 1", title: "Build Your Profile", desc: "Add your skills, experience, projects, and an optional short video intro. Takes under 5 minutes and it's completely free." },
              { icon: "🏆", step: "Step 2", title: "Complete a Task", desc: "Browse jobs, pick a challenge that matches your skills (coding, design, writing, sales…), and upload your solution." },
              { icon: "🚀", step: "Step 3", title: "Get Discovered & Hired", desc: "Companies see your verified task output first. You stand out because your work speaks for itself." },
            ].map((s, i) => (
              <div key={i} className="osj-card" style={{ background: "white", borderRadius: 24, padding: "32px 28px", boxShadow: "0 8px 24px rgba(2,6,23,.06)", border: "1px solid #f1f5f9", position: "relative" }}>
                <div style={{ position: "absolute", top: 20, right: 20, fontSize: 11, fontWeight: 800, color: "#2563eb", background: "#eef2ff", padding: "3px 10px", borderRadius: 999, letterSpacing: "0.04em" }}>{s.step}</div>
                <div style={{ width: 58, height: 58, borderRadius: 18, background: "linear-gradient(135deg,#eef2ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, marginBottom: 20 }}>{s.icon}</div>
                <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>{s.title}</h3>
                <p style={{ margin: 0, color: "#64748b", lineHeight: 1.75, fontSize: 14 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ ROTATING TOP JOBS (REAL JOBS) ══════════ */}
        {allJobs.length >= 3 && (
          <div style={{ marginBottom: 80 }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>Trending Now</p>
              <h2 style={{ fontSize: 36, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>Top tasks hiring now</h2>
              <p style={{ color: "#64748b", fontSize: 15, marginTop: 10 }}>These roles change every few seconds – updated in real time</p>
            </div>
            <div className={`jobs-rotate-grid ${jobFade ? 'job-rotate-enter' : ''}`} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, transition: "opacity 0.2s" }}>
              {currentJobSet.map(job => (
                <div key={job.id} className="osj-card" style={{ background: "white", borderRadius: 24, padding: "24px 20px", boxShadow: "0 8px 24px rgba(2,6,23,.08)", border: "1px solid #eef2f7", display: "flex", flexDirection: "column", height: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>{job.title}</h3>
                    <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>🔥 Hot</span>
                  </div>
                  <p style={{ margin: "0 0 6px", color: "#475569", fontSize: 14, fontWeight: 700 }}>{job.company_name}</p>
                  <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>📍 {job.location || "Remote / India"}</p>
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", margin: "10px 0 14px", border: "1px solid #e2e8f0" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#475569", fontWeight: 600 }}>🎯 Skill task:</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{job.task_title || "Complete a short challenge"}</p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#2563eb" }}>₹{job.salary_min?.toLocaleString()} - ₹{job.salary_max?.toLocaleString()}</span>
                    <Link href={`/jobs/${job.slug}`}>
                      <button className="osj-btn" style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>view job →</button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", marginTop: 20, color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>✨ These roles rotate every 7 seconds — sign up to apply for real jobs</p>
          </div>
        )}

        {/* ══════════ LIVE JOB CATEGORIES ══════════ */}
        <div className="section-alt" style={{ background: "linear-gradient(160deg,#f8fafc,#f1f5f9)", borderRadius: 32, padding: "48px 32px", textAlign: "center", marginBottom: 80, border: "1px solid #e8eef5" }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 10px" }}>Open roles</p>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: "0 0 12px" }}>Jobs Across Every Industry</h2>
          <p style={{ color: "#64748b", fontSize: 15, margin: "0 0 36px" }}>From IT and design to sales, marketing, and operations — real tasks, real roles.</p>
          <div className="tabs-row" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 36 }}>
            {[
              { icon: "💻", label: "IT & Software" },
              { icon: "📊", label: "Data Science" },
              { icon: "🎨", label: "Graphic Design" },
              { icon: "📈", label: "Digital Marketing" },
              { icon: "💼", label: "Sales & BD" },
              { icon: "✍️", label: "Content Writing" },
              { icon: "📞", label: "Customer Support" },
              { icon: "🔧", label: "Project Management" },
            ].map((pill, i) => (
              <div key={i} style={{ background: "white", padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 700, color: "#334155", boxShadow: "0 2px 8px rgba(2,6,23,.06)", border: "1px solid #e8eef5", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{pill.icon}</span>{pill.label}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <Link href="/jobs">
              <button className="osj-btn" style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", padding: "13px 28px", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: "pointer", border: "none", boxShadow: "0 8px 20px rgba(37,99,235,.3)" }}>Browse All Jobs →</button>
            </Link>
            {statsLoaded && liveStats.jobs > 0 && (
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{liveStats.jobs} active listing{liveStats.jobs !== 1 ? "s" : ""} right now</span>
            )}
          </div>
        </div>

        {/* ══════════ COMMUNITY ══════════ */}
        <div className="community-bar" style={{ background: "white", borderRadius: 24, padding: "24px 28px", marginBottom: 80, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, boxShadow: "0 4px 16px rgba(2,6,23,.05)", border: "1px solid #f1f5f9" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#0f172a" }}>Stay in the loop</p>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Job alerts, tips, and community support — join us on your favourite platform.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { icon: "🤝", label: "Reddit", href: "https://reddit.com/u/OfSkillJob", bg: "#fff0eb", color: "#c2410c" },
              { icon: "✈️", label: "Telegram", href: "https://t.me/OfSkillJob", bg: "#eff6ff", color: "#1d4ed8" },
              { icon: "🔗", label: "LinkedIn", href: "https://www.linkedin.com/company/ofskilljob", bg: "#eff6ff", color: "#0369a1" },
            ].map((s, i) => (
              <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="osj-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: s.bg, color: s.color, padding: "9px 16px", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: 14 }}>
                <span>{s.icon}</span>{s.label}
              </a>
            ))}
          </div>
        </div>

        {/* ══════════ CTA ══════════ */}
        <div className="cta-section" style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%)", color: "white", borderRadius: 32, padding: "72px 40px", textAlign: "center", marginBottom: 64, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(124,58,237,.18)", filter: "blur(48px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(37,99,235,.2)", filter: "blur(40px)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "#93c5fd", padding: "6px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
              {isLoggedIn ? (isCompany ? "🏢 Welcome back, " + (role || "Company") : "👋 Welcome back") : "🚀 Ready to start?"}
            </div>
            <h2 style={{ margin: "0 0 16px", fontSize: 40, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.15 }}>
              {isLoggedIn ? "Keep building your career." : "Your next opportunity is one task away."}
            </h2>
            <p style={{ margin: "0 0 40px", color: "#bfdbfe", fontSize: 17, lineHeight: 1.75, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              {isLoggedIn
                ? isCompany
                  ? "Review your applicants, post new jobs, and hire based on real skill proof."
                  : "Update your profile, browse open tasks, and get discovered by companies that value skill."
                : "Join thousands of professionals who skipped the resume game and got hired by showing what they can do."}
            </p>
            <div className="btn-group" style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <button onClick={handleGetHired} className="osj-btn" style={{ background: "white", color: "#0f172a", padding: "14px 32px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: 16, boxShadow: "0 8px 28px rgba(0,0,0,.25)" }}>
                {isSeeker ? "Update My Profile →" : "Get Hired Free →"}
              </button>
              <button onClick={handleHireTalent} className="osj-btn" style={{ background: "rgba(255,255,255,.1)", color: "white", padding: "14px 32px", borderRadius: 16, border: "1.5px solid rgba(255,255,255,.2)", fontWeight: 800, fontSize: 16 }}>
                {isCompany ? "Post a New Job" : "Hire Talent"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}