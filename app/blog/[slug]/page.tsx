import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import blogData from "@/data/blog.json";
import BlogScripts from "@/components/BlogScripts";
import "./blog-post.css";

type Props = {
  params: Promise<{ slug: string }>;
};

type Post = {
  slug: string;
  title: string;
  date: string;
  description: string;
  readingTime: string;
  category: string;
  heroStats?: Array<{ num: string; label: string }>;
  htmlContent: string;
};

function getPost(slug: string): Post | undefined {
  return (blogData.posts as Post[]).find((p) => p.slug === slug);
}

export async function generateStaticParams() {
  return blogData.posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found — OfSkillJob Blog" };
  return {
    title: `${post.title} | OfSkillJob Blog`,
    description: post.description,
    alternates: { canonical: `https://ofskilljobs.vercel.app/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

const categoryColors: Record<string, { bg: string; color: string; glow: string }> = {
  "Career Guide":    { bg: "#DCFCE7", color: "#166534", glow: "rgba(34,197,94,0.15)" },
  "Hiring Insights": { bg: "#FEF3C7", color: "#92400E", glow: "rgba(245,158,11,0.15)" },
  "Skill Tips":      { bg: "#DBEAFE", color: "#1D4ED8", glow: "rgba(59,130,246,0.15)" },
  default:           { bg: "#F3F4F6", color: "#374151", glow: "rgba(107,114,128,0.10)" },
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const cat = categoryColors[post.category] ?? categoryColors.default;
  const stats = post.heroStats;
  const relatedPosts = (blogData.posts as Post[])
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2);

  return (
    <div className="blog-page">
      <BlogScripts />

      {/* ── HERO ── */}
      <header className="blog-hero">
        <div className="blog-hero-blob blog-hero-blob-1" aria-hidden="true" />
        <div className="blog-hero-blob blog-hero-blob-2" aria-hidden="true" />
        <div className="blog-hero-blob blog-hero-blob-3" aria-hidden="true" />

        <div className="blog-hero-inner">
          {/* Breadcrumb */}
          <nav className="blog-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="blog-hero-breadcrumb-sep" aria-hidden="true">›</span>
            <Link href="/blog">Blog</Link>
            <span className="blog-hero-breadcrumb-sep" aria-hidden="true">›</span>
            <span className="blog-hero-breadcrumb-cur">{post.category}</span>
          </nav>

          {/* Meta row */}
          <div className="blog-hero-meta">
            <span
              className="blog-hero-tag"
              style={{
                background: cat.glow,
                borderColor: cat.color + "40",
                color: cat.color,
              }}
            >
              <span className="live-dot" aria-hidden="true" />
              {post.category}
            </span>
            <span className="blog-hero-sep" aria-hidden="true">·</span>
            <span className="blog-hero-date">
              <time dateTime={post.date}>{post.date}</time>
            </span>
            <span className="blog-hero-sep" aria-hidden="true">·</span>
            <span className="blog-hero-read-time" id="live-read-time">
              {post.readingTime}
            </span>
          </div>

          {/* Title */}
          <h1
            dangerouslySetInnerHTML={{
              __html: post.title
                .replace(/\u201C/g, "<em>\u201C</em>")
                .replace(/\u201D/g, "<em>\u201D</em>"),
            }}
          />

          {/* Deck */}
          <p className="blog-hero-deck">{post.description}</p>

          {/* Stats */}
          {stats && stats.length > 0 && (
            <div className="blog-hero-stats" aria-label="Key statistics">
              {stats.map((s) => (
                <div className="blog-hero-stat" key={s.num}>
                  <span className="blog-hero-stat-num">{s.num}</span>
                  <span className="blog-hero-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Share row */}
          <div className="blog-hero-share">
            <span className="blog-hero-share-label">Share</span>
            <button
              className="blog-share-btn"
              data-share="twitter"
              aria-label="Share on Twitter / X"
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
              Twitter
            </button>
            <button
              className="blog-share-btn"
              data-share="linkedin"
              aria-label="Share on LinkedIn"
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </button>
            <button
              className="blog-share-btn"
              data-share="copy"
              aria-label="Copy article link"
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              Copy link
            </button>
          </div>
        </div>
      </header>

      {/* ── PAGE BODY ── */}
      <div className="blog-page-wrap">

        {/* ── ARTICLE ── */}
        <article className="blog-article" id="blogArticle">
          {/* Post HTML from blog.json */}
          <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />

          {/* Inline CTA */}
          <div className="cta-banner">
            <h3>OfSkillJob works exactly this way</h3>
            <p>
              Every application starts with a real task. Companies see proof of skill before they see a
              résumé — no résumé black holes, no keyword filtering.
            </p>
            {/* ✅ FIX: button styles added inline to guarantee visibility */}
            <Link
              href="/signup"
              className="cta-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#F59E0B",
                color: "#0F1923",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.85rem 1.8rem",
                borderRadius: "100px",
                textDecoration: "none",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
                position: "relative",
                zIndex: 10,
              }}
            >
              Show your skill — sign up free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="cta-sub">100% free for job seekers · No hidden fees · Remote team from India</p>
          </div>

          {/* Related posts */}
          {relatedPosts.length > 0 && (
            <div className="related-posts-section">
              <div className="related-posts-header">
                <h2 className="related-posts-title">More from the blog</h2>
                <div className="related-posts-line" aria-hidden="true" />
              </div>
              <div className="related-posts-grid">
                {relatedPosts.map((rp) => (
                  <Link key={rp.slug} href={`/blog/${rp.slug}`} className="related-post-card">
                    <span className="related-post-cat">{rp.category}</span>
                    <h3 className="related-post-title">{rp.title}</h3>
                    <div className="related-post-meta">
                      <span>{rp.date}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rp.readingTime}</span>
                      <span className="related-post-arrow" aria-hidden="true">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* ── SIDEBAR ── */}
        <aside className="blog-sidebar" aria-label="Article sidebar">

          {/* TOC — dynamically populated by BlogScripts */}
          <div className="blog-sidebar-card">
            <span className="blog-sidebar-label">In this article</span>
            <div id="dynamic-toc">
              <a href="#" className="toc-link" style={{ color: "#C0BAB0", fontSize: "12px", fontStyle: "italic" }}>
                <div className="toc-dot" aria-hidden="true" />
                Loading contents…
              </a>
            </div>
          </div>

          {/* Key data points */}
          {stats && stats.length > 0 && (
            <div className="blog-sidebar-card">
              <span className="blog-sidebar-label">Key data points</span>
              {stats.map((s) => (
                <div className="blog-sidebar-stat" key={s.num}>
                  <span className="blog-sidebar-stat-num">{s.num}</span>
                  <span className="blog-sidebar-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA card */}
          <div className="blog-sidebar-cta">
            <span className="blog-sidebar-cta-label">Try skill-first hiring</span>
            <p>
              OfSkillJob lets candidates prove ability with a real task before applying. Companies
              only see proven skill.
            </p>
            <Link href="/signup" className="blog-sidebar-cta-btn">
              Sign up free →
            </Link>
          </div>

          {/* Quick links */}
          <div className="blog-sidebar-card">
            <span className="blog-sidebar-label">OfSkillJob</span>
            <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: "1.62", marginBottom: "16px" }}>
              We replace résumé filtering with real skill tasks — so every hire is based on what a
              candidate can actually do, right now.
            </p>
            {[
              { href: "/jobs",    label: "Browse open jobs" },
              { href: "/about",   label: "About us" },
              { href: "/blog",    label: "More articles" },
              { href: "/contact", label: "Contact Shahid" },
              { href: "/privacy", label: "Privacy policy" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="sidebar-quick-link">
                {l.label}
                <span className="sidebar-quick-arrow" aria-hidden="true">›</span>
              </Link>
            ))}
          </div>

        </aside>
      </div>
    </div>
  );
}