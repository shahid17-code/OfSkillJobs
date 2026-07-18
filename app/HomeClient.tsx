"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Job { id: string; title: string; location?: string; slug?: string; company_name?: string; salary_min?: number; salary_max?: number; }
interface Capsule { id: string; title: string; skill_impact_score?: number; category?: string; user_full_name?: string; username?: string; avatar_url?: string; }

const MOCK_JOBS: Job[] = [
  { id: "1", title: "Senior Frontend Engineer", location: "Remote · India", company_name: "Nexora", salary_min: 1200000, salary_max: 1800000 },
  { id: "2", title: "Full Stack Developer", location: "Bengaluru, KA", company_name: "TechFlow", salary_min: 1000000, salary_max: 1500000 },
  { id: "3", title: "Product Designer", location: "Mumbai, MH", company_name: "Studio Nine", salary_min: 800000, salary_max: 1200000 },
  { id: "4", title: "Backend Engineer", location: "Pune, MH", company_name: "Orbital Labs", salary_min: 950000, salary_max: 1400000 },
  { id: "5", title: "ML Engineer", location: "Remote · India", company_name: "DataForge", salary_min: 1400000, salary_max: 2000000 },
  { id: "6", title: "DevOps Engineer", location: "Hyderabad, TG", company_name: "CloudNine", salary_min: 900000, salary_max: 1300000 },
];
const MOCK_CAPSULES: Capsule[] = [
  { id: "1", title: "Weather App Dashboard", skill_impact_score: 88, category: "development", user_full_name: "Alex Chen", username: "alexc" },
  { id: "2", title: "E-commerce Checkout Flow", skill_impact_score: 92, category: "development", user_full_name: "Tanya Ghosh", username: "tanyag" },
  { id: "3", title: "Real-time Chat App", skill_impact_score: 79, category: "development", user_full_name: "Jashn Kaswan", username: "jashnk" },
  { id: "4", title: "Data Visualization Dashboard", skill_impact_score: 85, category: "design", user_full_name: "Maya Rao", username: "mayar" },
  { id: "5", title: "API Performance Optimizer", skill_impact_score: 94, category: "development", user_full_name: "Sam Patel", username: "samp" },
  { id: "6", title: "Mobile-first Portfolio", skill_impact_score: 81, category: "design", user_full_name: "Yash Lal", username: "yashl" },
];
const CAT_ICON: Record<string, string> = { design: "🎨", development: "💻", writing: "✍️", sales: "💼", marketing: "📈", research: "🔬", communication: "💬" };
const initials = (name?: string, username?: string) => (name || username || "??").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

/* ─── Global CSS ─── */
const GLOBAL_CSS = `
  :root {
    --navy-900:#0A1B33; --navy-800:#123A5E; --navy-700:#1B4A73;
    --orange:#FF7A29; --orange-l:#FF9558; --sky:#4CC3F5;
    --ink:#0B1220; --slate:#64748B; --surface:#F7F9FC; --border:#E6EAF2;
  }
  *,*::before,*::after{box-sizing:border-box}
  html,body{overflow-x:hidden;background:#fff;scroll-behavior:smooth}
  body{font-family:'Inter',system-ui,sans-serif;color:var(--ink)}

  /* ── Keyframes ── */
  @keyframes float        {0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}
  @keyframes pulseDot     {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
  @keyframes fadeUp       {from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeLeft     {from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
  @keyframes waveDrift    {0%,100%{transform:translateX(0)}50%{transform:translateX(-18px)}}
  @keyframes liveRing     {0%{transform:scale(1);opacity:.9}100%{transform:scale(2.8);opacity:0}}
  @keyframes slideRight   {from{opacity:0;transform:translateX(40px) scale(.96)}to{opacity:1;transform:translateX(0) scale(1)}}
  @keyframes particle     {0%{transform:translateY(0) translateX(0) scale(1)}50%{transform:translateY(-32px) translateX(20px) scale(1.1)}100%{transform:translateY(0) translateX(0) scale(1)}}
  @keyframes gradShift    {0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
  @keyframes badgePop     {0%{transform:scale(0) rotate(-15deg)}70%{transform:scale(1.18) rotate(2deg)}100%{transform:scale(1) rotate(0deg)}}
  @keyframes glowPulse    {0%,100%{box-shadow:0 0 0 0 rgba(255,122,41,.5)}50%{box-shadow:0 0 0 16px rgba(255,122,41,0)}}
  @keyframes glowPulseSky {0%,100%{box-shadow:0 0 0 0 rgba(76,195,245,.5)}50%{box-shadow:0 0 0 16px rgba(76,195,245,0)}}
  @keyframes countUp      {0%{transform:translateY(10px);opacity:0}100%{transform:translateY(0);opacity:1}}
  @keyframes ripple       {0%{transform:scale(0);opacity:.5}100%{transform:scale(4);opacity:0}}
  @keyframes spin         {to{transform:rotate(360deg)}}
  @keyframes tiltHover    {0%{transform:perspective(600px) rotateX(0) rotateY(0)}100%{transform:perspective(600px) rotateX(2deg) rotateY(-3deg)}}
  @keyframes borderSpin   {0%{--angle:0deg}100%{--angle:360deg}}
  @keyframes typeFlash    {0%,100%{opacity:1}50%{opacity:0}}
  @keyframes progressGrow {from{width:0}to{width:var(--prog)}}
  @keyframes orbitDot     {0%{transform:rotate(0deg) translateX(18px)}100%{transform:rotate(360deg) translateX(18px)}}
  @keyframes shimmer2     {0%{background-position:-200% 0}100%{background-position:200% 0}}

  .hp-display{font-family:'Sora',sans-serif}
  .hp-float  {animation:float 5s ease-in-out infinite}
  .hp-dot    {animation:pulseDot 2s infinite}
  .hp-fadeup {animation:fadeUp .85s cubic-bezier(.2,.8,.2,1) both}
  .hp-fadeleft{animation:fadeLeft .85s cubic-bezier(.2,.8,.2,1) both}

  /* ── Buttons ── */
  .btn-primary{
    background:var(--orange);color:white;border:none;
    padding:13px 26px;border-radius:999px;font-weight:700;font-size:14px;
    cursor:pointer;transition:transform .2s,box-shadow .2s;
    box-shadow:0 6px 20px rgba(255,122,41,.4);font-family:'Sora',sans-serif;
    position:relative;overflow:hidden;
  }
  .btn-primary:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 14px 32px rgba(255,122,41,.5)}
  .btn-primary:active{transform:translateY(-1px) scale(0.98);box-shadow:0 8px 20px rgba(255,122,41,.5)}
  .btn-primary:active{transform:scale(.97)}
  .btn-white{
    background:white;color:var(--navy-900);border:none;
    padding:14px 28px;border-radius:999px;font-weight:800;font-size:15px;
    cursor:pointer;transition:transform .2s,box-shadow .2s;font-family:'Sora',sans-serif;
    position:relative;overflow:hidden;
  }
  .btn-white:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 14px 36px rgba(0,0,0,.3)}
  .btn-white:active{transform:translateY(-1px) scale(0.98);box-shadow:0 8px 22px rgba(0,0,0,.3)}
  .btn-white:active{transform:scale(.97)}
  .btn-ghost{
    background:rgba(255,255,255,.09);color:white;
    border:1.5px solid rgba(255,255,255,.45);padding:13px 26px;
    border-radius:999px;font-weight:700;font-size:15px;
    cursor:pointer;transition:all .2s;font-family:'Sora',sans-serif;
  }
  .btn-ghost:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.8);transform:translateY(-2px)}
  .btn-ghost:active{background:rgba(255,255,255,.25);transform:translateY(0) scale(0.98)}

  /* ── Cards ── */
  .hp-card{transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease}
  .hp-card:hover{transform:translateY(-6px) scale(1.01);box-shadow:0 24px 52px rgba(10,27,51,.12)}
  .hp-card:active{transform:translateY(-2px) scale(0.99);box-shadow:0 14px 32px rgba(10,27,51,.14)}

  /* ── Job/capsule active card ── */
  .job-active{animation:glowPulse 2.2s infinite;border-color:var(--orange)!important;transform:scale(1.03)!important;box-shadow:0 28px 60px rgba(255,122,41,.25)!important}
  .cap-active{animation:glowPulseSky 2.2s infinite;transform:scale(1.03)!important;box-shadow:0 30px 70px rgba(76,195,245,.2)!important}
  .card-slide{animation:slideRight .42s cubic-bezier(.2,.8,.2,1) both}

  /* ── Scroll progress bar ── */
  #scroll-bar{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--orange),var(--sky));z-index:9999;width:0%;transition:width .1s linear;pointer-events:none}

  /* ── Mobile horizontal scroll strips ── */
  .h-scroll{
    display:flex;gap:16px;overflow-x:auto;
    scroll-snap-type:x mandatory;padding-bottom:14px;
    -webkit-overflow-scrolling:touch;
    scrollbar-width:none;
  }
  .h-scroll::-webkit-scrollbar{display:none}
  .h-scroll > *{scroll-snap-align:start;flex-shrink:0}

  /* ── Shimmer loading skeleton ── */
  .shimmer{
    background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 37%,#f0f0f0 63%);
    background-size:400% 100%;
    animation:shimmer2 1.4s ease infinite;
    border-radius:8px;
  }

  /* ── Responsive ── */
  @media(max-width:900px){
    .hero-grid   {grid-template-columns:1fr!important;text-align:left!important}
    .hero-illus  {max-width:420px;margin:0 auto;display:none!important}
    .hp-float    {position:static!important;width:auto!important;max-width:320px;margin:10px auto!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important}
    .hp-title    {font-size:36px!important}
    .col3        {grid-template-columns:1fr!important}
    .col2        {grid-template-columns:1fr!important}
    .jobs-grid   {grid-template-columns:1fr!important}
    .stats-row   {grid-template-columns:repeat(2,1fr)!important}
    .badge-row   {flex-wrap:wrap!important;gap:10px!important}
    .hero-cta    {flex-wrap:wrap!important}
  }
  @media(max-width:600px){
    .hp-title    {font-size:28px!important}
    .stats-row   {grid-template-columns:repeat(2,1fr)!important}
  }
`;

