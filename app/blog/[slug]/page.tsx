// app/blog/[slug]/page.tsx
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Not Found' };
  return {
    title: `${post.title} | OfSkillJob Blog`,
    description: post.description,
    openGraph: {
      title: `${post.title} | OfSkillJob Blog`,
      description: post.description,
      url: `https://ofskilljobs.vercel.app/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: ['OfSkillJob'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | OfSkillJob Blog`,
      description: post.description,
    },
    alternates: {
      canonical: `https://ofskilljobs.vercel.app/blog/${slug}`,
    },
  };
}

// JSON-LD schema builders
function buildBlogSchema(post: ReturnType<typeof getPostBySlug>) {
  if (!post) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description,
    "author": { "@type": "Organization", "name": "OfSkillJob" },
    "publisher": {
      "@type": "Organization",
      "name": "OfSkillJob",
      "logo": { "@type": "ImageObject", "url": "https://ofskilljobs.vercel.app/favicon.png" }
    },
    "mainEntityOfPage": `https://ofskilljobs.vercel.app/blog/${post.slug}`,
    "datePublished": post.date,
    "dateModified": post.date,
  };
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const blogSchema = buildBlogSchema(post);

  return (
    <>
      {/* ── Structured data ── */}
      {blogSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        /* ── Root ── */
        .bp-root {
          font-family: 'DM Sans', sans-serif;
          background: #F7F6F2;
          min-height: 100vh;
          color: #1C1C1E;
        }

        /* ── Hero ── */
        .bp-hero {
          background: #0F1923;
          padding: 60px 24px 56px;
          position: relative;
          overflow: hidden;
        }
        .bp-hero::before {
          content: '';
          position: absolute;
          top: -80px; right: -60px;
          width: 360px; height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .bp-hero-inner {
          max-width: 760px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .bp-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(250,250,248,0.50);
          text-decoration: none;
          margin-bottom: 28px;
          transition: color 0.15s;
        }
        .bp-back:hover { color: #F59E0B; }
        .bp-cat {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.30);
          color: #F59E0B;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          padding: 5px 13px;
          border-radius: 100px;
          margin-bottom: 20px;
        }
        .bp-cat-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22C55E;
          display: inline-block;
        }
        .bp-hero h1 {
          font-family: 'Lora', Georgia, serif;
          font-size: clamp(26px, 4.5vw, 44px);
          font-weight: 700;
          color: #FAFAF8;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin: 0 0 18px;
        }
        .bp-desc {
          font-size: 16px;
          font-weight: 300;
          color: rgba(250,250,248,0.60);
          line-height: 1.65;
          margin: 0 0 22px;
          max-width: 580px;
        }
        .bp-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .bp-meta-item {
          font-size: 13px;
          font-weight: 400;
          color: rgba(250,250,248,0.45);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .bp-meta-sep {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: rgba(250,250,248,0.20);
        }

        /* ── Layout ── */
        .bp-layout {
          max-width: 760px;
          margin: 0 auto;
          padding: 48px 24px 80px;
        }

        /* ── Progress bar ── */
        .bp-progress {
          position: fixed;
          top: 0; left: 0;
          height: 3px;
          background: #F59E0B;
          z-index: 100;
          transition: width 0.1s linear;
          width: 0%;
        }

        /* ── Article prose ── */
        .bp-prose {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 20px;
          padding: 44px 48px;
          margin-bottom: 28px;
          line-height: 1.75;
        }
        @media (max-width: 600px) {
          .bp-prose { padding: 28px 22px; }
          .bp-hero { padding: 48px 20px 44px; }
        }

        /* ── Post body HTML styles ── */
        .post-body { font-size: 15.5px; color: #374151; }

        .post-intro {
          font-size: 17px;
          color: #1F2937;
          line-height: 1.80;
          padding-bottom: 28px;
          border-bottom: 1px solid #F0EDE7;
          margin-bottom: 32px;
        }
        .post-intro p { margin: 0; }

        .post-section {
          margin-bottom: 40px;
          scroll-margin-top: 24px;
        }
        .post-section:last-child { margin-bottom: 0; }

        .post-section h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          color: #0F1923;
          letter-spacing: -0.02em;
          margin: 0 0 14px;
          line-height: 1.25;
        }

        .post-section h3 {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #0F1923;
          margin: 22px 0 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .post-section h3::before {
          content: '';
          display: inline-block;
          width: 16px; height: 2px;
          background: #F59E0B;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .post-section p {
          font-size: 15.5px;
          color: #374151;
          line-height: 1.78;
          margin: 0 0 14px;
        }
        .post-section p:last-child { margin-bottom: 0; }
        .post-section p.post-small {
          font-size: 13.5px;
          color: #9CA3AF;
          font-style: italic;
        }

        .post-section ul,
        .post-section ol {
          margin: 0 0 14px;
          padding: 0;
          list-style: none;
        }
        .post-section li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 15px;
          color: #374151;
          line-height: 1.70;
          padding: 7px 0;
          border-bottom: 1px solid #F5F3EF;
        }
        .post-section li:last-child { border-bottom: none; }
        .post-section ul li::before {
          content: '';
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #F59E0B;
          flex-shrink: 0;
          margin-top: 8px;
        }
        .post-section ol { counter-reset: ol-counter; }
        .post-section ol li { counter-increment: ol-counter; }
        .post-section ol li::before {
          content: counter(ol-counter, decimal-leading-zero);
          font-size: 11px;
          font-weight: 700;
          color: #C0BAB0;
          flex-shrink: 0;
          margin-top: 3px;
          min-width: 20px;
          font-variant-numeric: tabular-nums;
        }
        .post-section li strong { color: #0F1923; font-weight: 600; }
        .post-section p strong { color: #0F1923; font-weight: 600; }

        /* ── Callouts ── */
        .post-callout {
          border-radius: 12px;
          padding: 18px 20px;
          margin: 18px 0;
        }
        .post-callout p { font-size: 14.5px !important; margin: 0 !important; line-height: 1.65 !important; }
        .post-callout-amber {
          background: rgba(245,158,11,0.07);
          border: 1px solid rgba(245,158,11,0.25);
          border-left: 3px solid #F59E0B;
        }
        .post-callout-amber p { color: #78350F !important; }
        .post-callout-navy {
          background: #0F1923;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .post-callout-navy p { color: rgba(250,250,248,0.85) !important; }
        .post-callout-green {
          background: rgba(34,197,94,0.06);
          border: 1px solid rgba(34,197,94,0.20);
          border-left: 3px solid #22C55E;
        }
        .post-callout-green p { color: #14532D !important; }

        /* ── Table ── */
        .post-table-wrap {
          overflow-x: auto;
          margin: 14px 0;
          border-radius: 12px;
          border: 1px solid #E8E6E0;
        }
        .post-table-wrap table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .post-table-wrap th {
          background: #0F1923;
          color: rgba(250,250,248,0.80);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          padding: 12px 16px;
          text-align: left;
          white-space: nowrap;
        }
        .post-table-wrap td {
          padding: 11px 16px;
          border-bottom: 1px solid #F0EDE7;
          color: #374151;
          font-size: 14px;
          line-height: 1.5;
        }
        .post-table-wrap tr:last-child td { border-bottom: none; }
        .post-table-wrap tr:nth-child(even) td { background: #FAFAF8; }

        /* ── Timeline ── */
        .post-timeline { display: grid; gap: 14px; margin: 14px 0; }
        .post-timeline-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          background: #F7F6F2;
          border: 1px solid #E8E6E0;
          border-radius: 12px;
          padding: 16px 18px;
        }
        .post-timeline-dot {
          background: #0F1923;
          color: #F59E0B;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 8px;
          flex-shrink: 0;
          letter-spacing: 0.05em;
          white-space: nowrap;
          align-self: flex-start;
          margin-top: 1px;
        }
        .post-timeline-item > div { font-size: 14.5px; color: #374151; line-height: 1.65; }
        .post-timeline-item strong { color: #0F1923; display: block; margin-bottom: 8px; font-size: 15px; }
        .post-timeline-item ul { margin: 0; padding: 0; list-style: none; }
        .post-timeline-item li {
          font-size: 14px;
          color: #6B7280;
          padding: 4px 0;
          border: none;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        .post-timeline-item li::before {
          content: '–';
          color: #C0BAB0;
          flex-shrink: 0;
        }

        /* ── FAQ ── */
        .post-faq { display: grid; gap: 14px; }
        .post-faq-item {
          background: #F7F6F2;
          border: 1px solid #E8E6E0;
          border-radius: 12px;
          padding: 18px 20px;
        }
        .post-faq-item h3 {
          font-family: 'Lora', Georgia, serif;
          font-size: 16px !important;
          font-weight: 600;
          color: #0F1923;
          margin: 0 0 8px !important;
          letter-spacing: -0.01em;
          text-transform: none !important;
          text-decoration: none;
        }
        .post-faq-item h3::before { display: none !important; }
        .post-faq-item p {
          font-size: 14.5px !important;
          color: #6B7280;
          margin: 0 !important;
          line-height: 1.65;
        }

        /* ── Links in post ── */
        .post-body a {
          color: #F59E0B;
          text-decoration: none;
          border-bottom: 1px solid rgba(245,158,11,0.35);
          font-weight: 500;
          transition: border-color 0.15s;
        }
        .post-body a:hover { border-color: #F59E0B; }

        /* ── Red flag list items ── */
        .post-section li:has(.flag) { }

        /* ── Section divider ── */
        .post-section + .post-section {
          border-top: 1px solid #F0EDE7;
          padding-top: 36px;
        }

        /* ── CTA card ── */
        .bp-cta {
          background: #0F1923;
          border-radius: 20px;
          padding: 44px 40px;
          text-align: center;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
        }
        .bp-cta::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 240px; height: 240px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .bp-cta h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 26px;
          font-weight: 700;
          color: #FAFAF8;
          letter-spacing: -0.02em;
          margin: 0 0 10px;
          position: relative;
          z-index: 1;
        }
        .bp-cta p {
          font-size: 15px;
          font-weight: 300;
          color: rgba(250,250,248,0.55);
          margin: 0 0 28px;
          line-height: 1.65;
          position: relative;
          z-index: 1;
        }
        .bp-cta-btns {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .bp-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #F59E0B;
          color: #0F1923;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          padding: 13px 26px;
          border-radius: 100px;
          text-decoration: none;
          transition: transform 0.15s, background 0.15s;
          border: none;
        }
        .bp-cta-primary:hover { transform: translateY(-1px); background: #FBB224; }
        .bp-cta-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: rgba(250,250,248,0.75);
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 600;
          padding: 13px 26px;
          border-radius: 100px;
          text-decoration: none;
          border: 1.5px solid rgba(255,255,255,0.18);
          transition: border-color 0.15s, color 0.15s;
        }
        .bp-cta-secondary:hover { border-color: rgba(255,255,255,0.45); color: #FAFAF8; }

        /* ── Footer ── */
        .bp-footer {
          border-top: 1px solid #E8E6E0;
          padding-top: 24px;
          text-align: center;
          font-size: 12px;
          color: #C0BAB0;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="bp-root">

        {/* ── Hero ── */}
        <div className="bp-hero">
          <div className="bp-hero-inner">
            <Link href="/blog" className="bp-back">← All articles</Link>
            <div className="bp-cat">
              <span className="bp-cat-dot" />
              {(post as any).category || 'Guide'}
            </div>
            <h1>{post.title}</h1>
            <p className="bp-desc">{post.description}</p>
            <div className="bp-meta">
              <span className="bp-meta-item">{post.date}</span>
              <div className="bp-meta-sep" />
              <span className="bp-meta-item">{post.readingTime}</span>
              <div className="bp-meta-sep" />
              <span className="bp-meta-item">By OfSkillJob</span>
            </div>
          </div>
        </div>

        {/* ── Article ── */}
        <div className="bp-layout">

          {/* Prose content */}
          <div className="bp-prose">
            <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />
          </div>

          {/* CTA */}
          <div className="bp-cta">
            <h2>Ready to find your remote job?</h2>
            <p>Browse skill-first remote listings updated daily — apply only after proving your ability.</p>
            <div className="bp-cta-btns">
              <Link href="/jobs" className="bp-cta-primary">Browse Remote Jobs →</Link>
              <Link href="/signup" className="bp-cta-secondary">Create Free Profile</Link>
            </div>
          </div>

          {/* Back link */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Link
              href="/blog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#6B7280',
                textDecoration: 'none',
                borderBottom: '1px solid #E8E6E0',
                paddingBottom: 2,
              }}
            >
              ← Back to all articles
            </Link>
          </div>

          <div className="bp-footer">
            © 2026 OfSkillJob — Show Skills. Get Hired. All rights reserved.
          </div>
        </div>
      </div>
    </>
  );
}