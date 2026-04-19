// lib/points.ts
import { supabase } from "./supabase";

export const POINTS = {
  SIGNUP: 20,
  PROFILE_COMPLETION_50: 30,
  PROFILE_COMPLETION_80: 40,
  PROFILE_COMPLETION_100: 50,
  JOB_APPLY: 10,
  PROJECT_SUBMIT: 25,
  DAILY_LOGIN: 5,
  STREAK_BONUS: 10, // extra for 3+ day streak
};

export async function awardPoints(userId: string, action: string, points: number) {
  // Update total_points in users table
  const { data: user } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", userId)
    .single();

  const newTotal = (user?.total_points || 0) + points;

  await supabase
    .from("users")
    .update({ total_points: newTotal })
    .eq("id", userId);

  // Record transaction (optional)
  await supabase
    .from("point_transactions")
    .insert({ user_id: userId, action, points });
}

export async function checkAndAwardBadges(userId: string, currentPoints: number) {
  // Fetch all badges that the user has not yet earned
  const { data: allBadges } = await supabase
    .from("badges")
    .select("*")
    .order("min_points", { ascending: true });

  const { data: earnedBadgeIds } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);

  const earnedSet = new Set(earnedBadgeIds?.map(b => b.badge_id));

  const newBadges = allBadges?.filter(b => !earnedSet.has(b.id) && b.min_points <= currentPoints);

  if (newBadges?.length) {
    for (const badge of newBadges) {
      await supabase
        .from("user_badges")
        .insert({ user_id: userId, badge_id: badge.id });
    }
    return newBadges; // return newly earned badges for toast notification
  }
  return [];
}

export async function updateLoginStreak(userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select("last_login, login_streak")
    .eq("id", userId)
    .single();

  const today = new Date().toISOString().split("T")[0];
  const lastLogin = user?.last_login ? user.last_login.split("T")[0] : null;

  let newStreak = user?.login_streak || 0;
  let pointsEarned = POINTS.DAILY_LOGIN;

  if (lastLogin === today) {
    // Already logged in today – no points
    return { points: 0, streak: newStreak };
  } else if (lastLogin === new Date(Date.now() - 86400000).toISOString().split("T")[0]) {
    // Consecutive day
    newStreak += 1;
    if (newStreak >= 3) {
      pointsEarned += POINTS.STREAK_BONUS;
    }
  } else {
    // Streak broken
    newStreak = 1;
  }

  await supabase
    .from("users")
    .update({ last_login: today, login_streak: newStreak })
    .eq("id", userId);

  await awardPoints(userId, "daily_login", pointsEarned);
  return { points: pointsEarned, streak: newStreak };
}