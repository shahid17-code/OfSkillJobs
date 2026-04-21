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
  // Static routes
  const staticRoutes = [
    "",
    "/jobs",
    "/challenges",
    "/leaderboard",
    "/login",
    "/signup",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
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
    priority: 0.7,
  }));

  // Candidate profile routes
  const { data: developers } = await supabase
    .from("users")
    .select("id, updated_at, created_at")
    .eq("role", "developer");

  const candidateRoutes = (developers || []).map((dev) => ({
    url: `${baseUrl}/candidate/${dev.id}`,
    lastModified: getLastModified(dev.updated_at || dev.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Company profile routes
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

  // Challenge routes
  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, updated_at, created_at");

  const challengeRoutes = (challenges || []).map((challenge) => ({
    url: `${baseUrl}/challenges/${challenge.id}`,
    lastModified: getLastModified(
      challenge.updated_at || challenge.created_at
    ),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...jobRoutes,
    ...candidateRoutes,
    ...companyRoutes,
    ...challengeRoutes,
  ];
}