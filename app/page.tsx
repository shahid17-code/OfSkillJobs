import { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'OfSkillJob',
  description: 'Skill-based hiring platform for developers and professionals. Build your profile, solve challenges, apply to jobs, and get hired by top companies.',
  keywords: ['tech jobs', 'developer hiring', 'skill assessment', 'remote jobs', 'programming challenges', 'freelance', 'career platform'],
  openGraph: {
    title: 'OfSkillJob – Show Skills. Get Hired.',
    description: 'Join the platform where your skills speak louder than your resume. Complete challenges, build your portfolio, and connect with top companies.',
    url: 'https://ofskilljobs.vercel.app',
    siteName: 'OfSkillJob',
    images: [
      {
        url: 'https://ofskilljobs.vercel.app/og-image.png',   // ✅ updated to og-image.png
        width: 1200,
        height: 630,
        alt: 'OfSkillJob - Skill-based hiring platform',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OfSkillJob – Show Skills. Get Hired.',
    description: 'Skill-based hiring for developers. Earn points, showcase projects, get hired.',
    images: ['https://ofskilljobs.vercel.app/og-image.png'], // ✅ updated to og-image.png
  },
  alternates: {
    canonical: 'https://ofskilljobs.vercel.app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function Page() {
  const orgData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OfSkillJob",
    url: "https://ofskilljobs.vercel.app",
    logo: "https://ofskilljobs.vercel.app/favicon.png",
    sameAs: [
      // Add your social media profiles when available
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "ofskilljobs@gmail.com",
      contactType: "customer service",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgData) }}
      />
      <HomeClient />
    </>
  );
}