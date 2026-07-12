"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ════════════════════════════════════════════════════════════════
   DESIGN SYSTEM — "Skill-First SaaS" v2
   Navy #0A1B33 → #123A5E   Orange #FF7A29   Sky #4CC3F5
   Ink #0B1220   Slate #64748B   Surface #F7F9FC   Border #E6EAF2
   Display: Sora   Body: Inter

   v2 additions: animated aurora hero background, mouse-tilt floating
   card, full-circle CraftRank gauge, bento-grid feature showcase,
   connecting-line "How it Works", live social-proof activity toast
   driven by real Supabase data (not fabricated numbers).

   NOTE ON SEO: client component — set <title>/<meta> via
   `export const metadata` in the parent server page.tsx.
   NOTE ON PHOTOS: testimonial avatars use pravatar.cc (licensed
   placeholder photos) — swap for real, permission-cleared photos
   once you have live testimonials.
   Global navbar/footer nav links are handled by your app shell.
   ════════════════════════════════════════════════════════════════ */

function useCounter(target: number, duration = 1400, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(step); else setCount(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity .7s cubic-bezier(.2,.8,.2,1) ${delay}ms, transform .7s cubic-bezier(.2,.8,.2,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    function onScroll() {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

function useParallax(speed = 0.15) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    function onScroll() { setOffset(window.scrollY * speed); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);
  return offset;
}

/* Mouse-tilt — lightweight "magnetic card" effect, no dependency needed */
function useTilt(maxTilt = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -maxTilt, y: px * maxTilt });
  }, [maxTilt]);
  const onMouseLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);
  return { ref, tilt, onMouseMove, onMouseLeave };
}

/* ── Hand-built flat-design hero illustration ── */
function HeroIllustration() {
  return (
    <svg viewBox="0 0 640 520" style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id="deskA" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FF9558" /><stop offset="100%" stopColor="#FF7A29" /></linearGradient>
        <linearGradient id="deskB" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6FD3FA" /><stop offset="100%" stopColor="#4CC3F5" /></linearGradient>
      </defs>
      <ellipse cx="320" cy="470" rx="230" ry="18" fill="#08152A" opacity="0.35" />
      <g transform="translate(60,230)">
        <rect x="0" y="120" width="150" height="14" rx="7" fill="#0F2A4E" />
        <rect x="14" y="60" width="120" height="64" rx="10" fill="#F7F9FC" />
        <rect x="30" y="40" width="88" height="26" rx="4" fill="#123A5E" />
        <circle cx="74" cy="34" r="4" fill="#4CC3F5" />
        <rect x="55" y="-30" width="46" height="60" rx="18" fill="url(#deskA)" />
        <circle cx="78" cy="-52" r="22" fill="#FFD9BE" />
        <path d="M56 -60 q22 -22 44 0 q4 14 -6 18 q-6 -14 -16 -14 q-10 0 -16 14 q-10 -4 -6 -18Z" fill="#0F2A4E" />
        <rect x="52" y="4" width="52" height="16" rx="8" fill="#0F2A4E" />
      </g>
      <g transform="translate(270,150)">
        <rect x="20" y="220" width="70" height="14" rx="7" fill="#0F2A4E" opacity="0.5" />
        <rect x="30" y="90" width="50" height="110" rx="20" fill="url(#deskB)" />
        <rect x="10" y="120" width="26" height="70" rx="10" fill="url(#deskB)" />
        <rect x="84" y="110" width="26" height="60" rx="10" fill="#FFD9BE" />
        <rect x="86" y="118" width="30" height="42" rx="6" fill="#0F2A4E" />
        <rect x="90" y="124" width="22" height="6" rx="2" fill="#4CC3F5" />
        <circle cx="55" cy="60" r="26" fill="#FFD9BE" />
        <path d="M30 54 q25 -30 50 0 q4 18 -8 22 q-6 -18 -17 -18 q-11 0 -17 18 q-12 -4 -8 -22Z" fill="#0F2A4E" />
      </g>
      <g transform="translate(430,250)">
        <rect x="0" y="100" width="150" height="14" rx="7" fill="#0F2A4E" />
        <rect x="30" y="10" width="90" height="66" rx="8" fill="#0F2A4E" />
        <rect x="40" y="20" width="70" height="46" rx="4" fill="#F7F9FC" />
        <rect x="55" y="40" width="16" height="20" fill="#FF7A29" opacity="0.85" />
        <rect x="75" y="30" width="16" height="30" fill="#4CC3F5" opacity="0.85" />
        <rect x="95" y="46" width="16" height="14" fill="#FF9558" opacity="0.85" />
        <rect x="68" y="76" width="14" height="14" fill="#0F2A4E" />
        <rect x="30" y="-14" width="52" height="60" rx="18" fill="url(#deskA)" />
        <circle cx="56" cy="-34" r="22" fill="#FFD9BE" />
        <path d="M34 -42 q22 -22 44 0 q4 14 -6 18 q-6 -14 -16 -14 q-10 0 -16 14 q-10 -4 -6 -18Z" fill="#0F2A4E" />
      </g>
      <circle cx="90" cy="120" r="6" fill="#4CC3F5" opacity="0.7" />
      <circle cx="560" cy="180" r="8" fill="#FF7A29" opacity="0.6" />
      <circle cx="520" cy="90" r="5" fill="#FFFFFF" opacity="0.5" />
      <circle cx="150" cy="60" r="5" fill="#FFFFFF" opacity="0.4" />
    </svg>
  );
}

