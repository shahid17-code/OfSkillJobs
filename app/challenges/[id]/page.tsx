"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  requirements: string | null;
  instructions: string | null;
  submission_guide: string | null;
  category: string;
  points_reward: number;
};

export default function ChallengeDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    loadChallenge();
    checkUserAndSubmission();
  }, [id]);

  async function checkUserAndSubmission() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);

    // Check if user already submitted this challenge
    const { data: existing } = await supabase
      .from("submissions")
      .select("id")
      .eq("challenge_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    setAlreadySubmitted(!!existing);
  }

  async function loadChallenge() {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, description, difficulty, requirements, instructions, submission_guide, category, points_reward")
        .eq("id", id)
        .single();

      if (error) throw error;
      setChallenge(data);
    } catch (err: any) {
      setError(err.message || "Challenge not found");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={styles.center}>Loading challenge...</div>;
  if (error) return <div style={styles.center}><p style={{ color: "red" }}>{error}</p></div>;
  if (!challenge) return <div style={styles.center}>Challenge not found.</div>;

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div>
          <span style={styles.category}>{challenge.category}</span>
          <h1 style={styles.title}>{challenge.title}</h1>
          <div style={styles.meta}>
            <span style={{ ...styles.difficulty, background: "#eef2ff", color: "#2563eb" }}>{challenge.difficulty}</span>
            <span style={styles.points}>🏆 {challenge.points_reward} points</span>
          </div>
        </div>
        {alreadySubmitted && <div style={styles.completedBadge}>✅ Already Submitted</div>}
      </div>

      <div style={styles.grid}>
        <div style={styles.mainContent}>
          <section style={styles.card}>
            <h3>📖 Description</h3>
            <p>{challenge.description}</p>
          </section>

          <section style={styles.card}>
            <h3>⚙️ Requirements</h3>
            <div dangerouslySetInnerHTML={{ __html: challenge.requirements || "No specific requirements." }} />
          </section>

          <section style={styles.card}>
            <h3>📝 Instructions</h3>
            <div dangerouslySetInnerHTML={{ __html: challenge.instructions || "Follow the steps described above." }} />
          </section>

          <section style={styles.card}>
            <h3>📤 Submission Guide</h3>
            <div dangerouslySetInnerHTML={{ __html: challenge.submission_guide || "Provide a link to your work (GitHub, Google Docs, etc.)" }} />
          </section>
        </div>

        <aside style={styles.sidebar}>
          <div style={styles.actionCard}>
            <h4>🎯 Submit your solution</h4>
            {alreadySubmitted ? (
              <button style={{ ...styles.submitBtn, background: "#22c55e" }} disabled>
                ✅ Already Submitted
              </button>
            ) : (
              <Link href={`/submit/${challenge.id}`} style={{ textDecoration: "none" }}>
                <button style={styles.submitBtn}>Submit & Earn Points</button>
              </Link>
            )}
          </div>

          <div style={styles.tipsCard}>
            <h4>💡 Tips for success</h4>
            <ul>
              <li>Read the instructions carefully.</li>
              <li>Use the submission guide to structure your work.</li>
              <li>Make sure your links are public.</li>
              <li>You can only submit once per challenge.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  center: {
    textAlign: "center" as const,
    padding: "60px 20px",
  },
  hero: {
    background: "linear-gradient(135deg, #1e293b, #0f172a)",
    color: "white",
    padding: "32px",
    borderRadius: "20px",
    marginBottom: "32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "16px",
  },
  category: {
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    background: "rgba(255,255,255,0.2)",
    padding: "4px 10px",
    borderRadius: "40px",
  },
  title: {
    fontSize: "32px",
    fontWeight: 800,
    margin: "12px 0 8px",
  },
  meta: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  difficulty: {
    padding: "4px 12px",
    borderRadius: "40px",
    fontSize: "13px",
    fontWeight: 600,
  },
  points: {
    background: "rgba(255,255,255,0.15)",
    padding: "4px 12px",
    borderRadius: "40px",
    fontSize: "13px",
  },
  completedBadge: {
    background: "#22c55e",
    padding: "8px 16px",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 320px",
    gap: "28px",
  },
  mainContent: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
    border: "1px solid #eef2f7",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },
  actionCard: {
    background: "linear-gradient(135deg, #2563eb, #1e40af)",
    color: "white",
    borderRadius: "16px",
    padding: "20px",
    textAlign: "center" as const,
  },
  submitBtn: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "40px",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    width: "100%",
    marginTop: "16px",
  },
  tipsCard: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #eef2f7",
  },
};