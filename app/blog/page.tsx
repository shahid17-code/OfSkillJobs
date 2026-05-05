// app/blog/page.tsx
import { getAllPosts } from '@/lib/blog';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog – OfSkillJob',
  description: 'Practical career guides, remote job tips, and skill‑building advice for job seekers in India.',
  openGraph: {
    title: 'Blog – OfSkillJob',
    description: 'Practical career guides, remote job tips, and skill‑building advice for job seekers in India.',
    url: 'https://ofskilljobs.vercel.app/blog',
    type: 'website',
  },
  alternates: {
    canonical: 'https://ofskilljobs.vercel.app/blog',
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .bl-root {
          font-family: 'DM Sans', sans-serif;
          background: #F7F6F2;
          min-height: 100vh;
          color: #1C1C1E;
        }

        /* ── Hero ── */
        .bl-hero {
          background: #0F1923;
          padding: 72px 24px 64px;
          position: relative;
          overflow: hidden;
        }
        .bl-hero::before {
          content: '';
          position: absolute;
          top: -80px; right: -60px;
          width: 380px; height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .bl-hero::after {
          content: '';
          position: absolute;
          bottom: -50px; left: 8%;
          width: 260px; height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,179,237,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .bl-hero-inner {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .bl-eyebrow {
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
          margin-bottom: 22px;
        }
        .bl-live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22C55E;
          display: inline-block;
        }
        .bl-hero h1 {
          font-family: 'Lora', Georgia, serif;
          font-size: clamp(34px, 5vw, 54px);
          font-weight: 700;
          color: #FAFAF8;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin: 0 0 16px;
        }
        .bl-hero h1 span { color: #F59E0B; }
        .bl-hero-sub {
          font-size: 16px;
          font-weight: 300;
          color: rgba(250,250,248,0.55);
          line-height: 1.65;
          margin: 0;
          max-width: 520px;
        }

        /* ── Body ── */
        .bl-body {
          max-width: 880px;
          margin: 0 auto;
          padding: 52px 24px 80px;
        }

        /* ── Count label ── */
        .bl-count {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #F59E0B;
          margin-bottom: 22px;
          display: block;
        }

        /* ── Grid ── */
        .bl-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
        }
        @media (max-width: 620px) {
          .bl-grid { grid-template-columns: 1fr; }
        }

        /* ── Article card ── */
        .bl-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 28px 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 0;
          text-decoration: none;
          color: inherit;
          transition: box-shadow 0.2s, transform 0.18s, border-color 0.18s;
          position: relative;
          overflow: hidden;
        }
        .bl-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: #F59E0B;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.22s ease;
        }
        .bl-card:hover {
          box-shadow: 0 12px 40px rgba(15,25,35,0.10);
          transform: translateY(-2px);
          border-color: #D8D4CC;
        }
        .bl-card:hover::before { transform: scaleX(1); }

        .bl-card-cat {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #F59E0B;
          margin-bottom: 10px;
        }

        .bl-card-title {
          font-family: 'Lora', Georgia, serif;
          font-size: 19px;
          font-weight: 600;
          color: #0F1923;
          line-height: 1.35;
          letter-spacing: -0.01em;
          margin: 0 0 12px;
          transition: color 0.15s;
        }
        .bl-card:hover .bl-card-title { color: #1a3a5c; }

        .bl-card-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .bl-card-date, .bl-card-time {
          font-size: 12px;
          color: #9CA3AF;
          font-weight: 500;
        }
        .bl-card-sep {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: #D1D5DB;
          flex-shrink: 0;
        }

        .bl-card-desc {
          font-size: 14px;
          font-weight: 400;
          color: #6B7280;
          line-height: 1.70;
          margin: 0 0 20px;
          flex: 1;
        }

        .bl-card-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #0F1923;
          border-bottom: 1.5px solid #F59E0B;
          padding-bottom: 1px;
          width: fit-content;
          transition: gap 0.15s;
        }
        .bl-card:hover .bl-card-cta { gap: 10px; }

        /* ── Empty state ── */
        .bl-empty {
          background: #FFFFFF;
          border: 1px dashed #E8E6E0;
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          grid-column: 1 / -1;
        }
        .bl-empty h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
          color: #0F1923;
          margin: 0 0 10px;
        }
        .bl-empty p {
          font-size: 15px;
          color: #9CA3AF;
          margin: 0;
        }

        /* ── Footer ── */
        .bl-footer {
          border-top: 1px solid #E8E6E0;
          margin-top: 56px;
          padding-top: 24px;
          text-align: center;
          font-size: 12px;
          color: #C0BAB0;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="bl-root">

        {/* ── Hero ── */}
        <div className="bl-hero">
          <div className="bl-hero-inner">
            <div className="bl-eyebrow">
              <span className="bl-live-dot" />
              Resources · OfSkillJob
            </div>
            <h1>Career <span>insights</span><br />worth reading.</h1>
            <p className="bl-hero-sub">
              Practical guides, remote job tips, and skill-building advice — written for Indian job seekers.
            </p>
          </div>
        </div>

        {/* ── Article grid ── */}
        <div className="bl-body">
          <span className="bl-count">
            {posts.length} {posts.length === 1 ? 'article' : 'articles'}
          </span>

          <div className="bl-grid">
            {posts.length > 0 ? posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="bl-card">
                <div className="bl-card-cat">{(post as any).category || 'Guide'}</div>
                <h2 className="bl-card-title">{post.title}</h2>
                <div className="bl-card-meta">
                  <span className="bl-card-date">{post.date}</span>
                  <div className="bl-card-sep" />
                  <span className="bl-card-time">{post.readingTime}</span>
                </div>
                <p className="bl-card-desc">{post.description}</p>
                <span className="bl-card-cta">Read article →</span>
              </Link>
            )) : (
              <div className="bl-empty">
                <h2>No articles yet</h2>
                <p>Check back soon — new guides are coming.</p>
              </div>
            )}
          </div>

          <div className="bl-footer">
            © 2026 OfSkillJob — Show Skills. Get Hired.
          </div>
        </div>
      </div>
    </>
  );
}