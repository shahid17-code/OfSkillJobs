// lib/tiers.ts

export type TierLevel = 
  | "Emerging Talent"
  | "Recognized Contributor"
  | "Trusted Professional"
  | "Recruiter Verified"
  | "Community Recognized";

export function getTierFromPoints(points: number): TierLevel {
  if (points < 100) return "Emerging Talent";
  if (points < 300) return "Recognized Contributor";
  if (points < 600) return "Trusted Professional";
  if (points < 1000) return "Recruiter Verified";
  return "Community Recognized";
}

export function getTierColor(tier: TierLevel): string {
  switch (tier) {
    case "Emerging Talent": return "#10b981"; // green
    case "Recognized Contributor": return "#3b82f6"; // blue
    case "Trusted Professional": return "#f59e0b"; // amber
    case "Recruiter Verified": return "#8b5cf6"; // purple
    case "Community Recognized": return "#ec4899"; // pink
    default: return "#64748b";
  }
}