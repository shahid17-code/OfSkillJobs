"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<any>(null);
  const [jobCount, setJobCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);

  useEffect(() => {
    async function getData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
        setRole(data?.role);
      }

      const { count: jobs } = await supabase.from("jobs").select("*", { count: "exact", head: true });
      const { count: companies } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "company");
      const { count: developers } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "developer");
      setJobCount(jobs || 0);
      setCompanyCount(companies || 0);
      setCandidateCount(developers || 0);
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

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.brand}>
            <img src="/favicon.ico" alt="OfSkillJob Logo" width="48" height="48" style={{ width: '48px', height: '48px' }} />
            <span style={styles.brandName}>OfSkillJob</span>
          </div>
          <h1 style={styles.heroTitle}>Show Skills. Get Hired.</h1>
          <p style={styles.heroSubtitle}>
            The platform where your real abilities speak louder than a resume.
            Complete challenges, build your portfolio, and connect with top companies – 
            for every industry, not just tech.
          </p>
          <div style={styles.buttonGroup}>
            <button onClick={handleGetHired} style={styles.primaryBtn}>Get Hired →</button>
            <button onClick={handleHireTalent} style={styles.secondaryBtn}>Hire Talent →</button>
          </div>
        </div>
        <div style={styles.heroImage}>
          <div style={styles.placeholderImage}>🎯</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div><strong>{jobCount}+</strong><br />Jobs Posted</div>
        <div><strong>{candidateCount}+</strong><br />Active Candidates</div>
        <div><strong>{companyCount}+</strong><br />Companies</div>
      </div>

      {/* How It Works */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>How It Works</h2>
        <div style={styles.grid3}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>📝</div>
            <h3>1. Build Profile</h3>
            <p>Add your skills, experience, projects, and a short intro video – all for free.</p>
          </div>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🏆</div>
            <h3>2. Complete Challenges</h3>
            <p>Choose from 25+ real‑world tasks (coding, design, business, marketing…).</p>
          </div>
          <div style={styles.card}>
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
          <div style={styles.pill}>💻 IT & Software</div>
          <div style={styles.pill}>📊 Data Science</div>
          <div style={styles.pill}>🎨 Graphic Design</div>
          <div style={styles.pill}>📈 Digital Marketing</div>
          <div style={styles.pill}>💼 Sales & BD</div>
          <div style={styles.pill}>✍️ Content Writing</div>
          <div style={styles.pill}>📞 Customer Support</div>
          <div style={styles.pill}>🔧 Project Management</div>
        </div>
        <Link href="/jobs">
          <button style={styles.outlineBtn}>Browse All Jobs →</button>
        </Link>
      </div>

      {/* Features */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Why Choose OfSkillJob?</h2>
        <div style={styles.grid2}>
          <div style={styles.featureCard}>
            <span>🏅</span>
            <h3>Leaderboard & Badges</h3>
            <p>Compete, earn points, and showcase your achievements.</p>
          </div>
          <div style={styles.featureCard}>
            <span>📊</span>
            <h3>Real‑Time Tracking</h3>
            <p>Know when your application is viewed, reviewed, or shortlisted.</p>
          </div>
          <div style={styles.featureCard}>
            <span>🎥</span>
            <h3>Video Introductions</h3>
            <p>Stand out with a personal video – 2x higher chance to get noticed.</p>
          </div>
          <div style={styles.featureCard}>
            <span>🔒</span>
            <h3>Secure & Free</h3>
            <p>Always free for job seekers. Companies pay only for premium features.</p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={styles.cta}>
        <h2>Ready to take the next step?</h2>
        <p>Join thousands of professionals who found their dream job through skills.</p>
        <div style={styles.buttonGroup}>
          <button onClick={handleGetHired} style={styles.primaryBtn}>Get Hired Now</button>
          <button onClick={handleHireTalent} style={styles.secondaryBtnDark}>Post a Job</button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 24px",
    fontFamily: "Inter, system-ui, sans-serif",
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
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  secondaryBtn: {
    background: "white",
    color: "#2563eb",
    padding: "12px 24px",
    borderRadius: "40px",
    border: "1px solid #2563eb",
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  secondaryBtnDark: {
    background: "transparent",
    color: "white",
    padding: "12px 24px",
    borderRadius: "40px",
    border: "1px solid white",
    fontWeight: 700,
    cursor: "pointer",
  },
  statsBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "24px",
    background: "white",
    borderRadius: "24px",
    padding: "32px",
    textAlign: "center",
    marginBottom: "80px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
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
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "32px",
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
  featureCard: {
    background: "white",
    borderRadius: "20px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
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