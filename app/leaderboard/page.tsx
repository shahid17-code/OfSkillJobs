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

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  min_points: number;
};

export default function Leaderboard() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myPoints, setMyPoints] = useState<number | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadgeIds, setUserBadgeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLeaderboard();
    loadBadges();
  }, []);

  async function loadLeaderboard() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .eq("role", "developer");

    const { data: submissions } = await supabase
      .from("submissions")
      .select("user_id");

    const projectsCountMap = new Map();
    submissions?.forEach((sub: any) => {
      projectsCountMap.set(sub.user_id, (projectsCountMap.get(sub.user_id) || 0) + 1);
    });

    const ranked = usersData?.map((u: any) => {
      const projectsCount = projectsCountMap.get(u.id) || 0;
      const skillsCount = u.skills?.length || 0;

      let completion = 0;
      if (u.full_name) completion += 20;
      if (u.bio) completion += 20;
      if (u.skills?.length) completion += 20;
      if (u.github || u.linkedin || u.website) completion += 20;
      if (u.profession) completion += 20;
      completion = Math.min(100, completion);

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

    ranked?.sort((a, b) => b.total_points - a.total_points);

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

  async function loadBadges() {
    const { data: badgesData } = await supabase
      .from("badges")
      .select("*")
      .order("min_points", { ascending: true });

    if (badgesData) setBadges(badgesData);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", user.id);
      if (userBadges) {
        const earnedSet = new Set(userBadges.map(ub => ub.badge_id));
        setUserBadgeIds(earnedSet);
      }
    }
  }

  if (loading) {
    return <div style={styles.center}>Loading leaderboard...</div>;
  }

  const top3 = users.slice(0, 3);
  const others = users.slice(3);
  const topPercent = myRank && users.length ? Math.ceil((myRank / users.length) * 100) : null;

  return (
    <div style={styles.container}>
      <style jsx>{`
        /* Mobile: top 3 arrangement - 1st full width, 2nd+3rd side by side */
        @media (max-width: 640px) {
          .top-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
          .top-grid .top-card:first-child {
            width: 100% !important;
          }
          .top-grid .top-card:nth-child(2),
          .top-grid .top-card:nth-child(3) {
            width: calc(50% - 10px) !important;
            display: inline-block !important;
          }
          .top-grid {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            justify-content: space-between !important;
          }
          .top-grid .top-card:first-child {
            width: 100% !important;
            margin-bottom: 10px;
          }
        }
        /* Ensure table scrolls horizontally on mobile */
        @media (max-width: 640px) {
          .table-wrapper {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .leaderboard-table {
            min-width: 500px;
          }
        }
      `}</style>

      <h1 style={styles.title}>🏆 OfSkillJob Leaderboard</h1>

      {/* Info Section */}
      <div style={{ ...styles.rankCard, background: "#f0f9ff", borderLeft: "4px solid #2563eb" }}>
        <h3 style={{ marginBottom: 8 }}>📊 About the Leaderboard</h3>
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          Compete with fellow developers and earn points by being active on OfSkillJob.
        </p>
        <h4 style={{ fontWeight: 600, marginBottom: 6 }}>✨ How to earn points:</h4>
        <ul style={{ fontSize: 13, lineHeight: 1.6, paddingLeft: 20 }}>
          <li>📝 Sign up – <strong>20 pts</strong></li>
          <li>✅ Complete profile – <strong>up to 50 pts</strong></li>
          <li>📬 Apply to a job – <strong>10 pts each</strong></li>
          <li>🏆 Submit a challenge – <strong>varies by difficulty</strong></li>
          <li>🔥 Daily login streak – <strong>5 pts + bonus</strong></li>
        </ul>
      </div>

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

      {/* Top 3 – original styling, mobile arrangement via CSS above */}
      <div className="top-grid" style={styles.topGrid}>
        {top3.map((user, idx) => {
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={user.id} style={styles.topCard} className="top-card">
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
              {/* View Profile button removed */}
            </div>
          );
        })}
      </div>

      {/* LEADERBOARD TABLE (now above badges) */}
      <div style={styles.tableCard}>
        <div className="table-wrapper">
          <table style={styles.table} className="leaderboard-table">
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

      {/* BADGES SECTION (now below table) */}
      <div style={{ ...styles.tableCard, marginTop: 40, padding: "20px" }}>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>🎖️ Badges & Achievements</h3>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
          Earn badges by reaching point milestones. Unlock them all!
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {badges.map((badge) => {
            const earned = userBadgeIds.has(badge.id);
            return (
              <div
                key={badge.id}
                style={{
                  background: earned ? "#f0fdf4" : "#f8fafc",
                  border: `1px solid ${earned ? "#bbf7d0" : "#e2e8f0"}`,
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 28 }}>{badge.icon || "🏅"}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{badge.name}</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{badge.description}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    {earned ? (
                      <span style={{ color: "#16a34a" }}>✓ Earned</span>
                    ) : (
                      <span>Requires {badge.min_points} points</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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