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

const CAT_META: Record<string, { icon: string; color: string }> = {
  design: { icon: "🎨", color: "#7A4FC2" }, development: { icon: "💻", color: "#2D6BFF" },
  writing: { icon: "✒️", color: "#0E8E8E" }, sales: { icon: "💼", color: "#2D6E5C" },
  marketing: { icon: "📈", color: "#E8A93B" }, research: { icon: "🔬", color: "#5A52D6" }, communication: { icon: "💬", color: "#E0457B" },
};
function getCat(c: string) { return CAT_META[c?.toLowerCase()] || { icon: "✦", color: "#6b6558" }; }

type Profile = { id: string; full_name: string | null; username: string | null; total_points: number; role: string; };
type Capsule = { id: string; title: string; category: string; skill_impact_score: number; signal_counts: Record<string, number>; recruiter_spots: number; };
type ForgeRec = { id: string; title: string; category: string; difficulty: string; reward_clout: number; company_name: string; };

export default function ForTalentPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const isLoggedIn = !!profile;

  const [statsLoaded, setStatsLoaded] = useState(false);
  const [stats, setStats] = useState({ devs: 0, capsules: 0, signals: 0 });
  const [countStart, setCountStart] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const devCount = useCounter(stats.devs, 1300, countStart);
  const capsuleCount = useCounter(stats.capsules, 1400, countStart);
  const signalCount = useCounter(stats.signals, 1500, countStart);

  const [topCapsules, setTopCapsules] = useState<any[]>([]);
  const capRotator = useRotator(topCapsules, 5000);
  const [allForges, setAllForges] = useState<any[]>([]);
  const forgeRotator = useRotator(allForges, 5000);

  const blobA = useParallax(0.25);
  const blobB = useParallax(0.4);
  const heroCard = useParallax(0.08);

  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const [myCapsules, setMyCapsules] = useState<Capsule[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [recommendedForges, setRecommendedForges] = useState<ForgeRec[]>([]);
  const [recentSignals, setRecentSignals] = useState(0);
  const [recentSpotlights, setRecentSpotlights] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("users").select("id, full_name, username, total_points, role").eq("id", user.id).single();
        if (data?.role === "company") { router.replace("/for-companies"); return; }
        if (data) setProfile(data);
      }
      setCheckingAuth(false);
    })();
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;
    (async () => {
      const [devRes, capRes, sigRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "developer"),
        supabase.from("skill_capsules").select("id", { count: "exact", head: true }),
        supabase.from("skill_signals").select("id", { count: "exact", head: true }),
      ]);
      setStats({ devs: devRes.count || 0, capsules: capRes.count || 0, signals: sigRes.count || 0 });
      setStatsLoaded(true);
    })();
    (async () => {
      const { data } = await supabase
        .from("skill_capsules")
        .select("id, title, category, skill_impact_score, user:user_id ( full_name, username )")
        .eq("visibility", "public")
        .order("skill_impact_score", { ascending: false })
        .limit(8);
      if (data) setTopCapsules(data);
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
    if (!profile) return;
    (async () => {
      const { data: capsules } = await supabase
        .from("skill_capsules")
        .select("id, title, category, skill_impact_score, signal_counts, recruiter_spots")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(4);
      setMyCapsules(capsules || []);

      const { data: allUsers } = await supabase.from("users").select("id").eq("role", "developer").order("total_points", { ascending: false });
      if (allUsers) { const idx = allUsers.findIndex((u: any) => u.id === profile.id); setMyRank(idx !== -1 ? idx + 1 : null); }

      const { data: forges } = await supabase
        .from("skill_forges")
        .select("id, title, category, difficulty, reward_clout, users:company_sponsor_id ( company_name )")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      if (forges) setRecommendedForges(forges.map((f: any) => ({ id: f.id, title: f.title, category: f.category, difficulty: f.difficulty, reward_clout: f.reward_clout, company_name: f.users?.company_name || "Company" })));

      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const capsuleIds = (capsules || []).map((c: any) => c.id);
      if (capsuleIds.length) {
        const { count: sigCount } = await supabase.from("skill_signals").select("*", { count: "exact", head: true }).in("capsule_id", capsuleIds).gte("created_at", sevenDaysAgo.toISOString());
        setRecentSignals(sigCount || 0);
      }
      const { count: spotCount } = await supabase.from("recruiter_spotlights").select("*", { count: "exact", head: true }).eq("candidate_id", profile.id).gte("created_at", sevenDaysAgo.toISOString());
      setRecentSpotlights(spotCount || 0);
    })();
  }, [profile]);

  useEffect(() => {
    if (!statsLoaded) return;
    const el = statsRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setCountStart(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [statsLoaded]);

  function handleStart() { localStorage.setItem("selectedRole", "developer"); router.push("/signup"); }

  const FAQS = [
    { q: "What is a SkillCapsule?", a: "A SkillCapsule is your published proof of work — a project, task submission, or Skill Forge solution that goes live on The Showfloor for recruiters and peers to discover." },
    { q: "What's the difference between Clout and CraftRank?", a: "Clout is your point total, earned from completing Skill Forges, launching SkillCapsules, and receiving recognition. CraftRank is your reputation score — it determines how visible you are in feeds and search." },
    { q: "Is it really free?", a: "Yes. Every feature for job seekers is 100% free — no subscriptions, no premium tiers." },
    { q: "Do I need experience to start?", a: "No. Skill Forges span Beginner, Intermediate, and Advanced difficulty. Start with beginner-friendly challenges and build CraftRank from zero." },
    { q: "How do recruiters find me?", a: "Once your SkillCapsule is live on The Showfloor, recruiters browse, send SkillSignals, Spotlight your work, or Call you directly." },
  ];

  const firstName = profile?.full_name?.split(" ")[0] || profile?.username;
  const cap = topCapsules[capRotator.index];
  const forge = allForges[forgeRotator.index];

  if (checkingAuth) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", background: "#F7F5EF" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: "3px solid #D9D3C4", borderTopColor: "#FF5A1F", animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>For Job Seekers – OfSkillJob | Show Skills, Get Hired With Real Proof</title>
        <meta name="description" content="Build your Skills Profile, complete Skill Forges, launch SkillCapsules, and get discovered by recruiters based on real proof of work — not a résumé. 100% free for job seekers in India." />
        <meta name="keywords" content="skill based hiring, proof of work jobs, SkillCapsule, Skill Forge, CraftRank, OfSkillJob, job seeker India, no resume hiring" />
        <link rel="canonical" href="https://ofskilljob.com/for-talent" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="OfSkillJob for Job Seekers — Show Skills, Get Hired" />
        <meta property="og:description" content="Prove your skills with real tasks. Earn Clout, build CraftRank, and get hired — no résumé black holes." />
        <meta property="og:url" content="https://ofskilljob.com/for-talent" />
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
          { "@type": "ListItem", position: 2, name: "For Job Seekers", item: "https://ofskilljob.com/for-talent" },
        ],
      }) }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
        :root{ --ink:#16181D; --paper:#F8F6F0; --stamp:#E0603A; --forge:#5C8A6E; --signal:#5E7BAE; --gold:#D9A24B; --plum:#8A6FB5; --rose:#C76B86; --grain:#DCD6C8; --grain-soft:#EEEAE0; }
        *,*::before,*::after{box-sizing:border-box}
        html,body{ overflow-x:hidden !important; background:var(--paper); }
        .ft-dossier{ font-family:'Inter',system-ui,sans-serif; color:var(--ink); }
        .ft-display{ font-family:'Fraunces',Georgia,serif; }
        .ft-mono{ font-family:'JetBrains Mono',monospace; }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(255,90,31,.45)}70%{box-shadow:0 0 0 12px rgba(255,90,31,0)}100%{box-shadow:0 0 0 0 rgba(255,90,31,0)}}
        @keyframes floatY{0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-8px) rotate(var(--r,0deg))}}
        @keyframes rotOutIn{0%{opacity:0;transform:translateY(10px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes barGrow{from{width:0}}
        @keyframes drift{0%,100%{transform:translate(0,0)}50%{transform:translate(14px,-10px)}}
        .ft-link{ position:relative; text-decoration:none; color:var(--ink); }
        .ft-link::after{ content:""; position:absolute; left:0; right:0; bottom:-2px; height:1px; background:currentColor; transform:scaleX(0); transform-origin:left; transition:transform .25s ease; }
        .ft-link:hover::after{ transform:scaleX(1); }
        .ft-btn{ transition:transform .18s ease, box-shadow .18s ease; cursor:pointer; }
        .ft-btn:hover{ transform:translateY(-3px) rotate(-0.4deg); box-shadow:5px 5px 0 var(--ink); }
        .ft-btn:active{ transform:translateY(0) scale(.98); }
        .ft-card{ transition:transform .25s ease, border-color .2s ease, box-shadow .2s ease; }
        .ft-card:hover{ transform:translateY(-4px); border-color:var(--ink) !important; box-shadow:4px 4px 0 var(--grain); }
        .ft-faq{ cursor:pointer; }
        .ft-float{ --r:-3deg; animation: floatY 5s ease-in-out infinite; }
        .ft-drift{ animation: drift 9s ease-in-out infinite; }
        .ft-pulse{ animation: pulseRing 2.4s infinite; }
        .ft-rot{ animation: rotOutIn .45s cubic-bezier(.2,.8,.2,1) both; }
        .timer-track{ height:3px; background:var(--grain-soft); border-radius:2px; overflow:hidden; }
        .timer-bar{ height:100%; border-radius:2px; }
        .perf-top{ background-image: radial-gradient(circle at 6px 0, transparent 5px, var(--paper) 5.5px); background-size: 14px 12px; background-position: 0 -6px; background-repeat: repeat-x; }

        @media(max-width:880px){
          .ft-hero-grid{ grid-template-columns:1fr !important; gap:32px !important; }
          .ft-hero-title{ font-size:13vw !important; }
          .ft-stats-grid{ grid-template-columns:1fr 1fr !important; }
          .ft-grid3{ grid-template-columns:1fr !important; }
          .ft-grid4{ grid-template-columns:1fr 1fr !important; }
          .ft-grid2{ grid-template-columns:1fr !important; }
          .ft-btn-row{ flex-direction:column !important; }
          .ft-btn-row > *{ width:100% !important; text-align:center !important; }
          .ft-cta-band{ padding:48px 24px !important; }
          .ft-rotator-grid{ grid-template-columns:1fr !important; }
        }
      `}</style>

      <div className="ft-dossier" style={{ minHeight: "100vh", background: "var(--paper)", position: "relative", overflow: "hidden" }}>

        <div ref={blobA.ref} className="ft-drift" style={{ position: "absolute", top: 60, right: -120, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,var(--signal)22,transparent 70%)", filter: "blur(10px)", pointerEvents: "none", transform: `translateY(${blobA.offset}px)` }} />
        <div ref={blobB.ref} className="ft-drift" style={{ position: "absolute", top: 1100, left: -130, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,var(--gold)2a,transparent 70%)", filter: "blur(10px)", pointerEvents: "none", animationDelay: "3s", transform: `translateY(${blobB.offset}px)` }} />

        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 1 }}>

          {/* ══════ HERO ══════ */}
          <div className="ft-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 56, alignItems: "center", padding: "48px 0 56px" }}>
            <div>
              {isLoggedIn ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
                    <span className="ft-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--stamp)", display: "inline-block" }} />
                    <span className="ft-mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8275", fontWeight: 700 }}>Your dossier</span>
                  </div>
                  <h1 className="ft-hero-title ft-display" style={{ fontSize: 52, fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.02em", margin: "0 0 22px" }}>
                    Welcome back, <em style={{ fontStyle: "italic", color: "var(--stamp)" }}>{firstName}</em>.
                  </h1>
                  <p style={{ fontSize: 17, color: "#3a3630", lineHeight: 1.7, margin: "0 0 30px", maxWidth: 480 }}>
                    {myRank ? <>You're ranked <strong style={{ color: "var(--signal)" }}>#{myRank}</strong> on The Roster with <strong style={{ color: "var(--stamp)" }}>{(profile?.total_points || 0).toLocaleString()} Clout</strong>.</> : "Complete a Skill Forge to start earning Clout and climb The Roster."}
                  </p>
                  <div className="ft-btn-row" style={{ display: "flex", gap: 14 }}>
                    <Link href="/launch-skillcapsule" className="ft-btn" style={{ background: "var(--ink)", color: "var(--paper)", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2, textDecoration: "none", display: "inline-block" }}>✦ Launch a SkillCapsule</Link>
                    <Link href="/skill-forges" className="ft-btn" style={{ background: "var(--signal)", color: "white", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2, textDecoration: "none", display: "inline-block" }}>Browse Skill Forges</Link>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
                    <span className="ft-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--stamp)", display: "inline-block" }} />
                    <span className="ft-mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8275", fontWeight: 700 }}>For job seekers</span>
                  </div>
                  <h1 className="ft-hero-title ft-display" style={{ fontSize: 56, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", margin: "0 0 24px" }}>
                    Your skills are<br /><em style={{ fontStyle: "italic", color: "var(--stamp)" }}>the résumé now.</em>
                  </h1>
                  <p style={{ fontSize: 17, color: "#3a3630", lineHeight: 1.7, margin: "0 0 30px", maxWidth: 480 }}>
                    Build a Skills Profile, complete Skill Forges, and launch SkillCapsules that prove what you can do. Recruiters discover <strong style={{ color: "var(--signal)" }}>you</strong> — not the other way around.
                  </p>
                  <div className="ft-btn-row" style={{ display: "flex", gap: 14 }}>
                    <button onClick={handleStart} className="ft-btn" style={{ background: "var(--ink)", color: "var(--paper)", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2 }}>Build My Profile Free →</button>
                    <Link href="/skill-forges" className="ft-btn" style={{ background: "var(--signal)", color: "white", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2, textDecoration: "none", display: "inline-block" }}>Browse Skill Forges</Link>
                  </div>
                </>
              )}
            </div>

            {/* receipt card */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div ref={heroCard.ref} className="ft-float" style={{ background: "white", width: 320, border: "2px solid var(--ink)", position: "relative", boxShadow: "7px 7px 0 var(--signal)", transform: `translateY(${heroCard.offset}px)` }}>
                <div className="perf-top" style={{ height: 8, borderBottom: "1px dashed var(--grain)" }} />
                <div style={{ padding: "24px 26px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div>
                      <p className="ft-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "#8a8275", margin: "0 0 4px" }}>{isLoggedIn ? "YOUR LEDGER" : "SAMPLE CAPSULE"}</p>
                      <p className="ft-mono" style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--signal)" }}>{isLoggedIn ? `@${profile?.username || "you"}` : "OSJ-4471-RX"}</p>
                    </div>
                    <Stamp label={isLoggedIn ? "YOU" : "PROOF"} sub={isLoggedIn ? "ranked" : "verified"} size={64} rotate={10} />
                  </div>
                  <div style={{ borderTop: "1px dashed var(--grain)", borderBottom: "1px dashed var(--grain)", padding: "14px 0", marginBottom: 14 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>{isLoggedIn ? (myCapsules[0]?.title || "No capsules yet") : "Real-Time Sales Dashboard"}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#8a8275" }}>{isLoggedIn ? `${myCapsules.length} capsule${myCapsules.length !== 1 ? "s" : ""} launched` : "React · TypeScript · Recharts"}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    <div>
                      <p className="ft-mono" style={{ fontSize: 9, color: "#8a8275", letterSpacing: "0.08em", margin: "0 0 2px" }}>ROSTER RANK</p>
                      <p className="ft-mono" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--stamp)" }}>{isLoggedIn ? (myRank ? `#${myRank}` : "—") : "#87"}</p>
                    </div>
                    <div>
                      <p className="ft-mono" style={{ fontSize: 9, color: "#8a8275", letterSpacing: "0.08em", margin: "0 0 2px" }}>CLOUT</p>
                      <p className="ft-mono" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--forge)" }}>{isLoggedIn ? (profile?.total_points || 0).toLocaleString() : "+150"}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8a8275" }}>
                    <span>⚡ {isLoggedIn ? recentSignals : 12} signals</span>
                    <span>🔦 {isLoggedIn ? recentSpotlights : 3} spotlights</span>
                  </div>
                </div>
                <div className="perf-top" style={{ height: 8, borderTop: "1px dashed var(--grain)", transform: "rotate(180deg)" }} />
              </div>
            </div>
          </div>

          {/* ══════ STATS ══════ */}
          <Reveal>
            <div ref={statsRef} className="ft-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--grain)", border: "1px solid var(--grain)", marginBottom: 76 }}>
              {[
                { val: devCount, label: "Developers building profiles", c: "var(--signal)" },
                { val: capsuleCount, label: "SkillCapsules on the Showfloor", c: "var(--gold)" },
                { val: signalCount, label: "SkillSignals sent", c: "var(--stamp)" },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--paper)", padding: "26px 20px", textAlign: "center" }}>
                  <div className="ft-mono ft-display" style={{ fontSize: 32, fontWeight: 600, color: s.c }}>{statsLoaded ? `${s.val}+` : "—"}</div>
                  <div style={{ fontSize: 12, color: "#8a8275", fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* ══════ YOUR CAPSULES (logged-in only) ══════ */}
          {isLoggedIn && (
            <Reveal>
              <div style={{ marginBottom: 76 }}>
                <Plaque index="§1" color="var(--signal)">Your SkillCapsules</Plaque>
                {myCapsules.length === 0 ? (
                  <div style={{ border: "1px dashed var(--grain)", padding: "36px 24px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 16px", color: "#8a8275", fontSize: 14 }}>You haven't launched a SkillCapsule yet.</p>
                    <Link href="/launch-skillcapsule" className="ft-btn" style={{ background: "var(--ink)", color: "var(--paper)", padding: "10px 20px", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-block" }}>Launch your first →</Link>
                  </div>
                ) : (
                  <div className="ft-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "var(--grain)" }}>
                    {myCapsules.map(c => {
                      const sigs = Object.values(c.signal_counts || {}).reduce((a, b) => a + b, 0);
                      const cm = getCat(c.category);
                      return (
                        <div key={c.id} className="ft-card" style={{ background: "var(--paper)", padding: "18px 16px", border: "1px solid transparent", borderTop: `3px solid ${cm.color}` }}>
                          <span style={{ fontSize: 16 }}>{cm.icon}</span>
                          <p style={{ margin: "10px 0 8px", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{c.title}</p>
                          <p className="ft-mono" style={{ margin: 0, fontSize: 11, color: "var(--stamp)" }}>RANK {c.skill_impact_score} · {sigs} signals</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {/* ══════ LIVE ROTATING SHOWCASE — refreshes every 5s ══════ */}
          <Reveal>
            <div style={{ marginBottom: 76 }}>
              <Plaque index={isLoggedIn ? "§2" : "§1"} color="var(--plum)">Live right now — refreshes every 5s</Plaque>
              <div className="ft-rotator-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

                <div style={{ border: "2px solid var(--ink)", background: "white", boxShadow: "5px 5px 0 var(--forge)", overflow: "hidden" }}>
                  <div style={{ background: "var(--forge)", padding: "8px 16px", display: "flex", justifyContent: "space-between" }}>
                    <span className="ft-mono" style={{ color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>SKILL FORGE</span>
                    <span className="ft-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} />
                  </div>
                  {forge ? (
                    <div key={forge.id} className="ft-rot" style={{ padding: "20px 18px", minHeight: 150 }}>
                      <span style={{ fontSize: 18 }}>{getCat(forge.category).icon}</span>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 6px" }}>{forge.title}</h4>
                      <p style={{ fontSize: 12.5, color: "#8a8275", margin: "0 0 12px" }}>{forge.company_name} · {forge.difficulty}</p>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="ft-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--forge)" }}>🏆 {forge.reward_clout} Clout</span>
                        <Link href={`/skill-forges/${forge.id}`} className="ft-link" style={{ fontSize: 12, fontWeight: 700 }}>View →</Link>
                      </div>
                    </div>
                  ) : <div style={{ padding: "20px 18px", minHeight: 150, color: "#8a8275", fontSize: 13 }}>No active forges yet.</div>}
                  <div style={{ padding: "0 18px 14px" }}><div className="timer-track"><div className="timer-bar" key={forgeRotator.key} style={{ background: "var(--forge)", animation: "barGrow 5s linear" }} /></div></div>
                </div>

                <div style={{ border: "2px solid var(--ink)", background: "white", boxShadow: "5px 5px 0 var(--gold)", overflow: "hidden" }}>
                  <div style={{ background: "var(--gold)", padding: "8px 16px", display: "flex", justifyContent: "space-between" }}>
                    <span className="ft-mono" style={{ color: "white", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>SHOWFLOOR</span>
                    <span className="ft-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "inline-block" }} />
                  </div>
                  {cap ? (
                    <div key={cap.id} className="ft-rot" style={{ padding: "20px 18px", minHeight: 150 }}>
                      <span style={{ fontSize: 18 }}>{getCat(cap.category).icon}</span>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 6px" }}>{cap.title}</h4>
                      <p style={{ fontSize: 12.5, color: "#8a8275", margin: "0 0 12px" }}>{cap.user?.full_name || `@${cap.user?.username}`}</p>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="ft-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>RANK {cap.skill_impact_score}</span>
                        <Link href="/the-stage" className="ft-link" style={{ fontSize: 12, fontWeight: 700 }}>View →</Link>
                      </div>
                    </div>
                  ) : <div style={{ padding: "20px 18px", minHeight: 150, color: "#8a8275", fontSize: 13 }}>No capsules yet.</div>}
                  <div style={{ padding: "0 18px 14px" }}><div className="timer-track"><div className="timer-bar" key={capRotator.key} style={{ background: "var(--gold)", animation: "barGrow 5s linear" }} /></div></div>
                </div>

              </div>
            </div>
          </Reveal>

          {/* ══════ RECOMMENDED FORGES (logged-in only) ══════ */}
          {isLoggedIn && recommendedForges.length > 0 && (
            <Reveal>
              <div style={{ marginBottom: 76 }}>
                <Plaque index="§3" color="var(--forge)">Recommended Skill Forges</Plaque>
                <div className="ft-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--grain)" }}>
                  {recommendedForges.map(f => {
                    const cm = getCat(f.category);
                    return (
                      <Link key={f.id} href={`/skill-forges/${f.id}`} style={{ textDecoration: "none" }}>
                        <div className="ft-card" style={{ background: "var(--paper)", padding: "20px 18px", border: "1px solid transparent", borderTop: `3px solid ${cm.color}`, height: "100%" }}>
                          <span style={{ fontSize: 16 }}>{cm.icon}</span>
                          <p style={{ margin: "10px 0 4px", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{f.title}</p>
                          <p style={{ margin: 0, fontSize: 12, color: "#8a8275" }}>{f.company_name} · 🏆 {f.reward_clout} Clout</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          )}

          {/* ══════ HOW IT WORKS ══════ */}
          <Reveal>
            <div style={{ marginBottom: 76 }}>
              <Plaque index={isLoggedIn ? "§4" : "§2"} color="var(--gold)">How it works</Plaque>
              <div className="ft-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, border: "1px solid var(--grain)" }}>
                {[
                  { n: "01", t: "Build your profile", d: "Skills, experience, education, and an optional intro video.", c: "var(--signal)" },
                  { n: "02", t: "Complete a Skill Forge", d: "Pick a real challenge — coding, design, marketing, sales.", c: "var(--forge)" },
                  { n: "03", t: "Launch a SkillCapsule", d: "Your submission auto-publishes to The Showfloor.", c: "var(--gold)" },
                  { n: "04", t: "Get discovered", d: "Earn signals, spotlights, calls. Watch CraftRank climb.", c: "var(--stamp)" },
                ].map((s, i) => (
                  <div key={i} className="ft-card" style={{ padding: "26px 22px", borderLeft: i > 0 ? "1px solid var(--grain)" : "none", border: "1px solid transparent", borderTop: `3px solid ${s.c}` }}>
                    <p className="ft-mono" style={{ fontSize: 11, color: s.c, fontWeight: 700, margin: "0 0 12px" }}>{s.n}</p>
                    <h4 className="ft-display" style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>{s.t}</h4>
                    <p style={{ fontSize: 13, color: "#3a3630", lineHeight: 1.6, margin: 0 }}>{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ══════ CLOUT / CRAFTRANK / INSIGNIAS ══════ */}
          <Reveal>
            <div style={{ marginBottom: 76 }}>
              <Plaque index={isLoggedIn ? "§5" : "§3"} color="var(--stamp)">Your reputation</Plaque>
              <div className="ft-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--grain)" }}>
                {[["Clout", "Points earned from Skill Forges, SkillCapsules, and recognition.", "var(--stamp)"], ["CraftRank", "Reputation score: +1 signal, +2 spotlight, +4 call. Drives discovery.", "var(--forge)"], ["Insignias", "Prestige badges unlocked at Clout milestones — visible on your profile.", "var(--plum)"]].map(([t, d, c], i) => (
                  <div key={i} style={{ background: "var(--paper)", padding: "26px 22px", borderTop: `4px solid ${c}` }}>
                    <Stamp label={(t as string).slice(0, 4).toUpperCase()} size={48} rotate={i % 2 === 0 ? -5 : 5} color={c as string} />
                    <h4 className="ft-display" style={{ fontSize: 17, fontWeight: 600, margin: "16px 0 8px" }}>{t}</h4>
                    <p style={{ fontSize: 13, color: "#3a3630", lineHeight: 1.65, margin: 0 }}>{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ══════ WHY DIFFERENT (logged-out only) ══════ */}
          {!isLoggedIn && (
            <Reveal>
              <div style={{ marginBottom: 76 }}>
                <Plaque index="§4" color="var(--rose)">Why job seekers choose OfSkillJob</Plaque>
                <div className="ft-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, border: "1px solid var(--grain)" }}>
                  {[["Always free", "No subscriptions, no premium tiers, ever.", "var(--signal)"], ["Manually verified", "Every listing reviewed before going live.", "var(--gold)"], ["Full transparency", "Know exactly when your capsule is viewed.", "var(--forge)"], ["Video intro = 2× callbacks", "Recruiters prefer candidates they can see.", "var(--rose)"]].map(([t, d, c], i) => (
                    <div key={i} className="ft-card" style={{ padding: "24px 20px", borderLeft: i > 0 ? "1px solid var(--grain)" : "none", border: "1px solid transparent", borderTop: `3px solid ${c}` }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>{t}</h4>
                      <p style={{ fontSize: 13, color: "#8a8275", lineHeight: 1.6, margin: 0 }}>{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {/* ══════ FAQ ══════ */}
          <Reveal>
            <div style={{ marginBottom: 76, maxWidth: 720 }}>
              <Plaque index={isLoggedIn ? "§6" : "§5"} color="var(--plum)">Questions</Plaque>
              <div style={{ display: "grid", gap: 0, border: "1px solid var(--grain)" }}>
                {FAQS.map((f, i) => (
                  <div key={i} className="ft-faq" onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ borderTop: i > 0 ? "1px solid var(--grain)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{f.q}</span>
                      <span className="ft-mono" style={{ fontSize: 16, color: "var(--stamp)", transform: faqOpen === i ? "rotate(45deg)" : "none", transition: "transform .2s" }}>+</span>
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
              <div className="ft-cta-band" style={{ background: "var(--ink)", color: "var(--paper)", padding: "64px 56px", marginBottom: 56, position: "relative", overflow: "hidden", border: "2px solid var(--ink)" }}>
                <div className="ft-drift" style={{ position: "absolute", top: -50, left: -50, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,var(--signal)33,transparent 70%)", filter: "blur(18px)" }} />
                <div style={{ position: "absolute", top: "50%", right: 50, transform: "translateY(-50%)" }}>
                  <Stamp label="GO" sub="now" size={100} color="var(--stamp)" rotate={-10} />
                </div>
                <div style={{ maxWidth: 520, position: "relative", zIndex: 1 }}>
                  <h2 className="ft-display" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 16px" }}>Stop applying. Start proving.</h2>
                  <p style={{ fontSize: 15, color: "#cfc9ba", lineHeight: 1.7, margin: "0 0 28px" }}>Build your Skills Profile in under 5 minutes and launch your first SkillCapsule today.</p>
                  <button onClick={handleStart} className="ft-btn" style={{ background: "var(--paper)", color: "var(--ink)", border: "none", padding: "15px 28px", fontWeight: 700, fontSize: 15, borderRadius: 2 }}>Get Started Free →</button>
                </div>
              </div>
            </Reveal>
          )}

        </div>
      </div>
    </>
  );
}