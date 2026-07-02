"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ════════════════════════════════════════════════════════════════
   DESIGN SYSTEM — "The Dossier"
   Ink #0B0E14  Paper #F7F5EF  Stamp #FF5A1F  Forge #2D6E5C
   Accents: Signal Blue #2D6BFF · Spotlight Gold #E8A93B · Plum #7A4FC2
   No navbar here — the app's universal navbar handles navigation.
   ════════════════════════════════════════════════════════════════ */

function useCounter(target: number, duration = 1500, start = false) {
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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
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
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(26px)", transition: `opacity .65s cubic-bezier(.2,.7,.2,1) ${delay}ms, transform .65s cubic-bezier(.2,.7,.2,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

/** Rotator — cycles through items every `interval`ms with a fade+slide animation */
function useRotator<T>(items: T[], interval = 5000) {
  const [index, setIndex] = useState(0);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => {
      setIndex(i => (i + 1) % items.length);
      setKey(k => k + 1);
    }, interval);
    return () => clearInterval(t);
  }, [items.length, interval]);
  return { index, key };
}

const CAT_META: Record<string, { icon: string; color: string; bg: string }> = {
  design:        { icon: "🎨", color: "#7A4FC2", bg: "#F3EDFC" },
  development:   { icon: "💻", color: "#2D6BFF", bg: "#EAF0FF" },
  writing:        { icon: "✒️", color: "#0E8E8E", bg: "#E6F8F8" },
  sales:          { icon: "💼", color: "#2D6E5C", bg: "#E7F4EF" },
  marketing:      { icon: "📈", color: "#E8A93B", bg: "#FDF3E2" },
  research:       { icon: "🔬", color: "#5A52D6", bg: "#EDEBFB" },
  communication:  { icon: "💬", color: "#E0457B", bg: "#FCE9F0" },
};
function getCat(c: string) { return CAT_META[c?.toLowerCase()] || { icon: "✦", color: "#6b6558", bg: "#F1EEE5" }; }

/** Signature stamp motif — serrated seal badge */
function Stamp({ label, sub, size = 92, color = "#FF5A1F", rotate = -8 }: { label: string; sub?: string; size?: number; color?: string; rotate?: number }) {
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
function Plaque({ index, children, color = "#FF5A1F" }: { index?: string; children: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      {index && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color, fontWeight: 700 }}>{index}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8275" }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: "#D9D3C4" }} />
    </div>
  );
}

