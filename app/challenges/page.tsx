"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  points_reward: number;
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadChallenges();
  }, []);

  async function loadChallenges() {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, description, difficulty, category, points_reward")
        .order("points_reward", { ascending: true });

      if (error) throw error;
      setChallenges(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }

  const categories = ["", ...new Set(challenges.map(c => c.category))];
  const difficulties = ["", "Beginner", "Intermediate", "Advanced"];

  const filtered = challenges.filter(ch => {
    const matchCategory = selectedCategory === "" || ch.category === selectedCategory;
    const matchDifficulty = selectedDifficulty === "" || ch.difficulty === selectedDifficulty;
    const matchSearch = searchTerm === "" || ch.title.toLowerCase().includes(searchTerm.toLowerCase()) || ch.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchDifficulty && matchSearch;
  });

  const difficultyColor = (diff: string) => {
    if (diff === "Beginner") return "#22c55e";
    if (diff === "Intermediate") return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📚 Skill Challenges</h1>
        <p style={styles.subtitle}>Choose a challenge, complete it, earn points & badges.</p>
      </div>

      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search challenges..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={styles.select}>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === "" ? "All Categories" : cat}</option>
          ))}
        </select>
        <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} style={styles.select}>
          {difficulties.map(diff => (
            <option key={diff} value={diff}>{diff === "" ? "All Difficulties" : diff}</option>
          ))}
        </select>
        {(selectedCategory || selectedDifficulty || searchTerm) && (
          <button onClick={() => { setSelectedCategory(""); setSelectedDifficulty(""); setSearchTerm(""); }} style={styles.clearBtn}>
            Clear
          </button>
        )}
      </div>

      {loading && <p>Loading challenges...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={styles.grid}>
        {filtered.map((ch) => (
          <div key={ch.id} style={styles.card}>
            <div>
              <span style={styles.category}>{ch.category}</span>
              <h2 style={styles.cardTitle}>{ch.title}</h2>
              <p style={styles.cardDesc}>{ch.description.substring(0, 100)}...</p>
            </div>
            <div style={styles.cardFooter}>
              <div style={styles.badgeGroup}>
                <span style={{ ...styles.difficulty, background: difficultyColor(ch.difficulty) + "20", color: difficultyColor(ch.difficulty) }}>
                  {ch.difficulty}
                </span>
                <span style={styles.points}>🏆 {ch.points_reward} pts</span>
              </div>
              <Link href={`/challenges/${ch.id}`} style={styles.link}>
                <button style={styles.viewBtn}>View Challenge →</button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && <p style={styles.noResults}>No challenges match your filters.</p>}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    margin: 0,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    minWidth: 200,
    padding: "10px 14px",
    borderRadius: 40,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    outline: "none",
  },
  select: {
    padding: "10px 14px",
    borderRadius: 40,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    background: "white",
    cursor: "pointer",
  },
  clearBtn: {
    padding: "8px 16px",
    borderRadius: 40,
    background: "#f1f5f9",
    border: "none",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 24,
  },
  card: {
    background: "white",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "transform 0.2s",
    border: "1px solid #eef2f7",
  },
  category: {
    fontSize: 12,
    fontWeight: 600,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "8px 0",
  },
  cardDesc: {
    color: "#475569",
    lineHeight: 1.6,
    marginBottom: 16,
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  badgeGroup: {
    display: "flex",
    gap: 8,
  },
  difficulty: {
    padding: "4px 10px",
    borderRadius: 40,
    fontSize: 12,
    fontWeight: 600,
  },
  points: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "4px 10px",
    borderRadius: 40,
    fontSize: 12,
    fontWeight: 600,
  },
  viewBtn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: 40,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  link: {
    textDecoration: "none",
  },
  noResults: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748b",
  },
};