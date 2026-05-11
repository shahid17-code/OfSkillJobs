// app/blog/page.tsx
import Link from "next/link";
import blogData from "@/data/blog.json";

export const metadata = {
  title: "Blog — OfSkillJob | Skill-Based Hiring Insights",
  description:
    "Guides, data, and insights on skill-based hiring, remote work in India, and how to land jobs by proving ability — not just listing experience.",
  alternates: { canonical: "https://ofskilljobs.vercel.app/blog" },
};

const categoryColors: Record<string, { bg: string; color: string }> = {
  "Career Guide":    { bg: "#DCFCE7", color: "#166534" },
  "Hiring Insights": { bg: "#FEF3C7", color: "#92400E" },
  "Skill Tips":      { bg: "#DBEAFE", color: "#1D4ED8" },
  default:           { bg: "#F3F4F6", color: "#374151" },
};

export default function BlogListPage() {
  const posts = blogData.posts;

  return (
    <>
      <style>{`
        /* ── Hero ── */
        .bl-hero {
          background: #0F1923;
          padding: 64px 24px 72px;
          position: relative;
          overflow: hidden;
        }
        .bl-hero::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 380px; height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.11) 0%, transparent 65%);
          pointer-events: none;
        }
        .bl-hero-inner {
          max-width: 760px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .bl-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.30);
          color: #F59E0B;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 100px;
          margin-bottom: 22px;
        }
        .bl-live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22C55E;
          display: inline-block;
        }
        .bl-hero h1 {
          font-family: 'Lora', Georgia, serif;
          font-size: clamp(30px, 5vw, 48px);
          font-weight: 700;
          color: #FAFAF8;
          line-height: 1.15;
          letter-spacing: -0.025em;
          margin: 0 0 16px;
        }
        .bl-hero h1 span { color: #F59E0B; }
        .bl-hero-sub {
          font-size: 16px;
          font-weight: 300;
          color: rgba(250,250,248,0.55);
          line-height: 1.68;
          margin: 0;
          max-width: 520px;
        }

        /* ── Page body ── */
        .bl-body {
          max-width: 1100px;
          margin: 0 auto;
          padding: 52px 24px 80px;
          width: 100%;
          box-sizing: border-box;
        }

        /* ── Grid ── */
        .bl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        /* ── Card ── */
        .bl-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 28px 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          text-decoration: none;
          transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
        }
        .bl-card:hover {
          box-shadow: 0 12px 36px rgba(15,25,35,0.10);
          border-color: #F59E0B;
          transform: translateY(-2px);
        }
        .bl-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .bl-cat {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 100px;
        }
        .bl-read-time {
          font-size: 12px;
          color: #9CA3AF;
          font-weight: 400;
          white-space: nowrap;
        }
        .bl-card-title {
          font-family: 'Lora', Georgia, serif;
          font-size: 19px;
          font-weight: 700;
          color: #0F1923;
          line-height: 1.3;
          letter-spacing: -0.015em;
          margin: 0;
        }
        .bl-card-desc {
          font-size: 14.5px;
          color: #6B7280;
          line-height: 1.65;
          margin: 0;
          flex: 1;
        }
        .bl-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid #F0EDE7;
          gap: 10px;
        }
        .bl-card-date {
          font-size: 12px;
          color: #C0BAB0;
          font-weight: 400;
        }
        .bl-card-arrow {
          font-size: 13px;
          color: #F59E0B;
          font-weight: 600;
          transition: transform 0.15s;
        }
        .bl-card:hover .bl-card-arrow { transform: translateX(4px); }

        /* ── Hero stats ── */
        .bl-card-stats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .bl-stat-chip {
          background: #F7F6F2;
          border: 1px solid #E8E6E0;
          border-radius: 8px;
          padding: 6px 10px;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .bl-stat-num {
          font-family: 'Lora', Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          color: #0F1923;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .bl-stat-label {
          font-size: 10px;
          color: #9CA3AF;
          line-height: 1.3;
        }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .bl-hero  { padding: 48px 20px 56px; }
          .bl-body  { padding: 36px 16px 60px; }
          .bl-grid  { grid-template-columns: 1fr; gap: 16px; }
          .bl-card  { padding: 22px 20px 18px; }
        }
      `}</style>

      {/* Hero */}
      <div className="bl-hero">
        <div className="bl-hero-inner">
          <div className="bl-eyebrow">
            <span className="bl-live-dot" />
            OfSkillJob Blog
          </div>
          <h1>Insights on <span>skill-first</span> hiring</h1>
          <p className="bl-hero-sub">
            Guides, data, and practical advice on getting hired by proving ability — not just listing experience.
          </p>
        </div>
      </div>

      {/* Post grid */}
      <div className="bl-body">
        <div className="bl-grid">
          {posts.map((post) => {
            const cat = categoryColors[post.category] ?? categoryColors.default;
            const stats = (post as any).heroStats as Array<{ num: string; label: string }> | undefined;

            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="bl-card">
                <div className="bl-card-top">
                  <span
                    className="bl-cat"
                    style={{ background: cat.bg, color: cat.color }}
                  >
                    {post.category}
                  </span>
                  <span className="bl-read-time">{post.readingTime}</span>
                </div>

                <h2 className="bl-card-title">{post.title}</h2>

                <p className="bl-card-desc">{post.description}</p>

                {stats && stats.length > 0 && (
                  <div className="bl-card-stats">
                    {stats.slice(0, 3).map((s) => (
                      <div className="bl-stat-chip" key={s.num}>
                        <span className="bl-stat-num">{s.num}</span>
                        <span className="bl-stat-label">{s.label.slice(0, 36)}{s.label.length > 36 ? "…" : ""}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bl-card-footer">
                  <span className="bl-card-date">{post.date}</span>
                  <span className="bl-card-arrow">Read article →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}