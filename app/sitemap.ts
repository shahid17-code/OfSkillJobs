import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://ofskilljobs.vercel.app";

function getLastModified(dateStr: string | null | undefined): Date {
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes (including all public informational pages)
  const staticRoutes = [
    "",
    "/jobs",
    "/challenges",
    "/leaderboard",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/login",
    "/signup",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" as const : "weekly" as const,
    priority: route === "" ? 1.0 : 0.7,
  }));

  // Dynamic job routes
  const { data: jobs } = await supabase
    .from("jobs")
    .select("slug, updated_at, created_at")
    .eq("status", "active");

  const jobRoutes = (jobs || []).map((job) => ({
    url: `${baseUrl}/jobs/${job.slug}`,
    lastModified: getLastModified(job.updated_at || job.created_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  //  Public developer profiles ( /u/[username] )
  const { data: developers } = await supabase
    .from("users")
    .select("username, updated_at, created_at")
    .eq("role", "developer")
    .not("username", "is", null);       // only those with a username set

  const developerRoutes = (developers || []).map((dev) => ({
    url: `${baseUrl}/u/${dev.username}`,
    lastModified: getLastModified(dev.updated_at || dev.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Public company profiles ( /company/[username] )
  const { data: companies } = await supabase
    .from("users")
    .select("username, updated_at, created_at")
    .eq("role", "company")
    .not("username", "is", null);

  const companyRoutes = (companies || []).map((comp) => ({
    url: `${baseUrl}/company/${comp.username}`,
    lastModified: getLastModified(comp.updated_at || comp.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  // Challenge pages
  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, updated_at, created_at");

  const challengeRoutes = (challenges || []).map((challenge) => ({
    url: `${baseUrl}/challenges/${challenge.id}`,
    lastModified: getLastModified(challenge.updated_at || challenge.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...jobRoutes,
    ...developerRoutes,
    ...companyRoutes,
    ...challengeRoutes,
  ];
}