/* ─── Scroll progress bar ─── */
function ScrollProgress() {
  useEffect(() => {
    const bar = document.getElementById("scroll-bar");
    if (!bar) return;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = `${(window.scrollY / h) * 100}%`;
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <div id="scroll-bar" />;
}

/* ─── Ripple on click ─── */
function addRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  const r = document.createElement("span");
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  Object.assign(r.style, {
    position: "absolute", borderRadius: "50%",
    width: size + "px", height: size + "px",
    background: "rgba(255,255,255,.35)",
    top: e.clientY - rect.top - size / 2 + "px",
    left: e.clientX - rect.left - size / 2 + "px",
    animation: "ripple .6s ease-out forwards",
    pointerEvents: "none",
  });
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

/* ─── Hooks ─── */
function useCounter(target: number, duration = 1400, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step); else setCount(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useInView(threshold = 0.18) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity .7s cubic-bezier(.2,.8,.2,1) ${delay}ms, transform .7s cubic-bezier(.2,.8,.2,1) ${delay}ms`,
    }}>{children}</div>
  );
}

/* ─── Hero Illustration ─── */
function HeroIllustration() {
  return (
    <svg viewBox="0 0 640 520" style={{ width: "100%", height: "auto", display: "block" }} aria-hidden>
      <defs>
        <linearGradient id="deskA" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FF9558"/><stop offset="100%" stopColor="#FF7A29"/></linearGradient>
        <linearGradient id="deskB" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6FD3FA"/><stop offset="100%" stopColor="#4CC3F5"/></linearGradient>
      </defs>
      <ellipse cx="320" cy="470" rx="230" ry="18" fill="#08152A" opacity="0.35"/>
      <g transform="translate(60,230)">
        <rect x="0" y="120" width="150" height="14" rx="7" fill="#0F2A4E"/>
        <rect x="14" y="60" width="120" height="64" rx="10" fill="#F7F9FC"/>
        <rect x="30" y="40" width="88" height="26" rx="4" fill="#123A5E"/>
        <circle cx="74" cy="34" r="4" fill="#4CC3F5"/>
        <rect x="55" y="-30" width="46" height="60" rx="18" fill="url(#deskA)"/>
        <circle cx="78" cy="-52" r="22" fill="#FFD9BE"/>
        <path d="M56 -60 q22 -22 44 0 q4 14 -6 18 q-6 -14 -16 -14 q-10 0 -16 14 q-10 -4 -6 -18Z" fill="#0F2A4E"/>
        <rect x="52" y="4" width="52" height="16" rx="8" fill="#0F2A4E"/>
      </g>
      <g transform="translate(270,150)">
        <rect x="20" y="220" width="70" height="14" rx="7" fill="#0F2A4E" opacity="0.5"/>
        <rect x="30" y="90" width="50" height="110" rx="20" fill="url(#deskB)"/>
        <rect x="10" y="120" width="26" height="70" rx="10" fill="url(#deskB)"/>
        <rect x="84" y="110" width="26" height="60" rx="10" fill="#FFD9BE"/>
        <rect x="86" y="118" width="30" height="42" rx="6" fill="#0F2A4E"/>
        <rect x="90" y="124" width="22" height="6" rx="2" fill="#4CC3F5"/>
        <circle cx="55" cy="60" r="26" fill="#FFD9BE"/>
        <path d="M30 54 q25 -30 50 0 q4 18 -8 22 q-6 -18 -17 -18 q-11 0 -17 18 q-12 -4 -8 -22Z" fill="#0F2A4E"/>
      </g>
      <g transform="translate(430,250)">
        <rect x="0" y="100" width="150" height="14" rx="7" fill="#0F2A4E"/>
        <rect x="30" y="10" width="90" height="66" rx="8" fill="#0F2A4E"/>
        <rect x="40" y="20" width="70" height="46" rx="4" fill="#F7F9FC"/>
        <rect x="55" y="40" width="16" height="20" fill="#FF7A29" opacity="0.85"/>
        <rect x="75" y="30" width="16" height="30" fill="#4CC3F5" opacity="0.85"/>
        <rect x="95" y="46" width="16" height="14" fill="#FF9558" opacity="0.85"/>
        <rect x="68" y="76" width="14" height="14" fill="#0F2A4E"/>
        <rect x="30" y="-14" width="52" height="60" rx="18" fill="url(#deskA)"/>
        <circle cx="56" cy="-34" r="22" fill="#FFD9BE"/>
        <path d="M34 -42 q22 -22 44 0 q4 14 -6 18 q-6 -14 -16 -14 q-10 0 -16 14 q-10 -4 -6 -18Z" fill="#0F2A4E"/>
      </g>
      <circle cx="90" cy="120" r="6" fill="#4CC3F5" opacity="0.7"/>
      <circle cx="560" cy="180" r="8" fill="#FF7A29" opacity="0.6"/>
      <circle cx="520" cy="90" r="5" fill="#FFF" opacity="0.5"/>
      <circle cx="150" cy="60" r="5" fill="#FFF" opacity="0.4"/>
    </svg>
  );
}

/* ─── CraftRank Gauge ─── */
function CraftRankGauge({ score = 88, animate }: { score?: number; animate: boolean }) {
  const circ = Math.PI * 42;
  const [p, setP] = useState(0);
  useEffect(() => { if (!animate) return; const t = setTimeout(() => setP(score), 300); return () => clearTimeout(t); }, [animate, score]);
  return (
    <svg width="110" height="66" viewBox="0 0 110 66">
      <path d="M8 58 A42 42 0 0 1 102 58" fill="none" stroke="#E6EAF2" strokeWidth="9" strokeLinecap="round"/>
      <path d="M8 58 A42 42 0 0 1 102 58" fill="none" stroke="#FF7A29" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - (p / 100) * circ}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)" }}/>
      <text x="55" y="46" textAnchor="middle" fontFamily="Sora,sans-serif" fontWeight={800} fontSize="20" fill="#0B1220">{p}</text>
      <text x="55" y="60" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight={600} fontSize="9" fill="#64748B">/100</text>
    </svg>
  );
}

function MiniGauge({ score = 80 }: { score: number }) {
  const circ = Math.PI * 18;
  const [p, setP] = useState(0);
  useEffect(() => { const t = setTimeout(() => setP(score), 250); return () => clearTimeout(t); }, [score]);
  return (
    <svg width="46" height="28" viewBox="0 0 46 28">
      <path d="M3 24 A18 18 0 0 1 43 24" fill="none" stroke="#E6EAF2" strokeWidth="4" strokeLinecap="round"/>
      <path d="M3 24 A18 18 0 0 1 43 24" fill="none" stroke="#FF7A29" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - (p / 100) * circ}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)" }}/>
      <text x="23" y="20" textAnchor="middle" fontFamily="Sora,sans-serif" fontWeight={800} fontSize="9" fill="#0B1220">{p}</text>
    </svg>
  );
}

/* ─── Live Jobs Section ─── */
function LiveJobsSection({ jobs }: { jobs: Job[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [sliding, setSliding] = useState(false);
  const { ref, inView } = useInView(0.2);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advance = useCallback(() => {
    setSliding(true);
    setTimeout(() => { setActiveIdx(i => (i + 1) % jobs.length); setSliding(false); }, 220);
  }, [jobs.length]);
  useEffect(() => {
    if (!inView || !jobs.length) return;
    ivRef.current = setInterval(advance, 4000);
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, [inView, advance, jobs.length]);

  return (
    <section ref={ref} style={{ padding: "80px 0", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: inView ? "linear-gradient(180deg,#fff 0%,#FFF9F5 45%,#fff 100%)" : "#fff",
        transition: "background 1.2s ease",
      }}/>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
            <div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "#FF7A29", color: "white",
                padding: "5px 14px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 10,
                ...(inView ? { animation: "badgePop .5s cubic-bezier(.2,.8,.2,1) both" } : {}),
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block", animation: "pulseDot 1.2s infinite" }}/>
                🔥 LIVE JOBS · Updates Every 4s
              </span>
              <h2 className="hp-display" style={{ fontSize: 30, fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-0.02em" }}>
                Real roles. Real tasks. Real hires. 💼
              </h2>
              <p style={{ margin: "6px 0 0", color: "var(--slate)", fontSize: 14 }}>Every listing includes a skill task — no résumé filter.</p>
            </div>
            <a href="/jobs" style={{ color: "var(--orange)", fontWeight: 800, fontSize: 13.5, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              View all jobs →
            </a>
          </div>
        </Reveal>

        {/* Desktop grid / Mobile horizontal scroll */}
        <div className="mobile-hscroll">
          <div className="jobs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {jobs.slice(0, 6).map((job, i) => {
              const isActive = i === activeIdx && inView;
              return (
                <div key={job.id}
                  className={`hp-card${isActive ? " job-active" : ""}${sliding && isActive ? " card-slide" : ""}`}
                  onClick={() => setActiveIdx(i)}
                  style={{
                    background: "white", borderRadius: 18, padding: "22px 20px",
                    border: `1.5px solid ${isActive ? "var(--orange)" : "var(--border)"}`,
                    cursor: "pointer", position: "relative",
                    opacity: inView && !isActive ? 0.65 : 1,
                    transition: "opacity .4s ease, border-color .4s ease",
                  }}
                >
                  {isActive && (
                    <div style={{ position: "absolute", top: 12, right: 12 }}>
                      <div style={{ position: "relative", width: 10, height: 10 }}>
                        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--orange)", animation: "liveRing 1.5s infinite" }}/>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--orange)" }}/>
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg,var(--navy-900),var(--navy-700))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "white", fontWeight: 800, fontFamily: "Sora,sans-serif" }}>
                      {job.title.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--ink)", lineHeight: 1.3 }}>{job.title}</p>
                      <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "var(--slate)", fontWeight: 500 }}>📍 {job.location ?? "Remote"}</p>
                    </div>
                  </div>
                  {job.salary_min && <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--orange)" }}>💰 ₹{job.salary_min.toLocaleString("en-IN")}–₹{(job.salary_max??job.salary_min).toLocaleString("en-IN")} /yr</p>}
                  {job.company_name && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                      <span style={{ background:"var(--surface)",color:"var(--slate)",border:"1px solid var(--border)",padding:"2px 9px",borderRadius:999,fontSize:10.5,fontWeight:600 }}>🏢 {job.company_name}</span>
                    </div>
                  )}
                  <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    {job.slug ? (
                      <a href={`/jobs/${job.slug}`} onClick={e=>e.stopPropagation()} style={{
                        display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
                        background: isActive ? "var(--orange)" : "var(--surface)",
                        color: isActive ? "white" : "var(--slate)",
                        padding: "5px 13px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                        transition: "all .3s ease",
                      }}>
                        {isActive ? "✦ Apply with SkillCapsule" : "View task →"}
                      </a>
                    ) : (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: isActive ? "var(--orange)" : "var(--surface)",
                        color: isActive ? "white" : "var(--slate)",
                        padding: "5px 13px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                        transition: "all .3s ease",
                      }}>
                        {isActive ? "✦ Apply with SkillCapsule" : "View task →"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 24 }}>
          {jobs.slice(0,6).map((_,i)=>(
            <button key={i} onClick={()=>setActiveIdx(i)} style={{ width: i===activeIdx?22:7, height:7, borderRadius:999, border:"none", cursor:"pointer", padding:0, background: i===activeIdx?"var(--orange)":"var(--border)", transition:"all .3s cubic-bezier(.2,.8,.2,1)" }}/>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Live Capsules Section ─── */
function LiveCapsulesSection({ capsules }: { capsules: Capsule[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [sliding, setSliding] = useState(false);
  const { ref, inView } = useInView(0.16);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advance = useCallback(() => {
    setSliding(true);
    setTimeout(() => { setActiveIdx(i => (i+1) % capsules.length); setSliding(false); }, 250);
  }, [capsules.length]);
  useEffect(() => {
    if (!inView || !capsules.length) return;
    ivRef.current = setInterval(advance, 5000);
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, [inView, advance, capsules.length]);
  const colors = ["#FF7A29","#4CC3F5","#123A5E","#22C55E","#8B5CF6","#F59E0B"];

  return (
    <section ref={ref} style={{ padding: "80px 0", background: "linear-gradient(160deg,var(--navy-900),var(--navy-800))", position: "relative", overflow: "hidden" }}>
      {[...Array(7)].map((_,i)=>(
        <div key={i} style={{ position:"absolute", width:8+i*4, height:8+i*4, borderRadius:"50%", background: i%2===0?"rgba(255,122,41,.12)":"rgba(76,195,245,.1)", top:`${8+i*13}%`, left:`${4+i*14}%`, animation:`particle ${4+i}s ease-in-out infinite`, animationDelay:`${i*.6}s`, pointerEvents:"none" }}/>
      ))}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
            <div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "rgba(76,195,245,.18)", color: "var(--sky)", border:"1px solid rgba(76,195,245,.3)",
                padding: "5px 14px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 10,
                ...(inView ? { animation: "badgePop .5s .1s cubic-bezier(.2,.8,.2,1) both" } : {}),
              }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--sky)",display:"inline-block",animation:"pulseDot 1.4s infinite" }}/>
                ⚡ LIVE SKILLCAPSULES · Updates Every 5s
              </span>
              <h2 className="hp-display" style={{ fontSize: 30, fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.02em" }}>
                Proof of skill, live on The Showfloor 🎯
              </h2>
              <p style={{ margin: "6px 0 0", color: "rgba(185,198,220,.8)", fontSize: 14 }}>Real work completed by real candidates. No résumé needed.</p>
            </div>
            <a href="/the-stage" style={{ color:"var(--sky)",fontWeight:800,fontSize:13.5,textDecoration:"none",whiteSpace:"nowrap" }}>Explore Showfloor →</a>
          </div>
        </Reveal>

        <div className="mobile-hscroll">
          <div className="jobs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {capsules.slice(0,6).map((cap,i)=>{
              const isActive = i===activeIdx && inView;
              const color = colors[i%colors.length];
              return (
                <div key={cap.id}
                  className={`${isActive?"cap-active":""}${sliding&&isActive?" card-slide":""}`}
                  onClick={()=>setActiveIdx(i)}
                  style={{
                    background: isActive?"white":"rgba(255,255,255,.06)",
                    borderRadius:18, padding:"20px 18px",
                    border:`1.5px solid ${isActive?"rgba(255,255,255,.9)":"rgba(255,255,255,.12)"}`,
                    cursor:"pointer",
                    opacity: inView&&!isActive?0.6:1,
                    transition:"all .4s cubic-bezier(.2,.8,.2,1)",
                  }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:12 }}>
                    {cap.avatar_url ? (
                      <img src={cap.avatar_url} alt="" style={{ width:36,height:36,borderRadius:"50%",flexShrink:0,objectFit:"cover" }} />
                    ) : (
                      <div style={{ width:36,height:36,borderRadius:"50%",flexShrink:0,background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"white",fontWeight:800 }}>{initials(cap.user_full_name,cap.username)}</div>
                    )}
                    <div>
                      <p style={{ margin:0,fontSize:12,fontWeight:800,color:isActive?"var(--ink)":"white" }}>SkillCapsule ⚡</p>
                      <p style={{ margin:0,fontSize:10,color:isActive?"var(--slate)":"rgba(255,255,255,.5)",fontWeight:500 }}>{cap.user_full_name || (cap.username ? `@${cap.username}` : "Verified")}</p>
                    </div>
                    {isActive&&<span style={{ marginLeft:"auto",background:"#DCFCE7",color:"#16A34A",padding:"2px 8px",borderRadius:999,fontSize:9,fontWeight:700 }}>✓ Verified</span>}
                  </div>
                  <p style={{ margin:"0 0 10px",fontSize:13.5,fontWeight:800,color:isActive?"var(--ink)":"white",lineHeight:1.35 }}>{cap.title}</p>
                  {cap.category && (
                    <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginBottom:12 }}>
                      <span style={{ background:isActive?"var(--surface)":"rgba(255,255,255,.1)",color:isActive?"var(--slate)":"rgba(255,255,255,.7)",padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600 }}>{CAT_ICON[cap.category?.toLowerCase()] || "⚡"} {cap.category}</span>
                    </div>
                  )}
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div>
                      <p style={{ margin:"0 0 2px",fontSize:9,color:isActive?"var(--slate)":"rgba(255,255,255,.4)",fontWeight:700 }}>CraftRank™</p>
                      <MiniGauge score={cap.skill_impact_score??80}/>
                    </div>
                    {isActive&&<span style={{ background:"var(--orange)",color:"white",padding:"5px 13px",borderRadius:999,fontSize:11,fontWeight:700 }}>View →</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display:"flex",justifyContent:"center",gap:7,marginTop:24 }}>
          {capsules.slice(0,6).map((_,i)=>(
            <button key={i} onClick={()=>setActiveIdx(i)} style={{ width:i===activeIdx?22:7,height:7,borderRadius:999,border:"none",cursor:"pointer",padding:0,background:i===activeIdx?"var(--sky)":"rgba(255,255,255,.25)",transition:"all .3s cubic-bezier(.2,.8,.2,1)" }}/>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ MAIN APP ═══════════════════════════ */
export default function HomeClient() {
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [liveStats, setLiveStats] = useState({ jobs:0, companies:0, applications:0, capsules:0 });
  const [countStart, setCountStart] = useState(false);
  const [gaugeVisible, setGaugeVisible] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [capsules, setCapsules] = useState<Capsule[]>(MOCK_CAPSULES);
  const statsRef = useRef<HTMLDivElement>(null);
  const jobCount     = useCounter(liveStats.jobs, 1300, countStart);
  const companyCount = useCounter(liveStats.companies, 1500, countStart);
  const appCount     = useCounter(liveStats.applications, 1700, countStart);
  const capsuleCount = useCounter(liveStats.capsules, 1400, countStart);

  /* SEO */
  useEffect(() => {
    document.title = "OfSkillJob — Skill-First Hiring Platform | No Résumé Required";
    const metas: Array<[string,string,string]> = [
      ["name","description","OfSkillJob is the world's first skill-proof hiring platform. Complete a real task, launch a SkillCapsule, earn your CraftRank, and get discovered by top companies — no résumé required."],
      ["name","keywords","skill-based hiring,SkillCapsule,CraftRank,remote jobs,developer jobs,tech hiring,skill-first,The Showfloor,Skill Forge,no resume hiring"],
      ["name","geo.region","US"],["name","geo.placename","United States"],
      ["property","og:type","website"],["property","og:url","https://ofskilljob.com"],
      ["property","og:title","OfSkillJob — Skill-First Hiring Platform"],
      ["property","og:description","Every hire starts with real work. Build a SkillCapsule, earn your CraftRank, get discovered."],
      ["property","og:image","https://ofskilljob.com/favicon.png"],
      ["name","twitter:card","summary_large_image"],
      ["name","twitter:title","OfSkillJob — Skill-First Hiring"],
      ["name","twitter:description","Complete a task. Launch a SkillCapsule. Get hired."],
    ];
    metas.forEach(([attr,key,content])=>{
      const el = document.querySelector(`meta[${attr}="${key}"]`) ?? (() => { const m=document.createElement("meta"); m.setAttribute(attr,key); document.head.appendChild(m); return m; })();
      el.setAttribute("content",content);
    });
    const ld=document.createElement("script"); ld.type="application/ld+json";
    ld.text=JSON.stringify({ "@context":"https://schema.org","@type":"Organization",name:"OfSkillJob",description:"Skill-first hiring platform",url:"https://ofskilljob.com",logo:"https://ofskilljob.com/favicon.png",sameAs:["https://www.linkedin.com/company/ofskilljob","https://t.me/OfSkillJob","https://reddit.com/u/OfSkillJob"] });
    document.head.appendChild(ld);
  }, []);

  /* Data */
  useEffect(() => {
    (async () => {
      try {
        if (!supabase) throw new Error("no client");
        const [jR,cR,aR,capR,jD,capD] = await Promise.all([
          supabase.from("jobs").select("id",{count:"exact",head:true}).eq("status","active"),
          supabase.from("users").select("id",{count:"exact",head:true}).eq("role","company"),
          supabase.from("job_applications").select("id",{count:"exact",head:true}),
          supabase.from("skill_capsules").select("id",{count:"exact",head:true}),
          supabase.from("jobs")
            .select("id, title, location, salary_min, salary_max, slug, users:company_id ( company_name )")
            .eq("status","active").order("created_at",{ascending:false}).limit(12),
          supabase.from("skill_capsules")
            .select("id, title, category, skill_impact_score, user:user_id ( full_name, username, avatar_url )")
            .eq("visibility","public").order("skill_impact_score",{ascending:false}).limit(12),
        ]);
        setLiveStats({jobs:jR.count??0,companies:cR.count??0,applications:aR.count??0,capsules:capR.count??0});

        if (jD.error) console.error("[HomeClient] jobs fetch failed:", jD.error);
        if (jD.data?.length) {
          setJobs(jD.data.map((j: any) => ({
            id: j.id, title: j.title, location: j.location, slug: j.slug,
            company_name: j.users?.company_name, salary_min: j.salary_min, salary_max: j.salary_max,
          })));
        }

        if (capD.error) console.error("[HomeClient] capsules fetch failed:", capD.error);
        if (capD.data?.length) {
          setCapsules(capD.data.map((c: any) => ({
            id: c.id, title: c.title, category: c.category, skill_impact_score: c.skill_impact_score,
            user_full_name: c.user?.full_name, username: c.user?.username, avatar_url: c.user?.avatar_url,
          })));
        }
      } catch (err) {
        console.error("[HomeClient] live data fetch failed, using fallback:", err);
        setLiveStats({jobs:284,companies:63,applications:1847,capsules:412});
      }
      setStatsLoaded(true);
    })();
  }, []);

  /* Stats IntersectionObserver */
  useEffect(() => {
    if (!statsLoaded) return;
    const el = statsRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e])=>{ if(e.isIntersecting){setCountStart(true);obs.disconnect();} },{threshold:0.3});
    obs.observe(el);
    return () => obs.disconnect();
  }, [statsLoaded]);

  useEffect(() => { const t=setTimeout(()=>setGaugeVisible(true),600); return ()=>clearTimeout(t); }, []);

  function handleGetHired(e: React.MouseEvent<HTMLButtonElement>) { addRipple(e); try{localStorage.setItem("selectedRole","developer")}catch{} setTimeout(()=>{ window.location.href="/signup"; },150); }
  function handleHireTalent(e: React.MouseEvent<HTMLButtonElement>) { addRipple(e); try{localStorage.setItem("selectedRole","company")}catch{} setTimeout(()=>{ window.location.href="/signup"; },150); }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <ScrollProgress />

      {/* ══════ HERO ══════ */}
      <section style={{ position:"relative", background:"linear-gradient(135deg,var(--navy-900) 0%,var(--navy-800) 55%,var(--navy-700) 100%)", overflow:"hidden", paddingTop:0 }}>

        {/* Wave accents */}
        <svg style={{ position:"absolute",top:50,left:-60,opacity:.3,animation:"waveDrift 10s ease-in-out infinite" }} width="500" height="300" viewBox="0 0 500 300"><path d="M0 150 Q125 50 250 150 T500 150" fill="none" stroke="var(--sky)" strokeWidth="2"/></svg>
        <svg style={{ position:"absolute",bottom:-20,left:80,opacity:.25,animation:"waveDrift 13s ease-in-out infinite",animationDelay:"1s" }} width="600" height="200" viewBox="0 0 600 200"><path d="M0 100 Q150 20 300 100 T600 100" fill="none" stroke="var(--orange)" strokeWidth="2"/></svg>
        <svg style={{ position:"absolute",top:0,right:60,opacity:.15,animation:"waveDrift 16s ease-in-out infinite",animationDelay:"3s" }} width="380" height="240" viewBox="0 0 380 240"><path d="M0 120 Q95 20 190 120 T380 120" fill="none" stroke="white" strokeWidth="1.5"/></svg>

        {/* Glow orbs */}
        <div style={{ position:"absolute",top:-80,right:-80,width:360,height:360,borderRadius:"50%",background:"rgba(255,122,41,.12)",filter:"blur(80px)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:-60,left:40,width:300,height:300,borderRadius:"50%",background:"rgba(76,195,245,.09)",filter:"blur(70px)",pointerEvents:"none" }}/>

        {/* Floating particles */}
        {[...Array(8)].map((_,i)=>(
          <div key={i} style={{ position:"absolute",width:4+(i%3)*3,height:4+(i%3)*3,borderRadius:"50%",background:i%2===0?"rgba(76,195,245,.5)":"rgba(255,122,41,.4)",top:`${8+i*11}%`,left:`${3+i*12}%`,animation:`particle ${5+i}s ease-in-out infinite`,animationDelay:`${i*.65}s`,pointerEvents:"none" }}/>
        ))}

        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", position:"relative", zIndex:1 }}>

          {/* ── Brand bar (logo + name left-aligned) ── */}
          <div className="hp-fadeleft" style={{ display:"flex", alignItems:"center", gap:10, padding:"22px 0 0" }}>
            <img src="/favicon.png" alt="OfSkillJob" width={34} height={34}
              style={{ borderRadius:10, objectFit:"contain", flexShrink:0 }}
              onError={e=>{
                const img=e.target as HTMLImageElement; img.style.display="none";
                const d=document.createElement("div");
                d.style.cssText="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#FF7A29,#4CC3F5);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:15px;font-family:Sora,sans-serif;flex-shrink:0;";
                d.textContent="O"; img.parentNode?.insertBefore(d,img);
              }}
            />
            <span className="hp-display" style={{ fontSize:20,fontWeight:800,color:"white",letterSpacing:"-0.01em" }}>OfSkillJob</span>
            <span style={{ fontSize:11,color:"rgba(255,255,255,.5)",marginLeft:4,fontWeight:500 }}>v2.0 · Skill-First Platform</span>
          </div>

          {/* ── Hero grid ── */}
          <div className="hero-grid" style={{ display:"grid", gridTemplateColumns:"1.05fr 0.95fr", gap:52, alignItems:"center", padding:"36px 0 100px" }}>

            {/* Left copy */}
            <div className="hp-fadeup">

              {/* Above-fold value prop pill */}
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",borderRadius:999,padding:"6px 16px",marginBottom:20 }}>
                <span className="hp-dot" style={{ width:7,height:7,borderRadius:"50%",background:"var(--sky)",display:"inline-block" }}/>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.85)",fontWeight:600 }}>🌍 The India's Skill-First Hiring Platform</span>
              </div>

              <h1 className="hp-title hp-display" style={{ fontSize:54,fontWeight:800,color:"white",lineHeight:1.05,letterSpacing:"-0.025em",margin:"0 0 14px" }}>
                Your Skills Are<br/>
                your{" "}
                <span style={{ color:"var(--orange)",position:"relative",display:"inline-block" }}>
                  Résumé.
                  <svg viewBox="0 0 200 10" style={{ position:"absolute",bottom:-2,left:0,width:"100%",height:7 }} aria-hidden>
                    <path d="M0 7 Q50 1 100 7 T200 7" stroke="var(--orange)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55"/>
                  </svg>
                </span>
              </h1>

              {/* Instant clarity tagline */}
              <div style={{ background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:"12px 18px",marginBottom:20,display:"inline-block" }}>
                <p style={{ margin:0,fontSize:13.5,color:"rgba(255,255,255,.9)",fontWeight:600,lineHeight:1.5 }}>
                  🚫 No résumés &nbsp;·&nbsp; ✅ Complete a real task &nbsp;·&nbsp; 🚀 Get hired
                </p>
              </div>

              <p style={{ fontSize:16.5,color:"#B9C6DC",lineHeight:1.78,margin:"0 0 28px",maxWidth:470 }}>
                Every hire on OfSkillJob starts with real work, not a résumé. Complete a task, launch a SkillCapsule, and let companies discover what you can actually do.
              </p>

              {/* CTAs */}
              <div className="hero-cta" style={{ display:"flex",gap:14,marginBottom:22 }}>
                <button onClick={handleGetHired} className="btn-white">🎯 Get Hired Free</button>
                <button onClick={handleHireTalent} className="btn-ghost">🏢 Hire Talent</button>
              </div>

              {/* Compact live badge strip */}
              <div className="badge-row" style={{ display:"flex",gap:16,flexWrap:"wrap",alignItems:"center" }}>
                {[
                  { dot:"var(--sky)",   text: statsLoaded?`${liveStats.applications.toLocaleString()} applications`:"1,847 applications", emoji:"📋" },
                  { dot:"var(--orange)",text: statsLoaded?`${liveStats.capsules.toLocaleString()} capsules live`:"412 capsules live",      emoji:"⚡" },
                  { dot:"#22C55E",      text:"Zero résumé screening",                                                                        emoji:"✅" },
                ].map(({dot,text,emoji})=>(
                  <div key={text} style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.07)",borderRadius:999,padding:"5px 12px",border:"1px solid rgba(255,255,255,.1)" }}>
                    <span className="hp-dot" style={{ width:6,height:6,borderRadius:"50%",background:dot,display:"inline-block" }}/>
                    <span style={{ fontSize:11.5,color:"#B9C6DC",fontWeight:600 }}>{emoji} {text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right illustration */}
            <div style={{ position:"relative" }}>
              <div className="hero-illus"><HeroIllustration/></div>

              {/* Floating SkillCapsule card */}
              <div className="hp-float" style={{ position:"absolute",top:"4%",right:"-2%",width:218,background:"white",borderRadius:20,padding:"18px 18px 16px",boxShadow:"0 24px 60px rgba(0,0,0,.32)",animationDelay:".5s" }}>
                <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:12 }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#FFD9BE,#FF9558)",flexShrink:0 }}/>
                  <div>
                    <p style={{ margin:0,fontSize:12.5,fontWeight:800,color:"var(--ink)" }}>SkillCapsule ⚡</p>
                    <p style={{ margin:0,fontSize:10,color:"var(--slate)",fontWeight:600 }}>Alex Chen · Frontend Dev</p>
                  </div>
                </div>
                <div style={{ display:"flex",gap:6,marginBottom:12 }}>
                  {["#F7DF1E","#61DAFB","#22C55E"].map((c,i)=>(
                    <div key={i} style={{ width:26,height:26,borderRadius:8,background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11 }}>{i===2?"✓":""}</div>
                  ))}
                  <span style={{ marginLeft:"auto",background:"#DCFCE7",color:"#16A34A",padding:"2px 8px",borderRadius:999,fontSize:9,fontWeight:800,alignSelf:"center" }}>✓ Verified</span>
                </div>
                <p style={{ margin:"0 0 2px",fontSize:9.5,color:"var(--slate)",fontWeight:700 }}>CraftRank™</p>
                <div style={{ display:"flex",justifyContent:"center" }}><CraftRankGauge score={88} animate={gaugeVisible}/></div>
                <div style={{ borderTop:"1px solid var(--border)",paddingTop:9,marginTop:4 }}>
                  <p style={{ margin:0,fontSize:9.5,color:"var(--slate)",fontWeight:600 }}>Task Completed:</p>
                  <p style={{ margin:0,fontSize:12,color:"var(--ink)",fontWeight:800 }}>Weather App Dashboard 🌦️</p>
                </div>
              </div>

              {/* Second float badge */}
              <div className="hp-float" style={{ position:"absolute",bottom:"14%",left:"-6%",background:"white",borderRadius:14,padding:"11px 16px",boxShadow:"0 16px 40px rgba(0,0,0,.24)",animationDelay:"1.5s",animationDuration:"6s",display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,var(--navy-800),var(--navy-700))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>🎯</div>
                <div>
                  <p style={{ margin:0,fontSize:11,fontWeight:800,color:"var(--ink)" }}>Task Matched! ✨</p>
                  <p style={{ margin:0,fontSize:9.5,color:"var(--slate)",fontWeight:500 }}>Skill Forge · React Challenge</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ LIVE STATS BAR ══════ */}
      <Reveal>
        <div ref={statsRef} style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px" }}>
          <div className="stats-row" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, background:"var(--border)", borderRadius:24, overflow:"hidden", marginTop:-52, position:"relative", zIndex:2, boxShadow:"0 24px 60px rgba(10,27,51,.1)" }}>
            {[
              { val:companyCount, label:"Verified companies", c:"var(--navy-800)", icon:"🏢", desc:"Hiring right now" },
              { val:jobCount,     label:"Active listings",    c:"var(--orange)",   icon:"💼", desc:"With real tasks" },
              { val:appCount,     label:"Applications filed", c:"var(--sky)",      icon:"📋", desc:"Skill-proof apps" },
              { val:capsuleCount, label:"SkillCapsules live", c:"var(--navy-800)", icon:"⚡", desc:"On The Showfloor" },
            ].map((s,i)=>(
              <div key={i} style={{ background:"white", padding:"24px 16px", textAlign:"center" }}>
                <div style={{ fontSize:20,marginBottom:4 }}>{s.icon}</div>
                <div className="hp-display" style={{ fontSize:28,fontWeight:800,color:s.c,animation:countStart?`countUp .6s ${i*150}ms ease both`:"none" }}>
                  {statsLoaded?`${s.val.toLocaleString()}+`:"—"}
                </div>
                <div style={{ fontSize:11.5,color:"var(--ink)",fontWeight:700,marginTop:2 }}>{s.label}</div>
                <div style={{ fontSize:10,color:"var(--slate)",fontWeight:500,marginTop:1 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ══════ LIVE JOBS ══════ */}
      <LiveJobsSection jobs={jobs}/>

      {/* ══════ HOW IT WORKS ══════ */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"72px 24px 60px" }}>
        <Reveal>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <span style={{ display:"inline-block",background:"#FFF1E8",color:"var(--orange)",padding:"5px 16px",borderRadius:999,fontSize:11.5,fontWeight:800,marginBottom:14,letterSpacing:"0.05em" }}>🗺️ HOW IT WORKS</span>
            <h2 className="hp-display" style={{ fontSize:32,fontWeight:800,color:"var(--ink)",letterSpacing:"-0.02em",margin:"0 0 10px" }}>Apply with proof, not promises</h2>
            <p style={{ color:"var(--slate)",fontSize:15,margin:"0 auto",maxWidth:500,lineHeight:1.7 }}>OfSkillJob replaces keyword-matched résumés with verified skill output — in 3 simple steps.</p>
          </div>
        </Reveal>
        <div className="mobile-hscroll">
          <div className="col3" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
            {[
              { step:"01",icon:"📋",title:"Company posts a task",desc:"Every job listing includes a real challenge — a coding problem, design brief, or business scenario.",c:"var(--navy-800)",emoji:"🏢" },
              { step:"02",icon:"💪",title:"You launch a SkillCapsule",desc:"Submit your solution and it auto-publishes on The Showfloor for recruiters to discover.",c:"var(--orange)",emoji:"⚡" },
              { step:"03",icon:"🎯",title:"Company reviews & hires",desc:"Hiring teams see your real work output and CraftRank™ — no résumé black holes.",c:"var(--sky)",emoji:"🚀" },
            ].map((step,i)=>(
              <Reveal key={i} delay={i*110}>
                <div className="hp-card" style={{ background:"white",borderRadius:22,padding:"32px 26px",border:"1px solid var(--border)",height:"100%",position:"relative",overflow:"hidden" }}>
                  <div style={{ position:"absolute",top:14,right:18,fontSize:50,fontWeight:900,color:`${step.c}10`,fontFamily:"Sora,sans-serif",lineHeight:1 }}>{step.step}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
                    <div style={{ width:52,height:52,borderRadius:16,background:`${step.c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>{step.icon}</div>
                    <span style={{ fontSize:28 }}>{step.emoji}</span>
                  </div>
                  <h3 className="hp-display" style={{ fontSize:17,fontWeight:700,color:"var(--ink)",margin:"0 0 8px" }}>{step.title}</h3>
                  <p style={{ margin:0,color:"var(--slate)",fontSize:13.5,lineHeight:1.75 }}>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ LIVE CAPSULES ══════ */}
      <LiveCapsulesSection capsules={capsules}/>

      {/* ══════ FEATURE SPLIT ══════ */}
      <div style={{ background:"var(--surface)", padding:"80px 0" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:40 }}>
              <span style={{ display:"inline-block",background:"var(--border)",color:"var(--slate)",padding:"5px 16px",borderRadius:999,fontSize:11.5,fontWeight:800,marginBottom:14,letterSpacing:"0.05em" }}>⚡ BUILT FOR BOTH SIDES</span>
              <h2 className="hp-display" style={{ fontSize:30,fontWeight:800,color:"var(--ink)",letterSpacing:"-0.02em",margin:0 }}>One platform. Two paths. Real results.</h2>
            </div>
          </Reveal>
          <div className="col2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <Reveal>
              <div className="hp-card" style={{ background:"linear-gradient(160deg,#0A1B33,#123A5E)",borderRadius:26,padding:"40px 32px",color:"white",height:"100%",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(76,195,245,.1)",filter:"blur(40px)" }}/>
                <div style={{ position:"relative",zIndex:1 }}>
                  <div style={{ fontSize:36,marginBottom:16 }}>👤✨</div>
                  <h3 className="hp-display" style={{ fontSize:22,fontWeight:800,margin:"0 0 10px" }}>For Job Seekers</h3>
                  <p style={{ color:"#B9C6DC",fontSize:14,lineHeight:1.8,margin:"0 0 18px" }}>Build a Skills Profile, complete Skill Forges, and earn Clout. Recruiters discover you — not the other way around.</p>
                  <ul style={{ paddingLeft:0,listStyle:"none",margin:"0 0 24px",display:"flex",flexDirection:"column",gap:8 }}>
                    {["🎯 Create a SkillCapsule in minutes","📊 Earn your CraftRank™ score","🌟 Get discovered on The Showfloor","🚫 No résumé required — ever"].map(f=>(
                      <li key={f} style={{ fontSize:13.5,color:"#B9C6DC",display:"flex",alignItems:"center",gap:6 }}>
                        <span style={{ color:"var(--sky)",fontWeight:800,flexShrink:0 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <a href="/for-talent" style={{ color:"var(--orange)",fontWeight:800,fontSize:14,textDecoration:"none" }}>Explore for talent →</a>
                </div>
              </div>
            </Reveal>
            <Reveal delay={110}>
              <div className="hp-card" style={{ background:"white",borderRadius:26,padding:"40px 32px",border:"1px solid var(--border)",height:"100%",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(255,122,41,.06)",filter:"blur(40px)" }}/>
                <div style={{ position:"relative",zIndex:1 }}>
                  <div style={{ fontSize:36,marginBottom:16 }}>🏢🔍</div>
                  <h3 className="hp-display" style={{ fontSize:22,fontWeight:800,color:"var(--ink)",margin:"0 0 10px" }}>For Companies</h3>
                  <p style={{ color:"var(--slate)",fontSize:14,lineHeight:1.8,margin:"0 0 18px" }}>Post a job with a built-in task, launch a Skill Forge, and discover proven candidates on The Showfloor.</p>
                  <ul style={{ paddingLeft:0,listStyle:"none",margin:"0 0 24px",display:"flex",flexDirection:"column",gap:8 }}>
                    {["📋 Post with a real task built in","⚡ Launch a Skill Forge challenge","🌟 Browse The Showfloor for talent","✅ Hire based on proven output"].map(f=>(
                      <li key={f} style={{ fontSize:13.5,color:"var(--slate)",display:"flex",alignItems:"center",gap:6 }}>
                        <span style={{ color:"var(--orange)",fontWeight:800,flexShrink:0 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <a href="/for-companies" style={{ color:"var(--sky)",fontWeight:800,fontSize:14,textDecoration:"none" }}>Explore for companies →</a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* ══════ COMMUNITY FEEDBACK ══════ */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"80px 24px" }}>
        <Reveal>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <span style={{ display:"inline-block",background:"#EAF8FF",color:"var(--sky)",padding:"5px 16px",borderRadius:999,fontSize:11.5,fontWeight:800,marginBottom:14,letterSpacing:"0.05em" }}>💬 COMMUNITY FEEDBACK</span>
            <h2 className="hp-display" style={{ fontSize:30,fontWeight:800,color:"var(--ink)",letterSpacing:"-0.02em",margin:0 }}>Trusted by people getting real results 🏆</h2>
          </div>
        </Reveal>
        <div className="mobile-hscroll">
          <div className="col3" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
            {[
              { name:"Aman Khan",role:"Backend Dev",quote:"I stopped writing cover letters and started launching SkillCapsules. Got three calls in a week.",initial:"A",color:"#FF7A29" },
              { name:"Tanya Ghosh",role:"Recruiter, Nexora",quote:"The Showfloor cut our screening time in half — we only ever see completed, real work.",initial:"T",color:"#4CC3F5" },
              { name:"Jashn Kaswan",role:"Product Designer",quote:"CraftRank™ made my portfolio feel alive instead of static. Recruiters actually engage with it.",initial:"J",color:"#123A5E" },
            ].map((t,i)=>(
              <Reveal key={i} delay={i*110}>
                <div className="hp-card" style={{ background:"white",borderRadius:22,padding:"26px 24px",border:"1px solid var(--border)",height:"100%" }}>
                  <div style={{ color:"#FBBF24",fontSize:14,marginBottom:12,letterSpacing:2 }}>★★★★★</div>
                  <p style={{ fontSize:14,color:"var(--ink)",lineHeight:1.75,margin:"0 0 18px",fontStyle:"italic" }}>"{t.quote}"</p>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:38,height:38,borderRadius:"50%",background:t.color,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:14,flexShrink:0 }}>{t.initial}</div>
                    <div>
                      <p style={{ margin:0,fontSize:13.5,fontWeight:800,color:"var(--ink)" }}>{t.name}</p>
                      <p style={{ margin:0,fontSize:11.5,color:"var(--slate)" }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ CTA BAND ══════ */}
      <Reveal>
        <div style={{ maxWidth:1200, margin:"0 auto 80px", padding:"0 24px" }}>
          <div style={{ background:"linear-gradient(135deg,#0A1B33,#123A5E 60%,#1B4A73)",backgroundSize:"200% 200%",animation:"gradShift 8s ease infinite",borderRadius:30,padding:"60px 44px",textAlign:"center",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:-60,right:-60,width:260,height:260,borderRadius:"50%",background:"rgba(255,122,41,.2)",filter:"blur(60px)" }}/>
            <div style={{ position:"absolute",bottom:-40,left:-40,width:200,height:200,borderRadius:"50%",background:"rgba(76,195,245,.14)",filter:"blur(50px)" }}/>
            <div style={{ position:"relative",zIndex:1 }}>
              <div style={{ fontSize:40,marginBottom:12 }}>🚀</div>
              <span style={{ display:"inline-block",background:"rgba(255,122,41,.2)",border:"1px solid rgba(255,122,41,.4)",color:"var(--orange)",padding:"5px 16px",borderRadius:999,fontSize:11.5,fontWeight:800,marginBottom:18,letterSpacing:"0.05em" }}>
                JOIN THOUSANDS OF PROFESSIONALS
              </span>
              <h2 className="hp-display" style={{ fontSize:34,fontWeight:800,color:"white",margin:"0 0 14px",letterSpacing:"-0.025em" }}>
                Your next opportunity is one<br/>SkillCapsule away. ⚡
              </h2>
              <p style={{ color:"#B9C6DC",fontSize:15.5,margin:"0 auto 32px",maxWidth:500,lineHeight:1.72 }}>
                Join thousands of professionals who skipped the résumé game and got hired by showing what they can do.
              </p>
              <div style={{ display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap" }}>
                <button onClick={handleGetHired} className="btn-white">🎯 Get Hired Free →</button>
                <button onClick={handleHireTalent} className="btn-ghost">🏢 Hire Talent</button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ══════ FOOTER — Follow Us Only ══════ */}
      <footer style={{ borderTop:"1px solid var(--border)", padding:"44px 24px 36px", background:"white" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:24 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <img src="/favicon.png" alt="OfSkillJob" width={28} height={28} style={{ borderRadius:8,objectFit:"contain" }}
              onError={e=>{ const img=e.target as HTMLImageElement; img.style.display="none"; const d=document.createElement("div"); d.style.cssText="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#FF7A29,#4CC3F5);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:13px;font-family:Sora,sans-serif;"; d.textContent="O"; img.parentNode?.insertBefore(d,img); }}
            />
            <span className="hp-display" style={{ fontSize:16,fontWeight:800,color:"var(--navy-900)" }}>OfSkillJob</span>
            <span style={{ fontSize:12,color:"var(--slate)" }}>© OfSkillJob.</span>
          </div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:12 }}>
            <p className="hp-display" style={{ margin:0,fontSize:12,fontWeight:800,color:"var(--slate)",letterSpacing:"0.08em",textTransform:"uppercase" }}>🌐 Follow Us</p>
            <div style={{ display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center" }}>
              {[
                { href:"https://www.linkedin.com/company/ofskilljob",label:"LinkedIn",hoverBg:"#0077B5",icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                { href:"https://t.me/OfSkillJob",label:"Telegram",hoverBg:"#0088cc",icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
                { href:"https://reddit.com/u/OfSkillJob",label:"Reddit",hoverBg:"#FF4500",icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg> },
              ].map(({href,label,hoverBg,icon})=>(
                <SocialLink key={label} href={href} label={label} hoverBg={hoverBg} icon={icon}/>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function SocialLink({href,label,hoverBg,icon}:{href:string;label:string;hoverBg:string;icon:React.ReactNode}) {
  const [h,setH]=useState(false);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 20px",borderRadius:999,border:`1px solid ${h?hoverBg:"var(--border)"}`,textDecoration:"none",fontSize:13.5,fontWeight:600,background:h?hoverBg:"transparent",color:h?"white":"var(--ink)",transition:"all .22s cubic-bezier(.2,.8,.2,1)" }}
    >
      {icon}{label}
    </a>
  );
}