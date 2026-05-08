import { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "OfSkillJob",
  description:
    "Skill-based hiring platform for developers and professionals. Build your profile, solve real challenges, apply to jobs, and get hired by top companies.",
  keywords: [
    "tech jobs",
    "developer hiring",
    "skill assessment",
    "remote jobs",
    "programming challenges",
    "freelance",
    "career platform",
    "skill-based hiring",
    "OfSkillJob",
  ],
  openGraph: {
    title: "OfSkillJob – Show Skills. Get Hired.",
    description:
      "Join the platform where your skills speak louder than your resume. Complete challenges, build your portfolio, and connect with top companies.",
    url: "https://ofskilljobs.vercel.app",
    siteName: "OfSkillJob",
    images: [
      {
        url: "https://ofskilljobs.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "OfSkillJob – Skill-based hiring platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OfSkillJob – Show Skills. Get Hired.",
    description: "Skill-based hiring for developers. Earn points, showcase projects, get hired.",
    images: ["https://ofskilljobs.vercel.app/og-image.png"],
  },
  alternates: {
    canonical: "https://ofskilljobs.vercel.app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function Page() {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OfSkillJob",
    url: "https://ofskilljobs.vercel.app",
    logo: "https://ofskilljobs.vercel.app/favicon.png",
    description:
      "OfSkillJob is a skill-first hiring platform where candidates prove ability with real tasks before applying.",
    sameAs: [
      "https://t.me/OfSkillJob",
      "https://reddit.com/u/OfSkillJob",
      "https://www.linkedin.com/company/ofskilljob",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "ofskilljobs@gmail.com",
      contactType: "customer service",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OfSkillJob",
    url: "https://ofskilljobs.vercel.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://ofskilljobs.vercel.app/jobs?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <HomeClient />
    </>
  );
}