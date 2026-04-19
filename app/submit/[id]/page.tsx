"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { awardPoints } from "@/lib/points";

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  points_reward: number;
  submission_guide: string;
};

export default function SubmitPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [description, setDescription] = useState("");
  const [fileLink, setFileLink] = useState("");

  useEffect(() => {
    if (!id) return;
    loadChallenge();
    checkAuthAndSubmission();
  }, [id]);

  async function checkAuthAndSubmission() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);

    // Check if already submitted
    const { data: existing } = await supabase
      .from("submissions")
      .select("id")
      .eq("challenge_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      setAlreadySubmitted(true);
      setMsg({ type: "error", text: "You have already submitted this challenge. You cannot submit again." });
    }
  }

  async function loadChallenge() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, description, difficulty, category, points_reward, submission_guide")
        .eq("id", id)
        .single();
      if (error) throw error;
      setChallenge(data);
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Challenge not found" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !challenge || alreadySubmitted) return;

    // Validation based on category
    const isCoding = ["Web Development", "Frontend", "API Integration", "Data Science"].includes(challenge.category);
    const isDesign = ["Graphic Design", "UI/UX", "Design"].includes(challenge.category);
    const isDocument = ["Business", "Entrepreneurship", "Marketing", "Content Marketing", "Social Media", "Soft Skills", "Productivity", "Career", "Networking", "Writing", "Leadership"].includes(challenge.category);
    const isVideo = ["Soft Skills", "Leadership", "Public Speaking"].includes(challenge.category) || challenge.category === "Marketing";

    if (isCoding && !repoUrl) {
      setMsg({ type: "error", text: "GitHub repo URL is required for coding challenges." });
      return;
    }
    if (isDesign && !fileLink && !liveUrl) {
      setMsg({ type: "error", text: "Please provide a link to your design (Figma, image, PDF, etc.)." });
      return;
    }
    if (!isCoding && !isDesign && !isVideo && !fileLink && !liveUrl && !repoUrl) {
      setMsg({ type: "error", text: "Please provide a link to your work (Google Docs, Drive, YouTube, etc.)." });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        challenge_id: challenge.id,
        user_id: user.id,
        title: title || challenge.title,
        description,
        repo_url: repoUrl || null,
        file_url: liveUrl || fileLink || null,
        is_public: true,
        upvotes_count: 0,
      };

      const { error: insertError } = await supabase.from("submissions").insert([payload]);
      if (insertError) throw insertError;

      // Award points
      await awardPoints(user.id, `challenge_${challenge.id}`, challenge.points_reward);

      // Record in user_challenges (optional, for tracking)
      await supabase.from("user_challenges").insert({
        user_id: user.id,
        challenge_id: challenge.id,
        points_awarded: challenge.points_reward,
      });

      setMsg({ type: "success", text: `🎉 Submission saved! You earned ${challenge.points_reward} points. Redirecting...` });
      setTimeout(() => router.push("/profile"), 1500);
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to submit" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={styles.center}>Loading...</div>;
  if (!challenge) return <div style={styles.center}>Challenge not found.</div>;
  if (alreadySubmitted) {
    return (
      <div style={styles.container}>
        <div style={styles.formCard}>
          <div style={{ ...styles.alert, background: "#fee2e2", color: "#b91c1c" }}>
            You have already submitted this challenge. You cannot submit again.
          </div>
          <button onClick={() => router.push(`/challenges/${id}`)} style={styles.backBtn}>Back to Challenge</button>
        </div>
      </div>
    );
  }

  const isCoding = ["Web Development", "Frontend", "API Integration", "Data Science"].includes(challenge.category);
  const isDesign = ["Graphic Design", "UI/UX", "Design"].includes(challenge.category);
  const isDocument = ["Business", "Entrepreneurship", "Marketing", "Content Marketing", "Social Media", "Soft Skills", "Productivity", "Career", "Networking", "Writing", "Leadership"].includes(challenge.category);
  const isVideo = ["Soft Skills", "Leadership", "Public Speaking"].includes(challenge.category) || challenge.category === "Marketing";

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Submit Your Solution</h1>
        <p style={styles.subtitle}>Challenge: <strong>{challenge.title}</strong> • {challenge.points_reward} points</p>
      </div>

      <div style={styles.grid}>
        <div style={styles.formCard}>
          {msg && (
            <div style={{ ...styles.alert, background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#b91c1c" : "#166534" }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label>Project Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., ${challenge.title} Solution`}
                style={styles.input}
              />
            </div>

            {isCoding && (
              <>
                <div style={styles.field}>
                  <label>GitHub Repository URL *</label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label>Live Demo URL (optional)</label>
                  <input
                    type="url"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://your-demo.vercel.app"
                    style={styles.input}
                  />
                </div>
              </>
            )}

            {isDesign && (
              <div style={styles.field}>
                <label>Design Link (Figma, Canva, PDF, Image) *</label>
                <input
                  type="url"
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://figma.com/file/..."
                  required
                  style={styles.input}
                />
              </div>
            )}

            {isDocument && (
              <div style={styles.field}>
                <label>Document Link (Google Docs, PDF, Slides) *</label>
                <input
                  type="url"
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  required
                  style={styles.input}
                />
              </div>
            )}

            {isVideo && (
              <div style={styles.field}>
                <label>Video Link (YouTube, Google Drive, Loom) *</label>
                <input
                  type="url"
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  required
                  style={styles.input}
                />
              </div>
            )}

            {!isCoding && !isDesign && !isDocument && !isVideo && (
              <>
                <div style={styles.field}>
                  <label>Repository / Work Link</label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="GitHub, GitLab, etc."
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label>Additional Link (optional)</label>
                  <input
                    type="url"
                    value={fileLink}
                    onChange={(e) => setFileLink(e.target.value)}
                    placeholder="Demo, design, document, etc."
                    style={styles.input}
                  />
                </div>
              </>
            )}

            <div style={styles.field}>
              <label>Description (what you built, how it works, special notes)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe your solution, challenges faced, and technologies used..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.field}>
              <label>Submission Guide (from challenge)</label>
              <div style={styles.guideBox}>{challenge.submission_guide}</div>
            </div>

            <button type="submit" disabled={submitting} style={styles.submitBtn}>
              {submitting ? "Submitting..." : "Submit & Earn Points"}
            </button>
          </form>
        </div>

        <aside style={styles.sidebar}>
          <div style={styles.infoCard}>
            <h3>💡 Tips</h3>
            <ul>
              <li>Follow the submission guide carefully.</li>
              <li>Make sure your link is accessible (public or anyone with link).</li>
              <li>Write a clear description – it helps recruiters understand your work.</li>
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    margin: 0,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 280px",
    gap: 28,
  },
  formCard: {
    background: "white",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    border: "1px solid #eef2f7",
  },
  alert: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  input: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  textarea: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical" as const,
  },
  guideBox: {
    background: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    color: "#475569",
    border: "1px solid #eef2f7",
  },
  submitBtn: {
    background: "#16a34a",
    color: "white",
    padding: "12px 20px",
    borderRadius: 40,
    border: "none",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 8,
  },
  backBtn: {
    background: "#2563eb",
    color: "white",
    padding: "10px 16px",
    borderRadius: 40,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 16,
  },
  sidebar: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },
  infoCard: {
    background: "#f8fafc",
    borderRadius: 20,
    padding: 20,
    border: "1px solid #eef2f7",
  },
};