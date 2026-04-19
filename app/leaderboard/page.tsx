"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

type UserWithStats = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  login_streak: number;
  projects_count: number;
  skills_count: number;
  profile_completion: number;
};

export default function Leaderboard() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myPoints, setMyPoints] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // Fetch all developers (exclude companies)
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .eq("role", "developer"); // ← Only developers

    // Fetch projects count per user
    const { data: submissions } = await supabase
      .from("submissions")
      .select("user_id");

    const projectsCountMap = new Map();
    submissions?.forEach((sub: any) => {
      projectsCountMap.set(sub.user_id, (projectsCountMap.get(sub.user_id) || 0) + 1);
    });

    // Calculate stats for each user
    const ranked = usersData?.map((u: any) => {
      const projectsCount = projectsCountMap.get(u.id) || 0;
      const skillsCount = u.skills?.length || 0;

      // Profile completion score (0-100)
      let completion = 0;
      if (u.full_name) completion += 20;
      if (u.bio) completion += 20;
      if (u.skills?.length) completion += 20;
      if (u.github || u.linkedin || u.website) completion += 20;
      if (u.profession) completion += 20;
      completion = Math.min(100, completion);

      // Points are already stored in total_points – we just use them
      const points = u.total_points || 0;

      return {
        id: u.id,
        full_name: u.full_name,
        username: u.username,
        avatar_url: u.avatar_url,
        total_points: points,
        login_streak: u.login_streak || 0,
        projects_count: projectsCount,
        skills_count: skillsCount,
        profile_completion: completion,
      };
    });

    // Sort by total_points descending
    ranked?.sort((a, b) => b.total_points - a.total_points);

    // Find logged-in user rank (fixed TypeScript error)
    let rankPosition = null;
    let userPoints = null;
    if (user && ranked && ranked.length > 0) {
      const index = ranked.findIndex(u => u.id === user.id);
      if (index !== -1) {
        rankPosition = index + 1;
        userPoints = ranked[index].total_points;
      }
    }
    setMyRank(rankPosition);
    setMyPoints(userPoints);
    setUsers(ranked || []);
    setLoading(false);
  }

  if (loading) {
    return <div style={styles.center}>Loading leaderboard...</div>;
  }

  const top3 = users.slice(0, 3);
  const others = users.slice(3);
  const topPercent = myRank && users.length ? Math.ceil((myRank / users.length) * 100) : null;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🏆 OfSkillJob Leaderboard</h1>

      {/* User rank card */}
      {myRank && (
        <div style={styles.rankCard}>
          <h3>Your Ranking</h3>
          <p>
            Rank <strong>#{myRank}</strong> • Top <strong>{topPercent}%</strong> Developers
          </p>
          <p style={{ marginTop: 8 }}>
            Total Points: <strong>{myPoints}</strong>
          </p>
        </div>
      )}

      {/* Top 3 */}
      <div style={styles.topGrid}>
        {top3.map((user, idx) => {
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={user.id} style={styles.topCard}>
              <div style={styles.medal}>{medals[idx]}</div>
              <div style={styles.avatar}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" style={styles.avatarImg} />
                ) : (
                  user.full_name?.charAt(0) || "U"
                )}
              </div>
              <h3>{user.full_name || "Developer"}</h3>
              <p style={styles.username}>@{user.username}</p>
              <p>Points: <strong>{user.total_points}</strong></p>
              <Link href={`/u/${user.username}`}>
                <button style={styles.viewBtn}>View Profile</button>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Leaderboard table */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Rank</th>
              <th style={styles.th}>Developer</th>
              <th style={styles.th}>Projects</th>
              <th style={styles.th}>Skills</th>
              <th style={styles.th}>Points</th>
            </tr>
          </thead>
          <tbody>
            {others.map((user, idx) => (
              <tr key={user.id} style={styles.tableRow}>
                <td style={styles.td}>#{idx + 4}</td>
                <td style={styles.td}>
                  <Link href={`/u/${user.username}`} style={styles.link}>
                    @{user.username}
                  </Link>
                </td>
                <td style={styles.td}>{user.projects_count}</td>
                <td style={styles.td}>{user.skills_count}</td>
                <td style={{ ...styles.td, fontWeight: "bold" }}>{user.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1100px",
    margin: "40px auto",
    padding: "0 20px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  center: {
    textAlign: "center" as const,
    marginTop: "50px",
  },
  title: {
    fontSize: "32px",
    marginBottom: "25px",
  },
  rankCard: {
    background: "white",
    padding: "18px",
    borderRadius: "12px",
    marginBottom: "30px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
  },
  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "40px",
  },
  topCard: {
    background: "white",
    borderRadius: "14px",
    padding: "25px",
    textAlign: "center" as const,
    boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
  },
  medal: {
    fontSize: "30px",
  },
  avatar: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "bold",
    margin: "10px auto",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  username: {
    color: "#64748b",
  },
  viewBtn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
  tableCard: {
    background: "white",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  tableHeader: {
    background: "#f8fafc",
  },
  th: {
    padding: "14px",
    textAlign: "left" as const,
    fontSize: "14px",
    color: "#475569",
  },
  tableRow: {
    borderTop: "1px solid #eee",
  },
  td: {
    padding: "14px",
    fontSize: "14px",
  },
  link: {
    textDecoration: "none",
    color: "#2563eb",
  },
};