/* Full-circle CraftRank gauge — rotated -90deg so it fills clockwise from top */
function CraftRankGauge({ score = 88, animate }: { score?: number; animate: boolean }) {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setProgress(score), 350);
    return () => clearTimeout(t);
  }, [animate, score]);
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div style={{ position: "relative", width: 68, height: 68 }}>
      <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="#E6EAF2" strokeWidth="6" />
        <circle cx="34" cy="34" r={r} fill="none" stroke="#4CC3F5" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: 15, color: "#0B1220" }}>{progress}</div>
    </div>
  );
}

const CAT_ICON: Record<string, string> = {
  design: "🎨", development: "💻", writing: "✍️", sales: "💼",
  marketing: "📈", research: "🔬", communication: "💬",
};

export default function HomeClient() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [liveStats, setLiveStats] = useState({ jobs: 0, companies: 0, applications: 0, capsules: 0 });
  const [countStart, setCountStart] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const jobCount = useCounter(liveStats.jobs, 1300, countStart);
  const companyCount = useCounter(liveStats.companies, 1500, countStart);
  const appCount = useCounter(liveStats.applications, 1700, countStart);
  const capsuleCount = useCounter(liveStats.capsules, 1400, countStart);
  const [gaugeVisible, setGaugeVisible] = useState(false);
  const scrollProgress = useScrollProgress();
  const auroraOffset = useParallax(0.08);
  const tilt = useTilt(9);

  interface Job { id: string; title: string; company_name?: string; location: string | null; salary_min: number | null; salary_max: number | null; slug: string; }
  const [liveJobs, setLiveJobs] = useState<Job[]>([]);

  interface Capsule { id: string; title: string; category: string; skill_impact_score: number; user_full_name?: string; user_username?: string; }
  const [topCapsules, setTopCapsules] = useState<Capsule[]>([]);

  // ── Live activity feed — combines real jobs + capsules into one rotating
  // toast, the "social proof" pattern viral SaaS landing pages use. ──
  type ActivityItem = { key: string; icon: string; text: string };
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [activityIndex, setActivityIndex] = useState(0);
  const [activityVisible, setActivityVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (data?.role === "company") { router.replace("/for-companies"); return; }
        router.replace("/for-talent");
        return;
      }
      setCheckingAuth(false);
    })();
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;
    (async () => {
      const [jobRes, companyRes, appRes, capRes] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "company"),
        supabase.from("job_applications").select("id", { count: "exact", head: true }),
        supabase.from("skill_capsules").select("id", { count: "exact", head: true }),
      ]);
      setLiveStats({ jobs: jobRes.count || 0, companies: companyRes.count || 0, applications: appRes.count || 0, capsules: capRes.count || 0 });
      setStatsLoaded(true);
    })();
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, location, salary_min, salary_max, slug, users:company_id ( company_name )")
        .eq("status", "active").order("created_at", { ascending: false }).limit(6);
      if (data) setLiveJobs(data.map((j: any) => ({ id: j.id, title: j.title, company_name: j.users?.company_name || "Company", location: j.location, salary_min: j.salary_min, salary_max: j.salary_max, slug: j.slug })));
    })();
    (async () => {
      const { data } = await supabase
        .from("skill_capsules")
        .select("id, title, category, skill_impact_score, user:user_id ( full_name, username )")
        .eq("visibility", "public").order("skill_impact_score", { ascending: false }).limit(6);
      if (data) setTopCapsules(data.map((c: any) => ({ id: c.id, title: c.title, category: c.category, skill_impact_score: c.skill_impact_score || 0, user_full_name: c.user?.full_name, user_username: c.user?.username })));
    })();
  }, [checkingAuth]);

  useEffect(() => {
    if (!statsLoaded) return;
    const el = statsRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setCountStart(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [statsLoaded]);

  useEffect(() => {
    const t = setTimeout(() => setGaugeVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Build the activity feed once real data has loaded
  useEffect(() => {
    if (topCapsules.length === 0 && liveJobs.length === 0) return;
    const items: ActivityItem[] = [
      ...topCapsules.slice(0, 4).map(c => ({ key: `cap-${c.id}`, icon: CAT_ICON[c.category?.toLowerCase()] || "📎", text: `${c.user_full_name || "Someone"} launched "${c.title}"` })),
      ...liveJobs.slice(0, 4).map(j => ({ key: `job-${j.id}`, icon: "💼", text: `${j.company_name} is hiring: ${j.title}` })),
    ];
    setActivityFeed(items.sort(() => Math.random() - 0.5));
  }, [topCapsules, liveJobs]);

  // Rotate the activity toast every 5s, with its own fade in/out
  useEffect(() => {
    if (activityFeed.length === 0) return;
    const showTimer = setTimeout(() => setActivityVisible(true), 2500);
    const interval = setInterval(() => {
      setActivityVisible(false);
      setTimeout(() => {
        setActivityIndex(i => (i + 1) % activityFeed.length);
        setActivityVisible(true);
      }, 400);
    }, 5000);
    return () => { clearTimeout(showTimer); clearInterval(interval); };
  }, [activityFeed.length]);

  function handleGetHired() { localStorage.setItem("selectedRole", "developer"); router.push("/signup"); }
  function handleHireTalent() { localStorage.setItem("selectedRole", "company"); router.push("/signup"); }

  if (checkingAuth) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", background: "#F7F9FC" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: "3px solid #E6EAF2", borderTopColor: "#FF7A29", animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  const testimonials = [
    { name: "Aman Khan", role: "Backend Developer", quote: "I stopped writing cover letters and started launching SkillCapsules. Got three Calls in a week. 🚀", photo: "https://i.pravatar.cc/120?img=12" },
    { name: "Tanya Ghosh", role: "Recruiter, Nexora", quote: "The Showfloor cut our screening time in half — we only ever see completed, real work. 🎯", photo: "https://i.pravatar.cc/120?img=45" },
    { name: "Jashn Kaswan", role: "Product Designer", quote: "CraftRank made my portfolio feel alive instead of static. Recruiters actually engage with it. 💡", photo: "https://i.pravatar.cc/120?img=33" },
  ];

  const bentoFeatures = [
    { title: "SkillCapsule", icon: "📎", desc: "Your proof of work, published and discoverable — not a static PDF résumé.", big: true, c: "var(--orange)" },
    { title: "CraftRank", icon: "🏆", desc: "A live reputation score built from real engagement.", big: false, c: "var(--sky)" },
    { title: "The Showfloor", icon: "🎪", desc: "Where recruiters browse public SkillCapsules.", big: false, c: "var(--navy-800)" },
    { title: "SkillSignal", icon: "⚡", desc: "Quick recognition from peers & recruiters for specific strengths.", big: false, c: "var(--orange)" },
    { title: "Spotlight & Call", icon: "🔦", desc: "Direct recruiter interest — no cold outreach required.", big: true, c: "var(--sky)" },
    { title: "The Roster", icon: "📊", desc: "The live leaderboard ranking talent by Clout & CraftRank.", big: false, c: "var(--navy-800)" },
  ];

  const activeItem = activityFeed[activityIndex];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "Organization", name: "OfSkillJob",
        description: "OfSkillJob is a skill-first hiring platform where candidates prove their abilities with real tasks (SkillCapsules) before applying.",
        url: "https://ofskilljob.com", logo: "https://ofskilljob.com/favicon.png",
        sameAs: ["https://www.linkedin.com/company/ofskilljob", "https://t.me/OfSkillJob", "https://reddit.com/u/OfSkillJob"],
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "WebSite", name: "OfSkillJob", url: "https://ofskilljob.com",
        potentialAction: { "@type": "SearchAction", target: "https://ofskilljob.com/jobs?q={search_term_string}", "query-input": "required name=search_term_string" },
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "Is OfSkillJob free for job seekers?", acceptedAnswer: { "@type": "Answer", text: "Yes — every feature for job seekers, including Skill Forges, SkillCapsules, and applying to jobs, is 100% free." } },
          { "@type": "Question", name: "What is a SkillCapsule?", acceptedAnswer: { "@type": "Answer", text: "A SkillCapsule is a published proof of work — a completed task or challenge submission that appears on The Showfloor for recruiters to discover." } },
          { "@type": "Question", name: "How does CraftRank work?", acceptedAnswer: { "@type": "Answer", text: "CraftRank is a reputation score built from SkillSignals, Spotlights, and Calls a candidate receives. Higher CraftRank means better visibility in feeds and search." } },
        ],
      }) }} />

      <div style={{ position: "fixed", top: 0, left: 0, height: 3, width: `${scrollProgress}%`, background: "linear-gradient(90deg,#FF7A29,#4CC3F5)", zIndex: 999, transition: "width .1s linear" }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
        :root{
          --navy-900:#0A1B33; --navy-800:#123A5E; --navy-700:#1B4A73;
          --orange:#FF7A29; --orange-light:#FF9558; --sky:#4CC3F5;
          --ink:#0B1220; --slate:#64748B; --surface:#F7F9FC; --border:#E6EAF2;
        }
        *,*::before,*::after{box-sizing:border-box}
        html,body{ overflow-x:hidden !important; background:#fff; }
        .hp{ font-family:'Inter',system-ui,sans-serif; color:var(--ink); }
        .hp-display{ font-family:'Sora',sans-serif; }
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes ringPulse{0%{box-shadow:0 0 0 0 rgba(255,122,41,.4)}70%{box-shadow:0 0 0 10px rgba(255,122,41,0)}100%{box-shadow:0 0 0 0 rgba(255,122,41,0)}}
        @keyframes auroraDrift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.15)}}
        @keyframes auroraDrift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,20px) scale(1.1)}}
        @keyframes auroraDrift3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,40px) scale(1.2)}}
        @keyframes toastSlide{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes lineGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes bounceSlow{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

        .hp-btn-primary{ background:var(--orange); color:white; border:none; padding:11px 22px; border-radius:999px; font-weight:700; font-size:14px; cursor:pointer; transition:transform .18s,box-shadow .18s; box-shadow:0 6px 16px rgba(255,122,41,.32); }
        .hp-btn-primary:hover{ transform:translateY(-2px); box-shadow:0 10px 22px rgba(255,122,41,.4); }
        .hp-btn-white{ background:white; color:var(--navy-900); border:none; padding:13px 26px; border-radius:999px; font-weight:800; font-size:15px; cursor:pointer; transition:transform .18s,box-shadow .18s; }
        .hp-btn-white:hover{ transform:translateY(-2px) scale(1.02); box-shadow:0 10px 26px rgba(0,0,0,.25); }
        .hp-btn-ghost{ background:rgba(255,255,255,.08); color:white; border:1.5px solid rgba(255,255,255,.4); padding:12px 25px; border-radius:999px; font-weight:700; font-size:15px; cursor:pointer; transition:all .18s; }
        .hp-btn-ghost:hover{ background:rgba(255,255,255,.16); transform:translateY(-2px); }

        .hp-hero{ position:relative; background:linear-gradient(135deg,var(--navy-900) 0%,var(--navy-800) 55%,var(--navy-700) 100%); overflow:hidden; }
        .hp-aurora{ position:absolute; border-radius:50%; filter:blur(70px); pointer-events:none; mix-blend-mode:screen; }
        .hp-float-card{ animation: float 5.5s ease-in-out infinite, bounceSlow 5.5s ease-in-out infinite; transition: transform .15s ease-out; }
        .hp-dot{ animation: pulseDot 2s infinite; }
        .hp-ring{ animation: ringPulse 2.2s infinite; }
        .hp-glass{ background:rgba(255,255,255,.9); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,.5); }

        .hp-card{ transition:transform .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s ease; }
        .hp-card:hover{ transform:translateY(-5px); box-shadow:0 20px 44px rgba(10,27,51,.1); }
        .hp-bento:hover{ transform:translateY(-4px) scale(1.01); }

        .hp-fadeup{ animation: fadeUp .7s cubic-bezier(.2,.8,.2,1) both; }
        .hp-shimmer{ background:linear-gradient(90deg,#f1f5f9 25%,#e9edf3 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }

        .hp-marquee-track{ display:flex; gap:14px; width:max-content; animation:marquee 28s linear infinite; }
        .hp-marquee-wrap:hover .hp-marquee-track{ animation-play-state:paused; }

        .hp-social{ width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--surface); border:1px solid var(--border); text-decoration:none; font-size:16px; transition:transform .18s,background .18s; }
        .hp-social:hover{ transform:translateY(-3px); background:var(--navy-900); }

        .hp-toast{ animation: toastSlide .4s cubic-bezier(.2,.8,.2,1) both; }
        .hp-connector{ transform-origin:left center; animation: lineGrow 1s cubic-bezier(.2,.8,.2,1) both; }

        @media(max-width:900px){
          .hp-hero-grid{ grid-template-columns:1fr !important; gap:40px !important; text-align:center; }
          .hp-hero-cta{ justify-content:center !important; }
          .hp-hero-illus{ max-width:420px; margin:0 auto; }
          .hp-title{ font-size:38px !important; }
          .hp-stats-grid{ grid-template-columns:1fr 1fr !important; }
          .hp-3col{ grid-template-columns:1fr !important; }
          .hp-4col{ grid-template-columns:1fr 1fr !important; }
          .hp-bento-grid{ grid-template-columns:1fr 1fr !important; }
          .hp-bento-big{ grid-column:span 2 !important; }
          .hp-connector-line{ display:none !important; }
          .hp-activity-toast{ left:12px !important; right:12px !important; bottom:12px !important; max-width:none !important; }
        }
        @media(max-width:480px){
          .hp-title{ font-size:30px !important; }
          .hp-4col{ grid-template-columns:1fr !important; }
          .hp-bento-grid{ grid-template-columns:1fr !important; }
          .hp-bento-big{ grid-column:span 1 !important; }
          .hp-hero-badge-list{ flex-direction:column !important; }
        }
      `}</style>

      <div className="hp">

        {/* ══════ HERO — with animated aurora background ══════ */}
        <div className="hp-hero">
          <div className="hp-aurora" style={{ width: 420, height: 420, top: -100 - auroraOffset * 0.15, left: -80, background: "radial-gradient(circle,rgba(255,122,41,.5),transparent 70%)", animation: "auroraDrift1 9s ease-in-out infinite" }} />
          <div className="hp-aurora" style={{ width: 380, height: 380, top: 60, right: -60 + auroraOffset * 0.1, background: "radial-gradient(circle,rgba(76,195,245,.45),transparent 70%)", animation: "auroraDrift2 11s ease-in-out infinite" }} />
          <div className="hp-aurora" style={{ width: 320, height: 320, bottom: -80, left: "38%", background: "radial-gradient(circle,rgba(27,74,115,.55),transparent 70%)", animation: "auroraDrift3 13s ease-in-out infinite" }} />

          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 24px 90px", position: "relative", zIndex: 1 }}>
            <div className="hp-fadeup" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
              <img src="/favicon.png" alt="OfSkillJob logo" width={34} height={34} style={{ borderRadius: 9, boxShadow: "0 4px 14px rgba(0,0,0,.25)" }} />
              <span className="hp-display" style={{ fontSize: 18, fontWeight: 800, color: "white", letterSpacing: "-0.01em" }}>OfSkillJob</span>
            </div>

            <div className="hp-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 40, alignItems: "center" }}>
              <div className="hp-fadeup">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", color: "#93c5fd", padding: "5px 14px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, marginBottom: 18, letterSpacing: "0.05em" }}>
                  <span className="hp-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
                  🇮🇳 INDIA'S SKILL-FIRST HIRING PLATFORM
                </div>
                <h1 className="hp-title hp-display" style={{ fontSize: 52, fontWeight: 800, color: "white", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
                  Your Skills Are<br />your <span style={{ color: "var(--orange)" }}>Résumé.</span> ✨
                </h1>
                <p style={{ fontSize: 17, color: "#B9C6DC", lineHeight: 1.7, margin: "0 0 30px", maxWidth: 460 }}>
                  Every hire on OfSkillJob starts with real work, not a résumé. Complete a task, launch a SkillCapsule 📎, and let companies discover what you can actually do.
                </p>
                <div className="hp-hero-cta" style={{ display: "flex", gap: 14, marginBottom: 30 }}>
                  <button onClick={handleGetHired} className="hp-btn-white">🚀 Get Hired Free</button>
                  <button onClick={handleHireTalent} className="hp-btn-ghost">🏢 Hire Talent</button>
                </div>
                <div className="hp-hero-badge-list" style={{ display: "flex", gap: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span className="hp-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sky)", display: "inline-block" }} />
                    <span style={{ fontSize: 12.5, color: "#B9C6DC", fontWeight: 600 }}>⚡ {statsLoaded ? liveStats.applications.toLocaleString() : "—"} applications filed</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span className="hp-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--orange)", display: "inline-block", animationDelay: ".5s" }} />
                    <span style={{ fontSize: 12.5, color: "#B9C6DC", fontWeight: 600 }}>📎 {statsLoaded ? liveStats.capsules.toLocaleString() : "—"} SkillCapsules live</span>
                  </div>
                </div>
              </div>

              <div style={{ position: "relative" }}>
                <div className="hp-hero-illus" style={{ position: "relative" }}>
                  <HeroIllustration />
                  <div
                    ref={tilt.ref}
                    onMouseMove={tilt.onMouseMove}
                    onMouseLeave={tilt.onMouseLeave}
                    className="hp-float-card hp-glass"
                    style={{
                      position: "absolute", top: "6%", right: "-4%", width: 216, borderRadius: 18, padding: "16px 16px 14px",
                      boxShadow: "0 20px 50px rgba(0,0,0,.28)",
                      transform: `perspective(600px) rotateX(${tilt.tilt.x}deg) rotateY(${tilt.tilt.y}deg)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#FFD9BE,#FF9558)", flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "var(--ink)" }}>SkillCapsule 📎</p>
                        <p style={{ margin: 0, fontSize: 10, color: "var(--slate)", fontWeight: 600, whiteSpace: "nowrap" }}>Alex Chen · Frontend Dev</p>
                      </div>
                      <span style={{ marginLeft: "auto", fontSize: 14 }}>✅</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      {["#F7DF1E", "#61DAFB", "#22C55E"].map((c, i) => (
                        <div key={i} style={{ width: 24, height: 24, borderRadius: 7, background: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{i === 2 ? "✓" : ""}</div>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 9.5, color: "var(--slate)", fontWeight: 700 }}>🏆 CraftRank</p>
                        <p style={{ margin: 0, fontSize: 9, color: "var(--slate)" }}>Top 5% this week</p>
                      </div>
                      <CraftRankGauge score={88} animate={gaugeVisible} />
                    </div>
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 10 }}>
                      <p style={{ margin: 0, fontSize: 9.5, color: "var(--slate)", fontWeight: 600 }}>✔ Task Completed:</p>
                      <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink)", fontWeight: 800 }}>Weather App Dashboard</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ TRUST / LIVE STATS ══════ */}
        <Reveal>
          <div ref={statsRef} style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
            <div className="hp-stats-grid hp-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "var(--border)", borderRadius: 20, overflow: "hidden", marginTop: -46, position: "relative", zIndex: 2, boxShadow: "0 20px 50px rgba(10,27,51,.08)" }}>
              {[
                { val: companyCount, label: "Verified companies", c: "var(--navy-800)", icon: "🏢" },
                { val: jobCount, label: "Active listings", c: "var(--orange)", icon: "💼" },
                { val: appCount, label: "Applications filed", c: "var(--sky)", icon: "📥" },
                { val: capsuleCount, label: "SkillCapsules live", c: "var(--navy-800)", icon: "📎" },
              ].map((s, i) => (
                <div key={i} style={{ background: "white", padding: "26px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div className="hp-display" style={{ fontSize: 28, fontWeight: 800, color: s.c }}>{statsLoaded ? `${s.val}+` : "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--slate)", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ══════ TRENDING SKILLS MARQUEE ══════ */}
        {topCapsules.length > 0 && (
          <div className="hp-marquee-wrap" style={{ marginTop: 50, borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "16px 0", overflow: "hidden" }}>
            <div className="hp-marquee-track">
              {[...topCapsules, ...topCapsules].map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, padding: "8px 16px", flexShrink: 0 }}>
                  <span>{CAT_ICON[c.category?.toLowerCase()] || "⚡"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{c.title}</span>
                  <span style={{ fontSize: 11, color: "var(--orange)", fontWeight: 800 }}>🏆 {c.skill_impact_score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ HOW IT WORKS — with animated connecting line ══════ */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "90px 24px 70px" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ display: "inline-block", background: "#FFF1E8", color: "var(--orange)", padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 14, letterSpacing: "0.04em" }}>⚙️ HOW IT WORKS</span>
              <h2 className="hp-display" style={{ fontSize: 34, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", margin: "0 0 12px" }}>Apply with proof, not promises</h2>
              <p style={{ color: "var(--slate)", fontSize: 15.5, margin: "0 auto", maxWidth: 520 }}>OfSkillJob replaces keyword-matched résumés with verified skill output.</p>
            </div>
          </Reveal>
          <div style={{ position: "relative" }}>
            <div className="hp-connector-line hp-connector" style={{ position: "absolute", top: 26, left: "16.5%", right: "16.5%", height: 2, background: "repeating-linear-gradient(90deg,var(--border) 0 8px,transparent 8px 14px)", zIndex: 0 }} />
            <div className="hp-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22, position: "relative", zIndex: 1 }}>
              {[
                { n: "1", icon: "📋", title: "Company posts a task", desc: "Every job listing includes a real challenge — a coding problem, design brief, or business scenario.", c: "var(--navy-800)" },
                { n: "2", icon: "💪", title: "You launch a SkillCapsule", desc: "Submit your solution and it auto-publishes on The Showfloor 🎪 for recruiters to discover.", c: "var(--orange)" },
                { n: "3", icon: "🎯", title: "Company reviews & hires", desc: "Hiring teams see your real work output and CraftRank 🏆 — no résumé black holes.", c: "var(--sky)" },
              ].map((step, i) => (
                <Reveal key={i} delay={i * 120}>
                  <div className="hp-card" style={{ background: "white", borderRadius: 20, padding: "32px 26px", border: "1px solid var(--border)", height: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: `${step.c}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{step.icon}</div>
                      <span className="hp-display" style={{ fontSize: 13, fontWeight: 800, color: step.c, background: `${step.c}14`, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{step.n}</span>
                    </div>
                    <h3 className="hp-display" style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>{step.title}</h3>
                    <p style={{ margin: 0, color: "var(--slate)", fontSize: 13.5, lineHeight: 1.7 }}>{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* ══════ BENTO-GRID PLATFORM FEATURES ══════ */}
        <div style={{ background: "var(--surface)", padding: "80px 0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 44 }}>
                <span style={{ display: "inline-block", background: "#EAF8FF", color: "var(--sky)", padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 14, letterSpacing: "0.04em" }}>🧩 THE PLATFORM</span>
                <h2 className="hp-display" style={{ fontSize: 30, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>Everything built around real proof</h2>
              </div>
            </Reveal>
            <div className="hp-bento-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {bentoFeatures.map((f, i) => (
                <Reveal key={i} delay={(i % 4) * 80}>
                  <div className={`hp-card hp-bento ${f.big ? "hp-bento-big" : ""}`} style={{ gridColumn: f.big ? "span 2" : "span 1", background: "white", borderRadius: 20, padding: "26px 24px", border: "1px solid var(--border)", height: "100%", minHeight: 150 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.c}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>{f.icon}</div>
                    <h3 className="hp-display" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>{f.title}</h3>
                    <p style={{ margin: 0, color: "var(--slate)", fontSize: 13, lineHeight: 1.65 }}>{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* ══════ LIVE JOBS ══════ */}
        {liveJobs.length > 0 && (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "90px 24px" }}>
            <Reveal>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 26, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <span style={{ display: "inline-block", background: "#EAF8FF", color: "var(--sky)", padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 12, letterSpacing: "0.04em" }}>🔥 HIRING NOW</span>
                  <h2 className="hp-display" style={{ fontSize: 28, fontWeight: 800, color: "var(--ink)", margin: 0 }}>Live openings on OfSkillJob</h2>
                </div>
                <Link href="/jobs" style={{ color: "var(--orange)", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>Browse all jobs →</Link>
              </div>
            </Reveal>
            <div className="hp-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
              {liveJobs.slice(0, 6).map((job, i) => (
                <Reveal key={job.id} delay={(i % 3) * 100}>
                  <Link href={`/jobs/${job.slug}`} style={{ textDecoration: "none" }}>
                    <div className="hp-card" style={{ background: "white", borderRadius: 18, padding: "20px 20px", border: "1px solid var(--border)", height: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 20 }}>💼</span>
                        <span style={{ background: "#FEE2E2", color: "#991B1B", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>🔥 Hot</span>
                      </div>
                      <h3 className="hp-display" style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>{job.title}</h3>
                      <p style={{ fontSize: 12.5, color: "var(--slate)", margin: "0 0 12px" }}>{job.company_name} · 📍 {job.location || "Remote"}</p>
                      {(job.salary_min || job.salary_max) && (
                        <p style={{ fontSize: 13, fontWeight: 800, color: "var(--navy-800)", margin: 0 }}>₹{job.salary_min?.toLocaleString()} – ₹{job.salary_max?.toLocaleString()}</p>
                      )}
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {/* ══════ FEATURE SPLIT ══════ */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 90px" }}>
          <div className="hp-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
            <Reveal>
              <div className="hp-card" style={{ background: "linear-gradient(160deg,#0A1B33,#123A5E)", borderRadius: 24, padding: "38px 32px", color: "white", height: "100%" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 18 }}>👤</div>
                <h3 className="hp-display" style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>For Job Seekers</h3>
                <p style={{ color: "#B9C6DC", fontSize: 14, lineHeight: 1.75, margin: "0 0 22px" }}>Build a Skills Profile, complete Skill Forges ⚒️, and earn Clout 🏆. Recruiters discover you — not the other way around.</p>
                <Link href="/for-talent" style={{ color: "var(--orange)", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>Explore for talent →</Link>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="hp-card" style={{ background: "white", borderRadius: 24, padding: "38px 32px", border: "1px solid var(--border)", height: "100%" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "#EAF8FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 18 }}>🏢</div>
                <h3 className="hp-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 0 10px" }}>For Companies</h3>
                <p style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.75, margin: "0 0 22px" }}>Post a job with a built-in task, launch a Skill Forge ⚒️, and discover proven candidates on The Showfloor 🎪.</p>
                <Link href="/for-companies" style={{ color: "var(--sky)", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>Explore for companies →</Link>
              </div>
            </Reveal>
          </div>
        </div>

        {/* ══════ COMMUNITY FEEDBACK ══════ */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 90px" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <span style={{ display: "inline-block", background: "#EAF8FF", color: "var(--sky)", padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 14, letterSpacing: "0.04em" }}>💬 COMMUNITY FEEDBACK</span>
              <h2 className="hp-display" style={{ fontSize: 30, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>Trusted by people getting real results</h2>
            </div>
          </Reveal>
          <div className="hp-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {testimonials.map((t, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="hp-card" style={{ background: "white", borderRadius: 20, padding: "26px 24px", border: "1px solid var(--border)", height: "100%" }}>
                  <div style={{ color: "#FBBF24", fontSize: 13, marginBottom: 12 }}>★★★★★</div>
                  <p style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.7, margin: "0 0 18px" }}>"{t.quote}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={t.photo} alt={t.name} width={38} height={38} style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>{t.name}</p>
                      <p style={{ margin: 0, fontSize: 11.5, color: "var(--slate)" }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ══════ CTA BAND ══════ */}
        <Reveal>
          <div style={{ maxWidth: 1200, margin: "0 auto 80px", padding: "0 24px" }}>
            <div style={{ background: "linear-gradient(135deg,#0A1B33,#123A5E 60%,#1B4A73)", borderRadius: 28, padding: "56px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -50, right: -50, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,122,41,.18)", filter: "blur(50px)" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2 className="hp-display" style={{ fontSize: 30, fontWeight: 800, color: "white", margin: "0 0 14px", letterSpacing: "-0.02em" }}>Your next opportunity is one SkillCapsule away. ✨</h2>
                <p style={{ color: "#B9C6DC", fontSize: 15, margin: "0 0 30px", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>Join thousands of professionals who skipped the résumé game and got hired by showing what they can do.</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
                  <button onClick={handleGetHired} className="hp-ring hp-btn-white">🚀 Get Hired Free →</button>
                  <button onClick={handleHireTalent} className="hp-btn-ghost">🏢 Hire Talent</button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ══════ MINIMAL BRAND FOOTER (nav handled globally) ══════ */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "36px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <img src="/favicon.png" alt="OfSkillJob logo" width={26} height={26} style={{ borderRadius: 7 }} />
              <span className="hp-display" style={{ fontSize: 15, fontWeight: 800, color: "var(--navy-900)" }}>OfSkillJob</span>
              <span style={{ fontSize: 12, color: "var(--slate)", marginLeft: 8 }}>© {new Date().getFullYear()} OfSkillJob Inc.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12.5, color: "var(--slate)", fontWeight: 700, marginRight: 4 }}>Follow us:</span>
              <a href="https://www.linkedin.com/company/ofskilljob" target="_blank" rel="noopener noreferrer" className="hp-social" title="LinkedIn">💼</a>
              <a href="https://t.me/OfSkillJob" target="_blank" rel="noopener noreferrer" className="hp-social" title="Telegram">✈️</a>
              <a href="https://reddit.com/u/OfSkillJob" target="_blank" rel="noopener noreferrer" className="hp-social" title="Reddit">🤝</a>
            </div>
          </div>
        </div>

      </div>

      {/* ══════ LIVE ACTIVITY TOAST — real data, viral-SaaS social-proof pattern ══════ */}
      {activeItem && (
        <div
          key={activeItem.key}
          className={`hp-activity-toast ${activityVisible ? "hp-toast" : ""}`}
          style={{
            position: "fixed", left: 20, bottom: 20, maxWidth: 320, zIndex: 400,
            background: "white", borderRadius: 14, padding: "12px 16px", boxShadow: "0 14px 34px rgba(10,27,51,.18)",
            border: "1px solid var(--border, #E6EAF2)", display: "flex", alignItems: "center", gap: 10,
            opacity: activityVisible ? 1 : 0, transition: "opacity .4s ease", pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>{activeItem.icon}</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0B1220", lineHeight: 1.4 }}>{activeItem.text}</span>
        </div>
      )}
    </>
  );
}