export default function HomeClient() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [liveStats, setLiveStats] = useState({ jobs: 0, companies: 0, applications: 0, capsules: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [countStart, setCountStart] = useState(false);
  const jobCount = useCounter(liveStats.jobs, 1300, countStart);
  const companyCount = useCounter(liveStats.companies, 1500, countStart);
  const appCount = useCounter(liveStats.applications, 1700, countStart);
  const capsuleCount = useCounter(liveStats.capsules, 1400, countStart);

  interface Capsule { id: string; title: string; category: string; skill_impact_score: number; user_full_name?: string; user_username?: string; }
  const [topCapsules, setTopCapsules] = useState<Capsule[]>([]);
  const capRotator = useRotator(topCapsules, 5000);

  interface Job { id: string; title: string; company_name?: string; location: string | null; salary_min: number | null; salary_max: number | null; task_title: string | null; slug: string; category?: string; }
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const jobRotator = useRotator(allJobs, 5000);

  interface ForgeRec { id: string; title: string; category: string; difficulty: string; reward_clout: number; company_name: string; }
  const [allForges, setAllForges] = useState<ForgeRec[]>([]);
  const forgeRotator = useRotator(allForges, 5000);

  // Scroll-driven parallax layers — ambient blobs drift at different depths, hero card has subtle lift
  const blobA = useParallax(0.25);
  const blobB = useParallax(0.4);
  const blobC = useParallax(0.18);
  const heroCard = useParallax(0.08);

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
        .from("skill_capsules")
        .select("id, title, category, skill_impact_score, user:user_id ( full_name, username )")
        .eq("visibility", "public")
        .order("skill_impact_score", { ascending: false })
        .limit(8);
      if (data) setTopCapsules(data.map((c: any) => ({ id: c.id, title: c.title, category: c.category, skill_impact_score: c.skill_impact_score || 0, user_full_name: c.user?.full_name, user_username: c.user?.username })));
    })();
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, location, salary_min, salary_max, task_title, slug, users:company_id ( company_name )")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      if (data) setAllJobs(data.map((j: any) => ({ id: j.id, title: j.title, company_name: j.users?.company_name || "Company", location: j.location, salary_min: j.salary_min, salary_max: j.salary_max, task_title: j.task_title, slug: j.slug })));
    })();
    (async () => {
      const { data } = await supabase
        .from("skill_forges")
        .select("id, title, category, difficulty, reward_clout, users:company_sponsor_id ( company_name )")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      if (data) setAllForges(data.map((f: any) => ({ id: f.id, title: f.title, category: f.category, difficulty: f.difficulty, reward_clout: f.reward_clout, company_name: f.users?.company_name || "Company" })));
    })();
  }, [checkingAuth]);

  useEffect(() => {
    if (!statsLoaded) return;
    const el = statsRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setCountStart(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [statsLoaded]);

  function handleGetHired() { localStorage.setItem("selectedRole", "developer"); router.push("/signup"); }
  function handleHireTalent() { localStorage.setItem("selectedRole", "company"); router.push("/signup"); }

  if (checkingAuth) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", background: "#F7F5EF" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: "3px solid #D9D3C4", borderTopColor: "#FF5A1F", animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  const job = allJobs[jobRotator.index];
  const cap = topCapsules[capRotator.index];
  const forge = allForges[forgeRotator.index];

  return (
    <>
      {/* ════════════ SEO: structured data ════════════ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "OfSkillJob",
        url: "https://ofskilljob.com",
        potentialAction: { "@type": "SearchAction", target: "https://ofskilljob.com/jobs?q={search_term_string}", "query-input": "required name=search_term_string" },
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "OfSkillJob",
        legalName: "OfSkillJob",
        description: "OfSkillJob is a skill-first hiring platform where candidates prove their abilities with real tasks (SkillCapsules) before applying, and recruiters discover proven talent on The Showfloor.",
        url: "https://ofskilljob.com",
        logo: "https://ofskilljob.com/favicon.png",
        sameAs: ["https://www.linkedin.com/company/ofskilljob", "https://t.me/OfSkillJob", "https://reddit.com/u/OfSkillJob"],
        areaServed: "IN",
        knowsAbout: ["skill-based hiring", "talent assessment", "recruiting", "job search"],
      }) }} />
      {allJobs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: allJobs.slice(0, 8).map((j, i) => ({
            "@type": "ListItem", position: i + 1,
            item: { "@type": "JobPosting", title: j.title, hiringOrganization: { "@type": "Organization", name: j.company_name }, jobLocation: { "@type": "Place", address: j.location || "Remote, India" }, url: `https://ofskilljob.com/jobs/${j.slug}` },
          })),
        }) }} />
      )}
      {allForges.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Active Skill Forges",
          itemListElement: allForges.slice(0, 8).map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.title })),
        }) }} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

        :root{
          --ink:#16181D; --paper:#F8F6F0; --stamp:#E0603A; --forge:#5C8A6E;
          --signal:#5E7BAE; --gold:#D9A24B; --plum:#8A6FB5; --rose:#C76B86;
          --grain:#DCD6C8; --grain-soft:#EEEAE0;
        }
        *,*::before,*::after{box-sizing:border-box}
        html,body{overflow-x:hidden !important; background:var(--paper);}
        .dossier{ font-family:'Inter',system-ui,sans-serif; color:var(--ink); }
        .display{ font-family:'Fraunces',Georgia,serif; }
        .mono{ font-family:'JetBrains Mono',monospace; }

        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes floatY{0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-8px) rotate(var(--r,0deg))}}
        @keyframes rotIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
        @keyframes rotOutIn{0%{opacity:0;transform:translateY(10px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes shimmerBg{0%{background-position:-300% 0}100%{background-position:300% 0}}
        @keyframes barGrow{from{width:0}}
        @keyframes drift{0%,100%{transform:translate(0,0)}50%{transform:translate(14px,-10px)}}
        @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(255,90,31,.45)}70%{box-shadow:0 0 0 12px rgba(255,90,31,0)}100%{box-shadow:0 0 0 0 rgba(255,90,31,0)}}

        .dz-link{ position:relative; text-decoration:none; color:var(--ink); }
        .dz-link::after{ content:""; position:absolute; left:0; right:0; bottom:-2px; height:1px; background:var(--ink); transform:scaleX(0); transform-origin:left; transition:transform .25s ease; }
        .dz-link:hover::after{ transform:scaleX(1); }

        .dz-btn{ transition:transform .18s ease, box-shadow .18s ease; cursor:pointer; }
        .dz-btn:hover{ transform:translateY(-3px) rotate(-0.4deg); box-shadow:5px 5px 0 var(--ink); }
        .dz-btn:active{ transform:translateY(0) scale(.98); }

        .dz-card{ transition:transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease, border-color .2s ease; }
        .dz-card:hover{ transform:translateY(-5px); border-color:var(--ink) !important; box-shadow:4px 4px 0 var(--grain); }

        .float-a{ --r:-3deg; animation: floatY 5s ease-in-out infinite; }
        .float-b{ --r:3deg; animation: floatY 6.5s ease-in-out infinite 0.6s; }
        .drift-blob{ animation: drift 9s ease-in-out infinite; }

        .rot-anim{ animation: rotOutIn .45s cubic-bezier(.2,.8,.2,1) both; }
        .rot-dots{ display:flex; gap:6px; }
        .rot-dot{ width:6px; height:6px; border-radius:50%; background:var(--grain); transition:background .3s, transform .3s; }
        .rot-dot.active{ background:var(--stamp); transform:scale(1.3); }

        .stamp-pulse{ animation: pulseRing 2.4s infinite; }

        .perf-top{ background-image: radial-gradient(circle at 6px 0, transparent 5px, var(--paper) 5.5px); background-size: 14px 12px; background-position: 0 -6px; background-repeat: repeat-x; }

        .timer-track{ height:3px; background:var(--grain-soft); border-radius:2px; overflow:hidden; }
        .timer-bar{ height:100%; background:var(--stamp); border-radius:2px; }

        @media(max-width:880px){
          .hero-grid{ grid-template-columns:1fr !important; gap:36px !important; }
          .hero-title{ font-size:13vw !important; }
          .receipt-card{ max-width:340px !important; margin:0 auto !important; }
          .stats-grid{ grid-template-columns:1fr 1fr !important; }
          .split-grid{ grid-template-columns:1fr !important; }
          .flow-grid{ grid-template-columns:1fr !important; }
          .btn-row{ flex-direction:column !important; }
          .btn-row > *{ width:100% !important; text-align:center !important; }
          .glossary-grid{ grid-template-columns:1fr 1fr !important; }
          .trust-grid{ grid-template-columns:1fr !important; }
          .rotator-grid{ grid-template-columns:1fr !important; }
          .cta-band{ padding:48px 24px !important; }
          .cta-title{ font-size:32px !important; }
        }
        @media(max-width:480px){ .glossary-grid{ grid-template-columns:1fr !important; } }
      `}</style>

      <div className="dossier" style={{ minHeight: "100vh", background: "var(--paper)", position: "relative", overflow: "hidden" }}>

        {/* Ambient color blobs — the "no color/no animation" fix, used as soft atmosphere not noise */}
        <div ref={blobA.ref} className="drift-blob" style={{ position: "absolute", top: 40, right: -120, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,var(--signal)22,transparent 70%)", pointerEvents: "none", filter: "blur(10px)", transform: `translateY(${blobA.offset}px)` }} />
        <div ref={blobB.ref} className="drift-blob" style={{ position: "absolute", top: 900, left: -140, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,var(--gold)2a,transparent 70%)", pointerEvents: "none", filter: "blur(10px)", animationDelay: "2s", transform: `translateY(${blobB.offset}px)` }} />
        <div ref={blobC.ref} className="drift-blob" style={{ position: "absolute", top: 1900, right: -100, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,var(--plum)22,transparent 70%)", pointerEvents: "none", filter: "blur(10px)", animationDelay: "4s", transform: `translateY(${blobC.offset}px)` }} />

        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 1 }}>

          {/* ══════ HERO ══════ */}
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 60, alignItems: "center", padding: "48px 0 64px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--stamp)", display: "inline-block" }} className="stamp-pulse" />
                <span className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8275", fontWeight: 700 }}>Skill-first hiring · India</span>
              </div>

              <h1 className="hero-title display" style={{ fontSize: 64, fontWeight: 600, lineHeight: 0.98, letterSpacing: "-0.02em", margin: "0 0 26px", color: "var(--ink)" }}>
                Your Skills Are-<br />
                <em style={{ fontStyle: "italic", color: "var(--stamp)" }}>your Résumé.</em>
              </h1>

              <p style={{ fontSize: 18, color: "#3a3630", lineHeight: 1.7, margin: "0 0 34px", maxWidth: 480 }}>
                Every hire on OfSkillJob starts with real work, not a résumé. Complete a task, launch a <strong style={{ color: "var(--signal)" }}>SkillCapsule</strong>, and let companies discover what you can actually do.
              </p>

              <div className="btn-row" style={{ display: "flex", gap: 14, marginBottom: 34 }}>
                <button onClick={handleGetHired} className="dz-btn" style={{ background: "var(--ink)", color: "var(--paper)", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2 }}>
                  Get Hired Free →
                </button>
                <button onClick={handleHireTalent} className="dz-btn" style={{ background: "var(--forge)", color: "white", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2 }}>
                  Hire Talent →
                </button>
              </div>

              <div style={{ display: "flex", gap: 28, fontSize: 13 }}>
                <span><strong className="mono" style={{ color: "var(--signal)" }}>{statsLoaded ? liveStats.applications.toLocaleString() : "—"}</strong> <span style={{ color: "#8a8275" }}>applications filed</span></span>
                <span><strong className="mono" style={{ color: "var(--gold)" }}>{statsLoaded ? liveStats.capsules.toLocaleString() : "—"}</strong> <span style={{ color: "#8a8275" }}>capsules live</span></span>
              </div>
            </div>

            {/* ── SkillCapsule receipt — now rotates through real top capsules every 5s ── */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div ref={heroCard.ref} className="receipt-card float-a" style={{ background: "white", width: 320, border: "2px solid var(--ink)", position: "relative", boxShadow: "7px 7px 0 var(--signal)", transform: `translateY(${heroCard.offset}px)` }}>
                <div className="perf-top" style={{ height: 8, borderBottom: "1px dashed var(--grain)" }} />
                <div key={cap?.id || "sample"} className="rot-anim" style={{ padding: "24px 26px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div>
                      <p className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "#8a8275", margin: "0 0 4px" }}>SKILLCAPSULE</p>
                      <p className="mono" style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--signal)" }}>{cap ? `@${cap.user_username || "anon"}` : "OSJ-4471-RX"}</p>
                    </div>
                    <Stamp label="PROOF" sub="verified" size={62} rotate={10} />
                  </div>
                  <div style={{ borderTop: "1px dashed var(--grain)", borderBottom: "1px dashed var(--grain)", padding: "14px 0", marginBottom: 14, minHeight: 56 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{cap?.title || "Real-Time Sales Dashboard"}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#8a8275", textTransform: "capitalize" }}>{getCat(cap?.category || "development").icon} {cap?.category || "Development"}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    <div>
                      <p className="mono" style={{ fontSize: 9, color: "#8a8275", letterSpacing: "0.08em", margin: "0 0 2px" }}>CRAFTRANK</p>
                      <p className="mono" style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "var(--stamp)" }}>{cap?.skill_impact_score ?? 87}</p>
                    </div>
                    <div>
                      <p className="mono" style={{ fontSize: 9, color: "#8a8275", letterSpacing: "0.08em", margin: "0 0 2px" }}>STATUS</p>
                      <p className="mono" style={{ fontSize: 14, fontWeight: 700, margin: "4px 0 0", color: "var(--forge)" }}>● LIVE</p>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "0 26px 16px" }}>
                  <div className="timer-track"><div className="timer-bar" key={capRotator.key} style={{ animation: "barGrow 5s linear" }} /></div>
                  <div className="rot-dots" style={{ marginTop: 8, justifyContent: "center" }}>
                    {topCapsules.slice(0, 6).map((_, i) => <span key={i} className={`rot-dot ${i === capRotator.index % Math.min(6, topCapsules.length) ? "active" : ""}`} />)}
                  </div>
                </div>
                <div className="perf-top" style={{ height: 8, borderTop: "1px dashed var(--grain)", transform: "rotate(180deg)" }} />
              </div>
            </div>
          </div>

          {/* ══════ LIVE STATS ══════ */}
          <Reveal>
            <div ref={statsRef} className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "var(--grain)", border: "1px solid var(--grain)", marginBottom: 80 }}>
              {[
                { val: companyCount, label: "Verified companies", color: "var(--forge)" },
                { val: jobCount, label: "Active listings", color: "var(--signal)" },
                { val: appCount, label: "Applications filed", color: "var(--gold)" },
                { val: capsuleCount, label: "SkillCapsules live", color: "var(--stamp)" },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--paper)", padding: "26px 20px", textAlign: "center" }}>
                  <div className="mono display" style={{ fontSize: 34, fontWeight: 600, color: s.color }}>{statsLoaded ? `${s.val}+` : "—"}</div>
                  <div style={{ fontSize: 12, color: "#8a8275", fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* ══════ SPLIT: TALENT / COMPANY ══════ */}
          <Reveal>
            <div style={{ marginBottom: 88 }}>
              <Plaque index="§1" color="var(--signal)">Two sides of the dossier</Plaque>
              <div className="split-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ink)" }}>
                <div className="dz-card" style={{ background: "var(--paper)", padding: "40px 36px", border: "1px solid transparent", borderTop: "4px solid var(--signal)" }}>
                  <Stamp label="FOR" sub="talent" size={56} color="var(--signal)" rotate={-6} />
                  <h3 className="display" style={{ fontSize: 28, fontWeight: 600, margin: "20px 0 12px", letterSpacing: "-0.01em" }}>Build a record, not a résumé</h3>
                  <p style={{ color: "#3a3630", fontSize: 15, lineHeight: 1.7, margin: "0 0 22px" }}>Complete Skill Forges, launch SkillCapsules, and earn Clout. Your CraftRank does the talking — recruiters find you, not the other way around.</p>
                  <Link href="/for-talent" className="dz-link" style={{ fontWeight: 700, fontSize: 14, color: "var(--signal)" }}>Explore for talent →</Link>
                </div>
                <div className="dz-card" style={{ background: "var(--paper)", padding: "40px 36px", border: "1px solid transparent", borderTop: "4px solid var(--forge)" }}>
                  <Stamp label="FOR" sub="hiring" size={56} color="var(--forge)" rotate={6} />
                  <h3 className="display" style={{ fontSize: 28, fontWeight: 600, margin: "20px 0 12px", letterSpacing: "-0.01em" }}>Hire what you can see</h3>
                  <p style={{ color: "#3a3630", fontSize: 15, lineHeight: 1.7, margin: "0 0 22px" }}>Post a job with a built-in task, or launch a public Skill Forge. Browse The Showfloor and engage proven candidates directly.</p>
                  <Link href="/for-companies" className="dz-link" style={{ fontWeight: 700, fontSize: 14, color: "var(--forge)" }}>Explore for companies →</Link>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ══════ HOW IT WORKS ══════ */}
          <Reveal>
            <div style={{ marginBottom: 88 }}>
              <Plaque index="§2" color="var(--gold)">The process</Plaque>
              <h2 className="display" style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 40px", maxWidth: 560 }}>Apply with evidence, not adjectives.</h2>
              <div className="flow-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, border: "1px solid var(--grain)" }}>
                {[
                  { n: "01", t: "Task is posted", d: "Every job or Skill Forge ships with a real challenge — code, design, copy, strategy.", c: "var(--signal)" },
                  { n: "02", t: "You submit proof", d: "Your solution becomes a SkillCapsule, stamped and published to The Showfloor.", c: "var(--stamp)" },
                  { n: "03", t: "You get discovered", d: "SkillSignals, Spotlights, and Calls arrive. CraftRank climbs. Hiring follows.", c: "var(--forge)" },
                ].map((s, i) => (
                  <div key={i} className="dz-card" style={{ padding: "32px 28px", borderLeft: i > 0 ? "1px solid var(--grain)" : "none", border: "1px solid transparent", borderTop: `3px solid ${s.c}` }}>
                    <p className="mono" style={{ fontSize: 12, color: s.c, fontWeight: 700, margin: "0 0 14px" }}>{s.n}</p>
                    <h4 className="display" style={{ fontSize: 19, fontWeight: 600, margin: "0 0 10px" }}>{s.t}</h4>
                    <p style={{ fontSize: 14, color: "#3a3630", lineHeight: 1.65, margin: 0 }}>{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ══════ LIVE ROTATING SHOWCASE — Jobs / Forges / Capsules, each refreshing every 5s ══════ */}
          <Reveal>
            <div style={{ marginBottom: 88 }}>
              <Plaque index="§3" color="var(--plum)">Live right now — refreshes every 5s</Plaque>
              <h2 className="display" style={{ fontSize: 30, fontWeight: 600, margin: "0 0 28px" }}>The platform, in motion</h2>
              <div className="rotator-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>

                {/* JOB ROTATOR CARD */}
                <div style={{ border: "2px solid var(--ink)", background: "white", boxShadow: "5px 5px 0 var(--signal)", overflow: "hidden" }}>
                  <div style={{ background: "var(--signal)", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono" style={{ color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>OPEN ROLE</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} className="stamp-pulse" />
                  </div>
                  {job ? (
                    <div key={job.id} className="rot-anim" style={{ padding: "20px 18px", minHeight: 168, display: "flex", flexDirection: "column" }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.3 }}>{job.title}</h4>
                      <p style={{ fontSize: 12.5, color: "#8a8275", margin: "0 0 10px" }}>{job.company_name} · {job.location || "Remote"}</p>
                      <p style={{ fontSize: 12, color: "#3a3630", margin: "0 0 12px", background: "var(--grain-soft)", padding: "6px 10px", borderRadius: 4 }}>🎯 {job.task_title || "Complete a short challenge"}</p>
                      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--signal)" }}>₹{job.salary_min?.toLocaleString()}–{job.salary_max?.toLocaleString()}</span>
                        <Link href={`/jobs/${job.slug}`} className="dz-link" style={{ fontSize: 12, fontWeight: 700 }}>View →</Link>
                      </div>
                    </div>
                  ) : <div style={{ padding: "20px 18px", minHeight: 168, color: "#8a8275", fontSize: 13 }}>No open roles yet.</div>}
                  <div style={{ padding: "0 18px 14px" }}>
                    <div className="timer-track"><div className="timer-bar" key={jobRotator.key} style={{ background: "var(--signal)", animation: "barGrow 5s linear" }} /></div>
                  </div>
                </div>

                {/* FORGE ROTATOR CARD */}
                <div style={{ border: "2px solid var(--ink)", background: "white", boxShadow: "5px 5px 0 var(--forge)", overflow: "hidden" }}>
                  <div style={{ background: "var(--forge)", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono" style={{ color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>SKILL FORGE</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} className="stamp-pulse" />
                  </div>
                  {forge ? (
                    <div key={forge.id} className="rot-anim" style={{ padding: "20px 18px", minHeight: 168, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 18 }}>{getCat(forge.category).icon}</span>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 6px", lineHeight: 1.3 }}>{forge.title}</h4>
                      <p style={{ fontSize: 12.5, color: "#8a8275", margin: "0 0 10px" }}>{forge.company_name} · {forge.difficulty}</p>
                      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--forge)" }}>🏆 {forge.reward_clout} Clout</span>
                        <Link href={`/skill-forges/${forge.id}`} className="dz-link" style={{ fontSize: 12, fontWeight: 700 }}>View →</Link>
                      </div>
                    </div>
                  ) : <div style={{ padding: "20px 18px", minHeight: 168, color: "#8a8275", fontSize: 13 }}>No active forges yet.</div>}
                  <div style={{ padding: "0 18px 14px" }}>
                    <div className="timer-track"><div className="timer-bar" key={forgeRotator.key} style={{ background: "var(--forge)", animation: "barGrow 5s linear" }} /></div>
                  </div>
                </div>

                {/* CAPSULE ROTATOR CARD */}
                <div style={{ border: "2px solid var(--ink)", background: "white", boxShadow: "5px 5px 0 var(--gold)", overflow: "hidden" }}>
                  <div style={{ background: "var(--gold)", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono" style={{ color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>SHOWFLOOR</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} className="stamp-pulse" />
                  </div>
                  {cap ? (
                    <div key={"showcase-" + cap.id} className="rot-anim" style={{ padding: "20px 18px", minHeight: 168, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 18 }}>{getCat(cap.category).icon}</span>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 6px", lineHeight: 1.3 }}>{cap.title}</h4>
                      <p style={{ fontSize: 12.5, color: "#8a8275", margin: "0 0 10px" }}>{cap.user_full_name || `@${cap.user_username}`}</p>
                      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>RANK {cap.skill_impact_score}</span>
                        <Link href="/the-stage" className="dz-link" style={{ fontSize: 12, fontWeight: 700 }}>View →</Link>
                      </div>
                    </div>
                  ) : <div style={{ padding: "20px 18px", minHeight: 168, color: "#8a8275", fontSize: 13 }}>No capsules yet.</div>}
                  <div style={{ padding: "0 18px 14px" }}>
                    <div className="timer-track"><div className="timer-bar" key={capRotator.key} style={{ background: "var(--gold)", animation: "barGrow 5s linear" }} /></div>
                  </div>
                </div>

              </div>
            </div>
          </Reveal>

          {/* ══════ TRUST ══════ */}
          <Reveal>
            <div style={{ marginBottom: 88 }}>
              <Plaque index="§4" color="var(--rose)">Why it holds up</Plaque>
              <div className="trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, border: "1px solid var(--grain)" }}>
                {[
                  { t: "Always free", d: "No subscriptions, no premium tier for job seekers.", c: "var(--signal)" },
                  { t: "Manually verified", d: "Every listing is reviewed before it goes live.", c: "var(--gold)" },
                  { t: "Zero sensitive data", d: "We never ask for Aadhaar, PAN, or bank details.", c: "var(--forge)" },
                  { t: "Full transparency", d: "Know exactly when your profile is opened.", c: "var(--rose)" },
                ].map((t, i) => (
                  <div key={i} className="dz-card" style={{ padding: "26px 22px", borderLeft: i > 0 ? "1px solid var(--grain)" : "none", border: "1px solid transparent", borderTop: `3px solid ${t.c}` }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>{t.t}</h4>
                    <p style={{ fontSize: 13, color: "#8a8275", lineHeight: 1.6, margin: 0 }}>{t.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ══════ CLOUT / CRAFTRANK ══════ */}
          <Reveal>
            <div style={{ marginBottom: 88 }}>
              <Plaque index="§5" color="var(--stamp)">The ledger</Plaque>
              <div className="split-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--grain)" }}>
                <div style={{ background: "var(--paper)", padding: "32px 30px", borderTop: "4px solid var(--stamp)" }}>
                  <Stamp label="CLOUT" size={50} rotate={-4} color="var(--stamp)" />
                  <p style={{ fontSize: 14, color: "#3a3630", lineHeight: 1.7, margin: "16px 0 0" }}>Points earned from Skill Forges, SkillCapsules, and recognition. Unlocks Insignias at milestones.</p>
                </div>
                <div style={{ background: "var(--paper)", padding: "32px 30px", borderTop: "4px solid var(--forge)" }}>
                  <Stamp label="RANK" size={50} color="var(--forge)" rotate={4} />
                  <p style={{ fontSize: 14, color: "#3a3630", lineHeight: 1.7, margin: "16px 0 0" }}>CraftRank — your reputation score. SkillSignal +1, Spotlight +2, Call +4. Higher rank, better discovery.</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ══════ GLOSSARY (SEO depth) ══════ */}
          <Reveal>
            <div style={{ marginBottom: 88 }}>
              <Plaque index="§6" color="var(--plum)">Field notes</Plaque>
              <h2 className="display" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 28px" }}>OfSkillJob platform glossary</h2>
              <div className="glossary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--grain)" }}>
                {[
                  ["SkillCapsule", "Your published proof of work — live on The Showfloor.", "var(--signal)"],
                  ["Skill Forge", "A public challenge. Complete it to launch a capsule.", "var(--forge)"],
                  ["The Showfloor", "The live feed where all capsules are discovered.", "var(--gold)"],
                  ["Clout", "Points earned from forges, capsules, and recognition.", "var(--stamp)"],
                  ["CraftRank", "Your reputation score. Drives feed visibility.", "var(--plum)"],
                  ["Insignia", "A badge unlocked at Clout milestones.", "var(--rose)"],
                ].map(([term, def, color], i) => (
                  <div key={i} className="dz-card" style={{ background: "var(--paper)", padding: "20px 20px", border: "1px solid transparent", borderLeft: `3px solid ${color}` }}>
                    <h5 className="display" style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>{term}</h5>
                    <p style={{ fontSize: 13, color: "#8a8275", lineHeight: 1.6, margin: 0 }}>{def}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ══════ CTA BAND ══════ */}
          <Reveal>
            <div className="cta-band" style={{ background: "var(--ink)", color: "var(--paper)", padding: "72px 60px", marginBottom: 60, position: "relative", overflow: "hidden", border: "2px solid var(--ink)" }}>
              <div className="drift-blob" style={{ position: "absolute", top: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,var(--signal)33,transparent 70%)", filter: "blur(20px)" }} />
              <div style={{ position: "absolute", top: "50%", right: 60, transform: "translateY(-50%)" }}>
                <Stamp label="OSJ" sub="proof" size={120} color="var(--stamp)" rotate={-12} />
              </div>
              <div style={{ maxWidth: 560, position: "relative", zIndex: 1 }}>
                <p className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", color: "var(--stamp)", fontWeight: 700, textTransform: "uppercase", margin: "0 0 16px" }}>Ready when you are</p>
                <h2 className="cta-title display" style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 18px", lineHeight: 1.1 }}>Your next opportunity is one capsule away.</h2>
                <p style={{ fontSize: 16, color: "#cfc9ba", lineHeight: 1.7, margin: "0 0 32px" }}>Join the professionals who stopped applying and started proving.</p>
                <div className="btn-row" style={{ display: "flex", gap: 14 }}>
                  <button onClick={handleGetHired} className="dz-btn" style={{ background: "var(--paper)", color: "var(--ink)", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2 }}>Get Hired Free →</button>
                  <button onClick={handleHireTalent} className="dz-btn" style={{ background: "var(--forge)", color: "white", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2 }}>Hire Talent</button>
                </div>
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </>
  );
}