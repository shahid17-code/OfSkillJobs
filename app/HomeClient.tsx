"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = {
  id: string;
  email?: string;
  // ... other fields
};

export default function HomeClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getData() {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        setUser(user);
        if (user) {
          const { data, error: roleError } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
          if (roleError) throw new Error(roleError.message);
          setRole(data?.role || null);
        }
      } catch (err: any) {
        console.error("Auth error:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, []);

  async function handleGetHired() {
    localStorage.setItem("selectedRole", "developer");
    if (user) {
      router.push("/profile/edit");
    } else {
      router.push("/signup");
    }
  }

  async function handleHireTalent() {
    localStorage.setItem("selectedRole", "company");
    if (user && role === "company") {
      router.push("/company/jobs/new");
    } else if (user && role !== "company") {
      alert("You are registered as a developer. Please create a company account to post jobs.");
    } else {
      router.push("/signup");
    }
  }

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.loader}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p>Something went wrong: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <>
      {/* Global styles for hover effects and mobile arrows */}
      <style>{`
        .btn-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .btn-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .btn-hover:active {
          transform: scale(0.96);
        }
        @media (max-width: 768px) {
          .flow-arrow {
            display: none;
          }
          .flow-arrow-mobile {
            display: block;
            font-size: 2rem;
            text-align: center;
            color: #94a3b8;
            margin: 0;
          }
        }
        @media (min-width: 769px) {
          .flow-arrow {
            display: block;
          }
          .flow-arrow-mobile {
            display: none;
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        {/* Hero Section */}
        <div style={styles.hero}>
          <div style={styles.heroContent}>
            <div style={styles.brand}>
              <img src="/favicon.png" alt="OfSkillJob Logo" width="48" height="48" style={{ width: '48px', height: '48px' }} />
              <span style={styles.brandName}>OfSkillJob</span>
            </div>
            <h1 style={styles.heroTitle}>Show Skills. Get Hired.</h1>
            <p style={styles.heroSubtitle}>
              The only platform where you prove your skills with real tasks before you apply.
              Companies post challenges – you complete them – then apply. No more black‑hole resumes.
            </p>
            <div style={styles.buttonGroup}>
              <button onClick={handleGetHired} className="btn-hover" style={styles.primaryBtn}>Get Hired →</button>
              <button onClick={handleHireTalent} className="btn-hover" style={styles.secondaryBtn}>Hire Talent →</button>
            </div>
          </div>
          <div style={styles.heroImage}>
            <div style={styles.placeholderImage}>🎯</div>
          </div>
        </div>

        {/* Task‑First Application Process (mobile‑friendly arrows) */}
        <div style={styles.taskFlow}>
          <h2 style={styles.sectionTitle}>How applying works</h2>
          <div style={styles.flowGrid}>
            {[
              { number: 1, icon: "📋", title: "Company posts a task", desc: "Every job comes with a relevant skill test – a coding problem, a design mock, a marketing plan, or a sales scenario." },
              { number: 2, icon: "💪", title: "You complete the task", desc: "Show your real ability. Upload your solution (Google Drive link, code repo, design file, etc.)." },
              { number: 3, icon: "🎯", title: "Apply only if you succeed", desc: "Your application is sent only after a successful task submission. Companies see verified skills – not just a resume." }
            ].map((step, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", width: "100%", flexDirection: "column" }}>
                <div style={styles.flowCard}>
                  <div style={styles.flowNumber}>{step.number}</div>
                  <div style={styles.flowIcon}>{step.icon}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
                {idx < 2 && (
                  <>
                    <div className="flow-arrow" style={styles.flowArrow}>→</div>
                    <div className="flow-arrow-mobile" style={{ fontSize: "2rem", textAlign: "center", color: "#94a3b8" }}>↓</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof Stats */}
        <div style={styles.statsBar}>
          <div><strong>50+</strong><br />Verified Companies</div>
          <div><strong>1000+</strong><br />Active Job Seekers</div>
          <div><strong>100+</strong><br />Successful Placements</div>
        </div>

        {/* Trust Section */}
        <div style={styles.trustSection}>
          <h2 style={{ ...styles.sectionTitle, fontSize: "28px" }}>🔒 Why you can trust OfSkillJob</h2>
          <div style={styles.trustGrid}>
            <div style={styles.trustCard}>✅ 100% free for job seekers – no hidden fees</div>
            <div style={styles.trustCard}>✅ Every job manually reviewed before listing</div>
            <div style={styles.trustCard}>✅ No Aadhaar / PAN / bank details asked – ever</div>
            <div style={styles.trustCard}>✅ Your data is encrypted and never sold</div>
          </div>
        </div>

        {/* Community Links */}
        <div style={styles.communityBar}>
          <p style={styles.communityText}>Join our trusted community →</p>
          <div style={styles.communityLinks}>
            <a href="https://reddit.com/u/OfSkillJob" target="_blank" rel="noopener noreferrer" className="btn-hover" style={styles.communityLink}>
              <span style={{ fontSize: "1.5rem" }}>🤝</span> Reddit: u/OfSkillJob
            </a>
            <a href="https://t.me/OfSkillJob" target="_blank" rel="noopener noreferrer" className="btn-hover" style={styles.communityLink}>
              <span style={{ fontSize: "1.5rem" }}>✈️</span> Telegram: @OfSkillJob
            </a>
            <a href="https://www.linkedin.com/company/ofskilljob" target="_blank" rel="noopener noreferrer" className="btn-hover" style={styles.communityLink}>
              <span style={{ fontSize: "1.5rem" }}>🔗</span> LinkedIn
            </a>
          </div>
        </div>

        {/* How we're different */}
        <div style={styles.different}>
          <h2 style={styles.sectionTitle}>How we're different</h2>
          <div style={styles.diffGrid}>
            <div key="task-first" style={styles.diffCard}>
              <div style={styles.diffIcon}>✅</div>
              <h3>Task‑first screening</h3>
              <p>You can't apply until you prove your skill. Companies get pre‑filtered, serious candidates.</p>
            </div>
            <div key="badges" style={styles.diffCard}>
              <div style={styles.diffIcon}>🏆</div>
              <h3>Earn badges & leaderboard</h3>
              <p>Get points for completing tasks, applying, and daily streaks. Stand out from the crowd.</p>
            </div>
            <div key="tracking" style={styles.diffCard}>
              <div style={styles.diffIcon}>📊</div>
              <h3>Real‑time tracking</h3>
              <p>Know exactly when your profile is viewed, resume downloaded, or you're shortlisted.</p>
            </div>
            <div key="video" style={styles.diffCard}>
              <div style={styles.diffIcon}>🎥</div>
              <h3>Video intros → 2x callbacks</h3>
              <p>Add a short intro video. Recruiters love seeing the person behind the profile.</p>
            </div>
          </div>
        </div>

        {/* Simple 3‑step journey */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Simple 3‑step journey</h2>
          <div style={styles.grid3}>
            <div key="build" style={styles.card}>
              <div style={styles.cardIcon}>📝</div>
              <h3>1. Build Profile</h3>
              <p>Add your skills, experience, projects, and a short intro video – all for free.</p>
            </div>
            <div key="challenges" style={styles.card}>
              <div style={styles.cardIcon}>🏆</div>
              <h3>2. Complete Challenges</h3>
              <p>Choose from 25+ real‑world tasks (coding, design, business, marketing…).</p>
            </div>
            <div key="hired" style={styles.card}>
              <div style={styles.cardIcon}>🚀</div>
              <h3>3. Get Hired</h3>
              <p>Companies discover you based on your verified skills and performance.</p>
            </div>
          </div>
        </div>

        {/* Jobs for Everyone */}
        <div style={styles.sectionAlt}>
          <h2 style={styles.sectionTitle}>Jobs for Every Industry</h2>
          <p style={styles.sectionDesc}>From software development to digital marketing, sales, design, and more.</p>
          <div style={styles.grid4}>
            {["💻 IT & Software","📊 Data Science","🎨 Graphic Design","📈 Digital Marketing","💼 Sales & BD","✍️ Content Writing","📞 Customer Support","🔧 Project Management"].map((pill, i) => (
              <div key={i} style={styles.pill}>{pill}</div>
            ))}
          </div>
          <Link href="/jobs">
            <button className="btn-hover" style={styles.outlineBtn}>Browse All Jobs →</button>
          </Link>
        </div>

        {/* Final CTA */}
        <div style={styles.cta}>
          <h2>Ready to take the next step?</h2>
          <p>Join thousands of professionals who found their dream job through skills.</p>
          <div style={styles.buttonGroup}>
            <button onClick={handleGetHired} className="btn-hover" style={styles.primaryBtn}>Get Hired Now</button>
            <button onClick={handleHireTalent} className="btn-hover" style={styles.secondaryBtnDark}>Post a Job</button>
          </div>
        </div>
      </div>
    </>
  );
}

// -- Styles (all same as original, with added loader & error styles) --
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 24px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  loaderContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
  },
  loader: {
    width: "48px",
    height: "48px",
    border: "4px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorContainer: {
    textAlign: "center",
    padding: "60px 20px",
  },
  hero: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "40px",
    margin: "60px 0 80px",
  },
  heroContent: {
    flex: 1,
    minWidth: "280px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  brandName: {
    fontSize: "32px",
    fontWeight: 800,
    background: "linear-gradient(135deg, #2563eb, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.02em",
  },
  heroTitle: {
    fontSize: "48px",
    fontWeight: 800,
    lineHeight: 1.2,
    background: "linear-gradient(135deg, #2563eb, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "20px",
  },
  heroSubtitle: {
    fontSize: "18px",
    color: "#475569",
    lineHeight: 1.6,
    marginBottom: "32px",
  },
  heroImage: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
  },
  placeholderImage: {
    fontSize: "120px",
    background: "#eef2ff",
    borderRadius: "32px",
    padding: "40px",
    width: "100%",
    textAlign: "center",
  },
  buttonGroup: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },
  primaryBtn: {
    background: "#2563eb",
    color: "white",
    padding: "12px 24px",
    borderRadius: "40px",
    border: "none",
    fontWeight: 700,
  },
  secondaryBtn: {
    background: "white",
    color: "#2563eb",
    padding: "12px 24px",
    borderRadius: "40px",
    border: "1px solid #2563eb",
    fontWeight: 700,
  },
  secondaryBtnDark: {
    background: "transparent",
    color: "white",
    padding: "12px 24px",
    borderRadius: "40px",
    border: "1px solid white",
    fontWeight: 700,
  },
  taskFlow: {
    marginBottom: "80px",
  },
  flowGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    marginTop: "40px",
  },
  flowCard: {
    flex: 1,
    minWidth: "240px",
    background: "white",
    borderRadius: "24px",
    padding: "24px",
    textAlign: "center",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    position: "relative",
  },
  flowNumber: {
    position: "absolute",
    top: "-12px",
    left: "20px",
    background: "#2563eb",
    color: "white",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "16px",
  },
  flowIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  flowArrow: {
    fontSize: "32px",
    color: "#94a3b8",
    fontWeight: "bold",
  },
  statsBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "24px",
    background: "white",
    borderRadius: "24px",
    padding: "32px",
    textAlign: "center",
    marginBottom: "40px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
  },
  trustSection: {
    marginBottom: "40px",
    padding: "32px",
    background: "#f0f9ff",
    borderRadius: "24px",
    border: "1px solid #dbeafe",
  },
  trustGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginTop: "24px",
  },
  trustCard: {
    background: "white",
    padding: "16px",
    borderRadius: "16px",
    textAlign: "center",
    fontWeight: 600,
    color: "#0f172a",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  communityBar: {
    background: "#f1f5f9",
    borderRadius: "24px",
    padding: "20px 24px",
    marginBottom: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "16px",
  },
  communityText: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#1e293b",
    margin: 0,
  },
  communityLinks: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
  },
  communityLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "white",
    padding: "8px 16px",
    borderRadius: "40px",
    textDecoration: "none",
    color: "#0f172a",
    fontWeight: 600,
    fontSize: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  different: {
    marginBottom: "80px",
  },
  diffGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "24px",
    marginTop: "40px",
  },
  diffCard: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    textAlign: "center",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    transition: "transform 0.3s",
  },
  diffIcon: {
    fontSize: "36px",
    marginBottom: "16px",
  },
  section: {
    marginBottom: "80px",
  },
  sectionAlt: {
    marginBottom: "80px",
    background: "#f1f5f9",
    padding: "48px 32px",
    borderRadius: "32px",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "16px",
    textAlign: "center",
  },
  sectionDesc: {
    fontSize: "16px",
    color: "#64748b",
    textAlign: "center",
    marginBottom: "40px",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "32px",
    marginTop: "40px",
  },
  grid4: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "32px",
  },
  card: {
    background: "white",
    borderRadius: "24px",
    padding: "32px",
    textAlign: "center",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    transition: "transform 0.3s",
  },
  cardIcon: {
    fontSize: "40px",
    marginBottom: "16px",
  },
  pill: {
    background: "white",
    padding: "8px 20px",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#1e293b",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  outlineBtn: {
    background: "transparent",
    border: "1px solid #2563eb",
    color: "#2563eb",
    padding: "10px 24px",
    borderRadius: "40px",
    fontWeight: 600,
    cursor: "pointer",
  },
  cta: {
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    color: "white",
    borderRadius: "32px",
    padding: "64px 32px",
    textAlign: "center",
    marginBottom: "60px",
  },
};