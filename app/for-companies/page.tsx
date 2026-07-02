"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Head from "next/head";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity .6s cubic-bezier(.2,.7,.2,1) ${delay}ms, transform .6s cubic-bezier(.2,.7,.2,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

/** Scroll-driven parallax — ref + live offset (px) based on element position relative to viewport */
function useParallax(speed = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let raf = 0;
    function onScroll() {
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const progress = (vh - rect.top) / (vh + rect.height);
        setOffset((progress - 0.5) * 100 * speed);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [speed]);
  return { ref, offset };
}
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
function useRotator<T>(items: T[], interval = 5000) {
  const [index, setIndex] = useState(0);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => { setIndex(i => (i + 1) % items.length); setKey(k => k + 1); }, interval);
    return () => clearInterval(t);
  }, [items.length, interval]);
  return { index, key };
}
function Stamp({ label, sub, size = 92, color = "#2D6E5C", rotate = -8 }: { label: string; sub?: string; size?: number; color?: string; rotate?: number }) {
  const teeth = 24;
  const pts = Array.from({ length: teeth }).map((_, i) => {
    const a = (i / teeth) * Math.PI * 2;
    const r1 = size / 2, r2 = size / 2 - 4;
    const r = i % 2 === 0 ? r1 : r2;
    return `${50 + (r / size) * 50 * Math.cos(a)}% ${50 + (r / size) * 50 * Math.sin(a)}%`;
  }).join(",");
  return (
    <div style={{ width: size, height: size, position: "relative", transform: `rotate(${rotate}deg)`, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: color, clipPath: `polygon(${pts})`, opacity: 0.15 }} />
      <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: `2px solid ${color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <span style={{ fontSize: size * 0.16, fontWeight: 800, color, letterSpacing: "0.02em", lineHeight: 1.1, fontFamily: "'Fraunces',Georgia,serif" }}>{label}</span>
        {sub && <span style={{ fontSize: size * 0.08, color, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>{sub}</span>}
      </div>
    </div>
  );
}
function Plaque({ index, children, color = "#2D6E5C" }: { index?: string; children: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      {index && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color, fontWeight: 700 }}>{index}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8275" }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: "#D9D3C4" }} />
    </div>
  );
}

const CAT_META: Record<string, { icon: string; color: string }> = {
  design: { icon: "🎨", color: "#7A4FC2" }, development: { icon: "💻", color: "#2D6BFF" },
  writing: { icon: "✒️", color: "#0E8E8E" }, sales: { icon: "💼", color: "#2D6E5C" },
  marketing: { icon: "📈", color: "#E8A93B" }, research: { icon: "🔬", color: "#5A52D6" }, communication: { icon: "💬", color: "#E0457B" },
};
function getCat(c: string) { return CAT_META[c?.toLowerCase()] || { icon: "✦", color: "#6b6558" }; }

type Profile = { id: string; company_name: string | null; role: string; };
type Forge = { id: string; title: string; category: string; difficulty: string; reward_clout: number; status: string; };
type Submission = { id: string; status: string; capsule_title?: string; user_name?: string; };

export default function ForCompaniesPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const isLoggedIn = !!profile;

  const [statsLoaded, setStatsLoaded] = useState(false);
  const [stats, setStats] = useState({ companies: 0, forges: 0, capsules: 0 });
  const [countStart, setCountStart] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const companyCount = useCounter(stats.companies, 1300, countStart);
  const forgeCount = useCounter(stats.forges, 1400, countStart);
  const capsuleCount = useCounter(stats.capsules, 1500, countStart);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const [showcaseCapsules, setShowcaseCapsules] = useState<any[]>([]);
  const capRotator = useRotator(showcaseCapsules, 5000);
  const [activeForges, setActiveForges] = useState<any[]>([]);
  const forgeRotator = useRotator(activeForges, 5000);

  const blobA = useParallax(0.25);
  const blobB = useParallax(0.4);
  const heroCard = useParallax(0.08);

  const [myForges, setMyForges] = useState<Forge[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [totalSubsCount, setTotalSubsCount] = useState(0);
  const [spotlightsSentCount, setSpotlightsSentCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("users").select("id, company_name, role").eq("id", user.id).single();
        if (data?.role !== "company") { router.replace("/for-talent"); return; }
        if (data) setProfile(data);
      }
      setCheckingAuth(false);
    })();
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;
    (async () => {
      const [companyRes, forgeRes, capRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "company"),
        supabase.from("skill_forges").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("skill_capsules").select("id", { count: "exact", head: true }),
      ]);
      setStats({ companies: companyRes.count || 0, forges: forgeRes.count || 0, capsules: capRes.count || 0 });
      setStatsLoaded(true);
    })();
    (async () => {
      const { data } = await supabase
        .from("skill_capsules")
        .select("id, title, category, skill_impact_score, user:user_id ( full_name, username )")
        .eq("visibility", "public")
        .order("skill_impact_score", { ascending: false })
        .limit(8);
      if (data) setShowcaseCapsules(data);
    })();
    (async () => {
      const { data } = await supabase
        .from("skill_forges")
        .select("id, title, category, difficulty, reward_clout, status, users:company_sponsor_id ( company_name )")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      if (data) setActiveForges(data.map((f: any) => ({ id: f.id, title: f.title, category: f.category, difficulty: f.difficulty, reward_clout: f.reward_clout, company_name: f.users?.company_name || "Company" })));
    })();
  }, [checkingAuth]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: forges } = await supabase
        .from("skill_forges")
        .select("id, title, category, difficulty, reward_clout, status")
        .eq("company_sponsor_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(4);
      setMyForges(forges || []);

      const forgeIds = (forges || []).map(f => f.id);
      if (forgeIds.length) {
        const { data: subs, count } = await supabase
          .from("forge_submissions")
          .select("id, status, skill_capsules!capsule_id ( title ), users!user_id ( full_name )", { count: "exact" })
          .in("forge_id", forgeIds)
          .order("submitted_at", { ascending: false })
          .limit(5);
        setTotalSubsCount(count || 0);
        if (subs) setRecentSubmissions(subs.map((s: any) => ({ id: s.id, status: s.status, capsule_title: s.skill_capsules?.title, user_name: s.users?.full_name })));
      }

      const { count: jobsCount } = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("company_id", profile.id).eq("status", "active");
      setActiveJobsCount(jobsCount || 0);

      const { count: spotCount } = await supabase.from("recruiter_spotlights").select("*", { count: "exact", head: true }).eq("recruiter_id", profile.id).eq("spotlight_type", "spot");
      setSpotlightsSentCount(spotCount || 0);
    })();
  }, [profile]);

  useEffect(() => {
    if (!statsLoaded) return;
    const el = statsRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setCountStart(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [statsLoaded]);

  function handleStart() { localStorage.setItem("selectedRole", "company"); router.push("/signup"); }

  const FAQS = [
    { q: "What's the difference between a Job Posting and a Skill Forge?", a: "A Job Posting is private — only people who find that listing can apply, and they complete a task first. A Skill Forge is public — visible to everyone, and every submission becomes a discoverable SkillCapsule, building your talent pipeline." },
    { q: "How do we discover talent without posting a job?", a: "Browse The Showfloor — a live feed of SkillCapsules from candidates across the platform. Send SkillSignals, Spotlight standout work, or Call candidates directly." },
    { q: "What is CraftRank and why does it matter for hiring?", a: "CraftRank is a candidate's reputation score, built from SkillSignals, Spotlights, and Calls they've received — a fast, objective signal of how the community already perceives their work." },
    { q: "Where do we manage everything?", a: "Your Foundry is the company command center — manage active Skill Forges, review submissions, track spotlighted talent, and see analytics." },
  ];

  if (checkingAuth) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", background: "#F7F5EF" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: "3px solid #D9D3C4", borderTopColor: "#2D6E5C", animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  const cap = showcaseCapsules[capRotator.index];
  const forge = activeForges[forgeRotator.index];

  return (
    <>
      <Head>
        <title>For Recruiters & Companies – OfSkillJob | Hire Based on Real Skills</title>
        <meta name="description" content="Post jobs with a built-in task, launch public Skill Forges, and discover talent on The Showfloor. Hire candidates who've already proven their skills — not just their résumés." />
        <meta name="keywords" content="skill based hiring, hire developers India, SkillForge, talent pipeline, recruiter platform, CraftRank, OfSkillJob for companies" />
        <link rel="canonical" href="https://ofskilljob.com/for-companies" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="OfSkillJob for Companies — Hire Based on Real Skills" />
        <meta property="og:description" content="Hire confidently with real proof of work, CraftRank, and a public talent pipeline." />
        <meta property="og:url" content="https://ofskilljob.com/for-companies" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: FAQS.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "OfSkillJob", item: "https://ofskilljob.com" },
          { "@type": "ListItem", position: 2, name: "For Companies", item: "https://ofskilljob.com/for-companies" },
        ],
      }) }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
        :root{ --ink:#16181D; --paper:#F8F6F0; --stamp:#E0603A; --forge:#5C8A6E; --signal:#5E7BAE; --gold:#D9A24B; --plum:#8A6FB5; --rose:#C76B86; --grain:#DCD6C8; --grain-soft:#EEEAE0; }
        *,*::before,*::after{box-sizing:border-box}
        html,body{ overflow-x:hidden !important; background:var(--paper); }
        .fc-dossier{ font-family:'Inter',system-ui,sans-serif; color:var(--ink); }
        .fc-display{ font-family:'Fraunces',Georgia,serif; }
        .fc-mono{ font-family:'JetBrains Mono',monospace; }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(45,110,92,.45)}70%{box-shadow:0 0 0 12px rgba(45,110,92,0)}100%{box-shadow:0 0 0 0 rgba(45,110,92,0)}}
        @keyframes floatY{0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-8px) rotate(var(--r,0deg))}}
        @keyframes rotOutIn{0%{opacity:0;transform:translateY(10px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes barGrow{from{width:0}}
        @keyframes drift{0%,100%{transform:translate(0,0)}50%{transform:translate(14px,-10px)}}
        .fc-link{ position:relative; text-decoration:none; color:var(--ink); }
        .fc-link::after{ content:""; position:absolute; left:0; right:0; bottom:-2px; height:1px; background:currentColor; transform:scaleX(0); transform-origin:left; transition:transform .25s ease; }
        .fc-link:hover::after{ transform:scaleX(1); }
        .fc-btn{ transition:transform .18s ease, box-shadow .18s ease; cursor:pointer; }
        .fc-btn:hover{ transform:translateY(-3px) rotate(-0.4deg); box-shadow:5px 5px 0 var(--ink); }
        .fc-btn:active{ transform:translateY(0) scale(.98); }
        .fc-card{ transition:transform .25s ease, border-color .2s ease, box-shadow .2s ease; }
        .fc-card:hover{ transform:translateY(-4px); border-color:var(--ink) !important; box-shadow:4px 4px 0 var(--grain); }
        .fc-faq{ cursor:pointer; }
        .fc-float{ --r:-3deg; animation: floatY 5s ease-in-out infinite; }
        .fc-drift{ animation: drift 9s ease-in-out infinite; }
        .fc-pulse{ animation: pulseRing 2.4s infinite; }
        .fc-rot{ animation: rotOutIn .45s cubic-bezier(.2,.8,.2,1) both; }
        .timer-track{ height:3px; background:var(--grain-soft); border-radius:2px; overflow:hidden; }
        .timer-bar{ height:100%; border-radius:2px; }
        .perf-top{ background-image: radial-gradient(circle at 6px 0, transparent 5px, var(--paper) 5.5px); background-size: 14px 12px; background-position: 0 -6px; background-repeat: repeat-x; }

        @media(max-width:880px){
          .fc-hero-grid{ grid-template-columns:1fr !important; gap:32px !important; }
          .fc-hero-title{ font-size:11vw !important; }
          .fc-stats-grid{ grid-template-columns:1fr 1fr !important; }
          .fc-grid2{ grid-template-columns:1fr !important; }
          .fc-grid3{ grid-template-columns:1fr !important; }
          .fc-grid4{ grid-template-columns:1fr 1fr !important; }
          .fc-btn-row{ flex-direction:column !important; }
          .fc-btn-row > *{ width:100% !important; text-align:center !important; }
          .fc-compare-table{ font-size:12px !important; }
          .fc-compare-table th,.fc-compare-table td{ padding:10px 8px !important; }
          .fc-cta-band{ padding:48px 24px !important; }
          .fc-rotator-grid{ grid-template-columns:1fr !important; }
        }
      `}</style>

      <div className="fc-dossier" style={{ minHeight: "100vh", background: "var(--paper)", position: "relative", overflow: "hidden" }}>

        <div ref={blobA.ref} className="fc-drift" style={{ position: "absolute", top: 60, right: -120, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,var(--forge)22,transparent 70%)", filter: "blur(10px)", pointerEvents: "none", transform: `translateY(${blobA.offset}px)` }} />
        <div ref={blobB.ref} className="fc-drift" style={{ position: "absolute", top: 1000, left: -130, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,var(--signal)22,transparent 70%)", filter: "blur(10px)", pointerEvents: "none", animationDelay: "3s", transform: `translateY(${blobB.offset}px)` }} />

        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 1 }}>

          {/* ══════ HERO ══════ */}
          <div className="fc-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 56, alignItems: "center", padding: "48px 0 56px" }}>
            <div>
              {isLoggedIn ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
                    <span className="fc-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--forge)", display: "inline-block" }} />
                    <span className="fc-mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8275", fontWeight: 700 }}>Your dossier</span>
                  </div>
                  <h1 className="fc-hero-title fc-display" style={{ fontSize: 48, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.02em", margin: "0 0 22px" }}>
                    Welcome back, <em style={{ fontStyle: "italic", color: "var(--forge)" }}>{profile?.company_name || "team"}</em>.
                  </h1>
                  <p style={{ fontSize: 17, color: "#3a3630", lineHeight: 1.7, margin: "0 0 30px", maxWidth: 480 }}>
                    {totalSubsCount > 0 ? <>You have <strong style={{ color: "var(--forge)" }}>{totalSubsCount} submissions</strong> across your Skill Forges.</> : "Launch a Skill Forge to start discovering proven talent."}
                  </p>
                  <div className="fc-btn-row" style={{ display: "flex", gap: 14 }}>
                    <Link href="/skill-forges/create" className="fc-btn" style={{ background: "var(--ink)", color: "var(--paper)", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2, textDecoration: "none", display: "inline-block" }}>⚒ Create a Skill Forge</Link>
                    <Link href="/company/foundry" className="fc-btn" style={{ background: "var(--forge)", color: "white", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2, textDecoration: "none", display: "inline-block" }}>Go to The Foundry</Link>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
                    <span className="fc-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--forge)", display: "inline-block" }} />
                    <span className="fc-mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8275", fontWeight: 700 }}>For recruiters & companies</span>
                  </div>
                  <h1 className="fc-hero-title fc-display" style={{ fontSize: 52, fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.02em", margin: "0 0 24px" }}>
                    Hire what you<br /><em style={{ fontStyle: "italic", color: "var(--forge)" }}>can see.</em>
                  </h1>
                  <p style={{ fontSize: 17, color: "#3a3630", lineHeight: 1.7, margin: "0 0 30px", maxWidth: 500 }}>
                    Post a job with a built-in task, launch a public Skill Forge, and discover candidates on The Showfloor — every applicant has already proven their skill.
                  </p>
                  <div className="fc-btn-row" style={{ display: "flex", gap: 14 }}>
                    <button onClick={handleStart} className="fc-btn" style={{ background: "var(--forge)", color: "white", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2 }}>Create a Company Account →</button>
                    <Link href="/the-stage" className="fc-btn" style={{ background: "var(--ink)", color: "var(--paper)", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2, textDecoration: "none", display: "inline-block" }}>Browse The Showfloor</Link>
                  </div>
                </>
              )}
            </div>

            {/* receipt card */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div ref={heroCard.ref} className="fc-float" style={{ background: "white", width: 320, border: "2px solid var(--ink)", position: "relative", boxShadow: "7px 7px 0 var(--forge)", transform: `translateY(${heroCard.offset}px)` }}>
                <div className="perf-top" style={{ height: 8, borderBottom: "1px dashed var(--grain)" }} />
                <div style={{ padding: "24px 26px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div>
                      <p className="fc-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "#8a8275", margin: "0 0 4px" }}>{isLoggedIn ? "FOUNDRY LEDGER" : "SAMPLE FORGE"}</p>
                      <p className="fc-mono" style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--forge)" }}>{isLoggedIn ? (profile?.company_name || "Your company") : "FRG-1182-DX"}</p>
                    </div>
                    <Stamp label={isLoggedIn ? "HQ" : "FORGE"} sub={isLoggedIn ? "active" : "public"} size={64} rotate={10} />
                  </div>
                  <div style={{ borderTop: "1px dashed var(--grain)", borderBottom: "1px dashed var(--grain)", padding: "14px 0", marginBottom: 14 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>{isLoggedIn ? (myForges[0]?.title || "No Skill Forges yet") : "Build a Responsive Dashboard"}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#8a8275" }}>{isLoggedIn ? `${myForges.length} forge${myForges.length !== 1 ? "s" : ""} created` : "Frontend · Intermediate"}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    <div>
                      <p className="fc-mono" style={{ fontSize: 9, color: "#8a8275", letterSpacing: "0.08em", margin: "0 0 2px" }}>SUBMISSIONS</p>
                      <p className="fc-mono" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--forge)" }}>{isLoggedIn ? totalSubsCount : 12}</p>
                    </div>
                    <div>
                      <p className="fc-mono" style={{ fontSize: 9, color: "#8a8275", letterSpacing: "0.08em", margin: "0 0 2px" }}>ACTIVE JOBS</p>
                      <p className="fc-mono" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--signal)" }}>{isLoggedIn ? activeJobsCount : 4}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8a8275" }}>
                    <span>🔦 {isLoggedIn ? spotlightsSentCount : 7} spotlights sent</span>
                    <span>● {isLoggedIn ? myForges.filter(f => f.status === "active").length : 3} live</span>
                  </div>
                </div>
                <div className="perf-top" style={{ height: 8, borderTop: "1px dashed var(--grain)", transform: "rotate(180deg)" }} />
              </div>
            </div>
          </div>

          {/* ══════ STATS ══════ */}
          <Reveal>
            <div ref={statsRef} className="fc-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--grain)", border: "1px solid var(--grain)", marginBottom: 76 }}>
              {[
                { val: companyCount, label: "Verified companies hiring", c: "var(--forge)" },
                { val: forgeCount, label: "Active Skill Forges", c: "var(--signal)" },
                { val: capsuleCount, label: "SkillCapsules to discover", c: "var(--gold)" },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--paper)", padding: "26px 20px", textAlign: "center" }}>
                  <div className="fc-mono fc-display" style={{ fontSize: 32, fontWeight: 600, color: s.c }}>{statsLoaded ? `${s.val}+` : "—"}</div>
                  <div style={{ fontSize: 12, color: "#8a8275", fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* ══════ YOUR FORGES (logged-in only) ══════ */}
          {isLoggedIn && (
            <Reveal>
              <div style={{ marginBottom: 76 }}>
                <Plaque index="§1" color="var(--forge)">Your Skill Forges</Plaque>
                {myForges.length === 0 ? (
                  <div style={{ border: "1px dashed var(--grain)", padding: "36px 24px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 16px", color: "#8a8275", fontSize: 14 }}>You haven't created a Skill Forge yet.</p>
                    <Link href="/skill-forges/create" className="fc-btn" style={{ background: "var(--ink)", color: "var(--paper)", padding: "10px 20px", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-block" }}>Create your first →</Link>
                  </div>
                ) : (
                  <div className="fc-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "var(--grain)" }}>
                    {myForges.map(f => {
                      const cm = getCat(f.category);
                      return (
                        <Link key={f.id} href={`/skill-forges/${f.id}`} style={{ textDecoration: "none" }}>
                          <div className="fc-card" style={{ background: "var(--paper)", padding: "18px 16px", border: "1px solid transparent", borderTop: `3px solid ${cm.color}`, height: "100%" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                              <span style={{ fontSize: 16 }}>{cm.icon}</span>
                              <span className="fc-mono" style={{ fontSize: 10, color: f.status === "active" ? "var(--forge)" : "#991b1b", fontWeight: 700 }}>{f.status === "active" ? "ACTIVE" : "CLOSED"}</span>
                            </div>
                            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{f.title}</p>
                            <p style={{ margin: 0, fontSize: 11, color: "#8a8275" }}>🏆 {f.reward_clout} Clout · {f.difficulty}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {/* ══════ RECENT SUBMISSIONS (logged-in only) ══════ */}
          {isLoggedIn && recentSubmissions.length > 0 && (
            <Reveal>
              <div style={{ marginBottom: 76 }}>
                <Plaque index="§2" color="var(--signal)">Recent submissions</Plaque>
                <div style={{ border: "1px solid var(--grain)" }}>
                  {recentSubmissions.map((s, i) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderTop: i > 0 ? "1px solid var(--grain)" : "none" }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700 }}>{s.user_name || "Candidate"}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#8a8275" }}>{s.capsule_title || "Untitled Capsule"}</p>
                      </div>
                      <span className="fc-mono" style={{ fontSize: 11, fontWeight: 700, color: s.status === "selected" ? "var(--forge)" : s.status === "rejected" ? "#991b1b" : "var(--gold)", textTransform: "uppercase" }}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {/* ══════ LIVE ROTATING SHOWCASE — refreshes every 5s ══════ */}
          <Reveal>
            <div style={{ marginBottom: 76 }}>
              <Plaque index={isLoggedIn ? "§3" : "§1"} color="var(--plum)">Live talent — refreshes every 5s</Plaque>
              <div className="fc-rotator-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

                <div style={{ border: "2px solid var(--ink)", background: "white", boxShadow: "5px 5px 0 var(--signal)", overflow: "hidden" }}>
                  <div style={{ background: "var(--signal)", padding: "8px 16px", display: "flex", justifyContent: "space-between" }}>
                    <span className="fc-mono" style={{ color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>ACTIVE FORGE</span>
                    <span className="fc-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} />
                  </div>
                  {forge ? (
                    <div key={forge.id} className="fc-rot" style={{ padding: "20px 18px", minHeight: 150 }}>
                      <span style={{ fontSize: 18 }}>{getCat(forge.category).icon}</span>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 6px" }}>{forge.title}</h4>
                      <p style={{ fontSize: 12.5, color: "#8a8275", margin: "0 0 12px" }}>{forge.company_name} · {forge.difficulty}</p>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="fc-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--signal)" }}>🏆 {forge.reward_clout} Clout</span>
                        <Link href={`/skill-forges/${forge.id}`} className="fc-link" style={{ fontSize: 12, fontWeight: 700 }}>View →</Link>
                      </div>
                    </div>
                  ) : <div style={{ padding: "20px 18px", minHeight: 150, color: "#8a8275", fontSize: 13 }}>No forges yet.</div>}
                  <div style={{ padding: "0 18px 14px" }}><div className="timer-track"><div className="timer-bar" key={forgeRotator.key} style={{ background: "var(--signal)", animation: "barGrow 5s linear" }} /></div></div>
                </div>

                <div style={{ border: "2px solid var(--ink)", background: "white", boxShadow: "5px 5px 0 var(--gold)", overflow: "hidden" }}>
                  <div style={{ background: "var(--gold)", padding: "8px 16px", display: "flex", justifyContent: "space-between" }}>
                    <span className="fc-mono" style={{ color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>TOP CAPSULE</span>
                    <span className="fc-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} />
                  </div>
                  {cap ? (
                    <div key={cap.id} className="fc-rot" style={{ padding: "20px 18px", minHeight: 150 }}>
                      <span style={{ fontSize: 18 }}>{getCat(cap.category).icon}</span>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 6px" }}>{cap.title}</h4>
                      <p style={{ fontSize: 12.5, color: "#8a8275", margin: "0 0 12px" }}>{cap.user?.full_name || `@${cap.user?.username}`}</p>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="fc-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>RANK {cap.skill_impact_score}</span>
                        <Link href="/the-stage" className="fc-link" style={{ fontSize: 12, fontWeight: 700 }}>View →</Link>
                      </div>
                    </div>
                  ) : <div style={{ padding: "20px 18px", minHeight: 150, color: "#8a8275", fontSize: 13 }}>No capsules yet.</div>}
                  <div style={{ padding: "0 18px 14px" }}><div className="timer-track"><div className="timer-bar" key={capRotator.key} style={{ background: "var(--gold)", animation: "barGrow 5s linear" }} /></div></div>
                </div>

              </div>
            </div>
          </Reveal>

          {/* ══════ TWO WAYS TO HIRE ══════ */}
          <Reveal>
            <div style={{ marginBottom: 76 }}>
              <Plaque index={isLoggedIn ? "§4" : "§2"} color="var(--forge)">Two ways to find talent</Plaque>
              <div className="fc-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--grain)" }}>
                <div style={{ background: "var(--paper)", padding: "32px 30px", borderTop: "4px solid var(--ink)" }}>
                  <Stamp label="JOB" sub="private" size={50} color="var(--ink)" rotate={-5} />
                  <h3 className="fc-display" style={{ fontSize: 20, fontWeight: 600, margin: "18px 0 10px" }}>Post a job with a built-in task</h3>
                  <p style={{ fontSize: 14, color: "#3a3630", lineHeight: 1.7, margin: "0 0 14px" }}>Candidates must complete a real task before applying. You receive only qualified, proven applicants.</p>
                  <p style={{ fontSize: 12, color: "#8a8275", margin: 0 }}>Best for hiring a specific role.</p>
                </div>
                <div style={{ background: "var(--paper)", padding: "32px 30px", borderTop: "4px solid var(--forge)" }}>
                  <Stamp label="FORGE" sub="public" size={50} color="var(--forge)" rotate={5} />
                  <h3 className="fc-display" style={{ fontSize: 20, fontWeight: 600, margin: "18px 0 10px" }}>Create a Skill Forge</h3>
                  <p style={{ fontSize: 14, color: "#3a3630", lineHeight: 1.7, margin: "0 0 14px" }}>A public challenge open to everyone. Every submission becomes a SkillCapsule on The Showfloor.</p>
                  <p style={{ fontSize: 12, color: "#8a8275", margin: 0 }}>Best for building a talent pipeline.</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ══════ COMPARISON TABLE ══════ */}
          <Reveal>
            <div style={{ marginBottom: 76, overflowX: "auto" }}>
              <table className="fc-compare-table" style={{ width: "100%", borderCollapse: "collapse", border: "1px solid var(--grain)" }}>
                <thead>
                  <tr style={{ background: "var(--ink)" }}>
                    <th style={{ padding: "14px 16px", textAlign: "left", color: "var(--paper)", fontSize: 12, fontWeight: 700 }}>Feature</th>
                    <th style={{ padding: "14px 16px", textAlign: "left", color: "#9ec3ff", fontSize: 12, fontWeight: 700 }}>Job Posting</th>
                    <th style={{ padding: "14px 16px", textAlign: "left", color: "#86efac", fontSize: 12, fontWeight: 700 }}>Skill Forge</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Visibility", "Only direct applicants", "Everyone on the platform"],
                    ["Task required", "Yes, to apply", "Yes, to submit"],
                    ["Outcome", "Apply directly", "SkillCapsule on Showfloor"],
                    ["Discovery", "You review applicants", "You're discovered too"],
                    ["Ideal for", "A specific role", "Pipeline & brand awareness"],
                  ].map((row, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--grain)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 12.5 }}>{row[0]}</td>
                      <td style={{ padding: "12px 16px", color: "#3a3630", fontSize: 12.5 }}>{row[1]}</td>
                      <td style={{ padding: "12px 16px", color: "#3a3630", fontSize: 12.5 }}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          {/* ══════ SHOWFLOOR ENGAGEMENT ══════ */}
          <Reveal>
            <div style={{ marginBottom: 76 }}>
              <Plaque index={isLoggedIn ? "§5" : "§3"} color="var(--gold)">Engage on the Showfloor</Plaque>
              <div className="fc-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--grain)" }}>
                {[["SkillSignal", "Recognise outstanding work with a quick, specific signal.", "var(--signal)"], ["Spotlight", "Publicly endorse a candidate — notified instantly, boosts CraftRank.", "var(--gold)"], ["Call", "Skip the cold outreach. Start a real hiring conversation.", "var(--forge)"]].map(([t, d, c], i) => (
                  <div key={i} style={{ background: "var(--paper)", padding: "24px 22px", borderTop: `3px solid ${c}` }}>
                    <h4 className="fc-display" style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>{t}</h4>
                    <p style={{ fontSize: 13, color: "#3a3630", lineHeight: 1.6, margin: 0 }}>{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ══════ FAQ ══════ */}
          <Reveal>
            <div style={{ marginBottom: 76, maxWidth: 720 }}>
              <Plaque index={isLoggedIn ? "§6" : "§4"} color="var(--plum)">Questions</Plaque>
              <div style={{ display: "grid", gap: 0, border: "1px solid var(--grain)" }}>
                {FAQS.map((f, i) => (
                  <div key={i} className="fc-faq" onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ borderTop: i > 0 ? "1px solid var(--grain)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{f.q}</span>
                      <span className="fc-mono" style={{ fontSize: 16, color: "var(--forge)", transform: faqOpen === i ? "rotate(45deg)" : "none", transition: "transform .2s" }}>+</span>
                    </div>
                    {faqOpen === i && <div style={{ padding: "0 18px 18px", color: "#8a8275", fontSize: 13.5, lineHeight: 1.7 }}>{f.a}</div>}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ══════ CTA (logged-out only) ══════ */}
          {!isLoggedIn && (
            <Reveal>
              <div className="fc-cta-band" style={{ background: "var(--ink)", color: "var(--paper)", padding: "64px 56px", marginBottom: 56, position: "relative", overflow: "hidden", border: "2px solid var(--ink)" }}>
                <div className="fc-drift" style={{ position: "absolute", top: -50, left: -50, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,var(--forge)33,transparent 70%)", filter: "blur(18px)" }} />
                <div style={{ position: "absolute", top: "50%", right: 50, transform: "translateY(-50%)" }}>
                  <Stamp label="HIRE" sub="now" size={100} color="var(--forge)" rotate={-10} />
                </div>
                <div style={{ maxWidth: 520, position: "relative", zIndex: 1 }}>
                  <h2 className="fc-display" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 16px" }}>Hire smarter. Start today.</h2>
                  <p style={{ fontSize: 15, color: "#cfc9ba", lineHeight: 1.7, margin: "0 0 28px" }}>Post your first job or launch a Skill Forge and start discovering proven talent within minutes.</p>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <button onClick={handleStart} className="fc-btn" style={{ background: "var(--paper)", color: "var(--ink)", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2 }}>Create a Company Account →</button>
                    <Link href="/the-stage" className="fc-btn" style={{ background: "var(--forge)", color: "white", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2, textDecoration: "none", display: "inline-block" }}>Browse The Showfloor</Link>
                  </div>
                </div>
              </div>
            </Reveal>
          )}

        </div>
      </div>
    </>
  );
}