import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import JobDetailClient from "./JobDetailClient";

// Generate static paths for all active jobs
export async function generateStaticParams() {
  const { data: jobs } = await supabase
    .from("jobs")
    .select("slug")
    .eq("status", "active");
  return jobs?.map((job) => ({ slug: job.slug })) || [];
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: job } = await supabase
    .from("jobs")
    .select("title, description")
    .ilike("slug", slug)
    .maybeSingle();

  if (!job) return { title: "Job not found" };

  return {
    title: `${job.title} | OfSkillJob`,
    description: job.description.slice(0, 160),
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;          // ✅ await the params Promise

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .ilike("slug", slug)
    .maybeSingle();

  if (!job || job.status !== "active") notFound();

  const { data: company } = await supabase
    .from("users")
    .select("company_name, username, industry, location, phone, email, logo_url, cover_url, about, website")
    .eq("id", job.company_id)
    .maybeSingle();

  // Get current user session (to pass to client)
  const { data: { user } } = await supabase.auth.getUser();

  // Build structured data (JobPosting)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.created_at?.split("T")[0],
    validThrough: job.expires_at?.split("T")[0],
    employmentType: job.role_type?.toUpperCase(),
    hiringOrganization: {
      "@type": "Organization",
      name: company?.company_name,
      sameAs: company?.website,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
      },
    },
    identifier: {
      "@type": "PropertyValue",
      name: "OfSkillJob",
      value: job.id,
    },
    ...(job.salary_min && job.salary_max && {
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: "INR",
        value: {
          "@type": "QuantitativeValue",
          minValue: job.salary_min,
          maxValue: job.salary_max,
        },
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <JobDetailClient initialJob={job} initialCompany={company} initialUser={user} />
    </>
  );
}