// app/jobs/[slug]/page.tsx (server component)
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import JobDetailClient from "./JobDetailClient";

// Define types inline (same as in client component)
type Job = {
  id: string;
  company_id: string;
  title: string;
  slug: string;
  role_type: string | null;
  location: string | null;
  is_remote: boolean | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  task_required: boolean | null;
  task_title: string | null;
  task_instructions: string | null;
  task_type: string | null;
  expires_at: string | null;
  status: string | null;
  created_at: string | null;
  external_apply_url: string | null;
};

type Company = {
  company_name?: string | null;
  username?: string | null;
  industry?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  about?: string | null;
  website?: string | null;
};

export async function generateStaticParams() {
  const { data: jobs } = await supabase
    .from("jobs")
    .select("slug")
    .eq("status", "active");
  return jobs?.map((job) => ({ slug: job.slug })) || [];
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data: job } = await supabase
    .from("jobs")
    .select("title, description")
    .ilike("slug", params.slug)
    .maybeSingle();

  if (!job) return { title: "Job not found" };

  return {
    title: `${job.title} | OfSkillJob`,
    description: job.description.slice(0, 160),
  };
}

export default async function JobDetailPage({ params }: { params: { slug: string } }) {
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .ilike("slug", params.slug)
    .maybeSingle();

  if (!job || job.status !== "active") notFound();

  const { data: company } = await supabase
    .from("users")
    .select("company_name, username, industry, location, phone, email, logo_url, cover_url, about, website")
    .eq("id", job.company_id)
    .maybeSingle();

  const { data: { user } } = await supabase.auth.getUser();

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