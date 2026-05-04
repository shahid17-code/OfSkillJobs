// app/about/page.tsx
export default function AboutUs() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .about-root {
          font-family: 'DM Sans', sans-serif;
          background: #F7F6F2;
          min-height: 100vh;
          color: #1C1C1E;
        }

        .about-hero {
          background: #0F1923;
          padding: 80px 24px 72px;
          position: relative;
          overflow: hidden;
        }

        .about-hero::before {
          content: '';
          position: absolute;
          top: -80px;
          right: -80px;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .about-hero::after {
          content: '';
          position: absolute;
          bottom: -60px;
          left: -60px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,179,237,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .about-hero-inner {
          max-width: 760px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .about-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.3);
          color: #F59E0B;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 100px;
          margin-bottom: 28px;
        }

        .about-hero h1 {
          font-family: 'Lora', Georgia, serif;
          font-size: clamp(36px, 5vw, 58px);
          font-weight: 700;
          color: #FAFAF8;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin: 0 0 20px;
        }

        .about-hero h1 span {
          color: #F59E0B;
        }

        .about-hero-sub {
          font-size: 17px;
          font-weight: 300;
          color: rgba(250,250,248,0.65);
          line-height: 1.65;
          max-width: 540px;
          margin: 0;
        }

        .about-body {
          max-width: 800px;
          margin: 0 auto;
          padding: 56px 24px 80px;
        }

        /* ── Section label ── */
        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #F59E0B;
          margin-bottom: 10px;
          display: block;
        }

        /* ── Cards ── */
        .card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 36px;
          margin-bottom: 28px;
        }

        .card h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
          color: #0F1923;
          margin: 0 0 16px;
          letter-spacing: -0.01em;
        }

        .card p {
          font-size: 15.5px;
          font-weight: 400;
          color: #4A4A52;
          line-height: 1.75;
          margin: 0 0 14px;
        }

        .card p:last-child { margin-bottom: 0; }

        .card strong { color: #0F1923; font-weight: 600; }

        /* ── Divider ── */
        .divider {
          border: none;
          border-top: 1px solid #E8E6E0;
          margin: 0 0 28px;
        }

        /* ── 2-col grid ── */
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }

        @media (max-width: 600px) {
          .two-col { grid-template-columns: 1fr; }
          .about-hero { padding: 56px 20px 56px; }
          .card { padding: 28px 22px; }
        }

        .accent-card {
          border-left: 3px solid #F59E0B;
        }

        /* ── What We Do items ── */
        .wwd-item {
          padding: 22px 0;
          border-bottom: 1px solid #F0EDE7;
        }

        .wwd-item:last-child { border-bottom: none; padding-bottom: 0; }
        .wwd-item:first-child { padding-top: 0; }

        .wwd-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #0F1923;
          background: #F0EDE7;
          padding: 3px 10px;
          border-radius: 100px;
          margin-bottom: 10px;
        }

        .wwd-item p {
          font-size: 15px;
          color: #4A4A52;
          line-height: 1.7;
          margin: 0;
        }

        /* ── Trust section ── */
        .trust-card {
          background: #0F1923;
          border-radius: 16px;
          padding: 36px;
          margin-bottom: 28px;
        }

        .trust-card h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
          color: #FAFAF8;
          margin: 0 0 24px;
          letter-spacing: -0.01em;
        }

        .trust-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 24px;
        }

        @media (max-width: 520px) {
          .trust-grid { grid-template-columns: 1fr; }
        }

        .trust-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 14px 16px;
        }

        .trust-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22C55E;
          flex-shrink: 0;
          margin-top: 5px;
        }

        .trust-item span {
          font-size: 14px;
          color: rgba(250,250,248,0.85);
          line-height: 1.55;
        }

        .trust-contact {
          font-size: 13.5px;
          color: rgba(250,250,248,0.5);
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 20px;
          margin: 0;
        }

        .trust-contact a {
          color: #F59E0B;
          text-decoration: none;
          border-bottom: 1px solid rgba(245,158,11,0.35);
          transition: border-color 0.2s;
        }

        .trust-contact a:hover { border-color: #F59E0B; }

        /* ── Snapshot ── */
        .snapshot-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }

        @media (max-width: 520px) { .snapshot-grid { grid-template-columns: 1fr; } }

        .snapshot-item {
          padding: 16px 0;
          border-bottom: 1px solid #F0EDE7;
        }

        .snapshot-item:nth-last-child(-n+2) { border-bottom: none; }

        @media (max-width: 520px) {
          .snapshot-item:last-child { border-bottom: none; }
          .snapshot-item:nth-last-child(2) { border-bottom: 1px solid #F0EDE7; }
        }

        .snapshot-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9CA3AF;
          margin-bottom: 4px;
        }

        .snapshot-value {
          font-size: 15px;
          font-weight: 500;
          color: #0F1923;
        }

        /* ── Core values ── */
        .values-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 28px;
        }

        @media (max-width: 520px) { .values-grid { grid-template-columns: 1fr; } }

        .value-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 14px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .value-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: #F59E0B;
        }

        .value-card h3 {
          font-family: 'Lora', Georgia, serif;
          font-size: 17px;
          font-weight: 600;
          color: #0F1923;
          margin: 0 0 8px;
        }

        .value-card p {
          font-size: 14px;
          color: #6B7280;
          line-height: 1.65;
          margin: 0;
        }

        /* ── CTA ── */
        .cta-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 48px 36px;
          text-align: center;
        }

        .cta-card h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 26px;
          font-weight: 700;
          color: #0F1923;
          letter-spacing: -0.02em;
          margin: 0 0 12px;
        }

        .cta-card p {
          font-size: 15.5px;
          color: #6B7280;
          margin: 0 0 28px;
          line-height: 1.65;
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #0F1923;
          color: #FAFAF8;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          padding: 14px 28px;
          border-radius: 100px;
          text-decoration: none;
          letter-spacing: 0.01em;
          transition: background 0.2s, transform 0.15s;
          border: 2px solid transparent;
        }

        .cta-btn:hover {
          background: #F59E0B;
          color: #0F1923;
          transform: translateY(-1px);
        }

        .cta-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22C55E;
          display: inline-block;
        }

        .cta-footer {
          font-size: 12px;
          color: #C0BAB0;
          margin-top: 28px;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="about-root">

        {/* ── Hero ── */}
        <div className="about-hero">
          <div className="about-hero-inner">
            <div className="about-eyebrow">
              <span className="cta-dot" />
               EST. 2026 · India
            </div>
            <h1>Skill‑first hiring,<br /><span>built for the real world.</span></h1>
            <p className="about-hero-sub">
              We believe a completed task speaks louder than a hundred cover letters.
              OfSkillJob replaces the résumé lottery with proof of ability.
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="about-body">

          {/* Founder Story */}
          <div className="card accent-card">
            <span className="section-label">Founder & Origin</span>
            <h2>Founded by Shahid Nabi</h2>
            <p>
              OfSkillJob was created in 2026 by <strong>Shahid Nabi</strong>, a solo developer who
              experienced the frustration of traditional job portals firsthand. Resumes disappeared
              into black holes. Recruiters spent hours filtering unqualified applicants. Genuine
              skill was lost in a sea of keywords.
            </p>
            <p>
              That's why OfSkillJob is different: companies post a real‑world task, and candidates
              can only apply after completing it. We prove ability – not just a polished CV.
              Today, we're a remote team based in India, dedicated to making hiring transparent,
              fair, and skill‑focused.
            </p>
          </div>

          {/* Mission & Vision */}
          <div className="two-col">
            <div className="card" style={{ marginBottom: 0 }}>
              <span className="section-label">Mission</span>
              <h2>Why we exist</h2>
              <p>
                Democratise hiring by putting verified skills at the centre – not résumés, not
                pedigrees. Every professional, regardless of background, should be hired for what
                they can actually do.
              </p>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <span className="section-label">Vision</span>
              <h2>Where we're headed</h2>
              <p>
                Become the default skill‑first hiring platform across India, and eventually the
                world. A place where a completed task speaks louder than a hundred cover letters.
              </p>
            </div>
          </div>
          <div style={{ marginBottom: 28 }} />

          {/* What We Do */}
          <div className="card">
            <span className="section-label">What We Do</span>
            <h2>How it works</h2>

            <div className="wwd-item">
              <div className="wwd-tag">For job seekers</div>
              <p>
                Build a CV‑style profile, complete skill challenges — coding, design, marketing,
                sales and more — earn points &amp; badges, and apply to jobs only after you've
                proven your ability.
              </p>
            </div>

            <div className="wwd-item">
              <div className="wwd-tag">For companies</div>
              <p>
                Post jobs with custom tasks, review real submissions, and shortlist only candidates
                who've already demonstrated the required skill.
              </p>
            </div>

            <div className="wwd-item">
              <div className="wwd-tag">Real‑time transparency</div>
              <p>
                Both sides see when applications are viewed, reviewed, and shortlisted — no more
                guessing, no more silence.
              </p>
            </div>
          </div>

          {/* Trust & Security */}
          <div className="trust-card">
            <span className="section-label" style={{ color: '#F59E0B' }}>Trust &amp; Security</span>
            <h2>Your trust is our priority</h2>
            <div className="trust-grid">
              {[
                "100% free for job seekers — no hidden fees, ever.",
                "Every job manually reviewed before listing.",
                "No Aadhaar / PAN / bank details collected.",
                "Your data is encrypted and never sold.",
              ].map((item, i) => (
                <div className="trust-item" key={i}>
                  <div className="trust-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="trust-contact">
              📍 Operated remotely from India. You can reach Shahid directly at{" "}
              <a href="mailto:ofskilljobs@gmail.com">ofskilljobs@gmail.com</a>.
            </p>
          </div>

          {/* Company Snapshot */}
          <div className="card">
            <span className="section-label">Company Snapshot</span>
            <h2>The basics</h2>
            <div className="snapshot-grid">
              {[
                { label: "Founder", value: "Shahid Nabi" },
                { label: "Founded", value: "2026" },
                { label: "Headquarters", value: "Remote (India)" },
                { label: "Email", value: "ofskilljobs@gmail.com" },
                { label: "Website", value: "ofskilljobs.vercel.app" },
              ].map((row, i) => (
                <div className="snapshot-item" key={i}>
                  <div className="snapshot-label">{row.label}</div>
                  <div className="snapshot-value">{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Values */}
          <span className="section-label" style={{ display: 'block', marginBottom: 16 }}>Core Values</span>
          <div className="values-grid">
            {[
              { title: "Transparency", desc: "Clear processes, honest communication, no hidden fees." },
              { title: "Meritocracy", desc: "Opportunities based on ability, not connections or pedigree." },
              { title: "Community", desc: "We grow together — feedback and contributions are always welcome." },
              { title: "Innovation", desc: "Constantly improving our tools to make hiring genuinely better." },
            ].map((val, i) => (
              <div className="value-card" key={i}>
                <h3>{val.title}</h3>
                <p>{val.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="cta-card">
            <h2>Let's build something great</h2>
            <p>Questions, partnership ideas, or just want to say hi? Reach out anytime.</p>
            <a href="mailto:ofskilljobs@gmail.com" className="cta-btn">
              ofskilljobs@gmail.com
            </a>
            <p className="cta-footer">© 2026 OfSkillJob — Show Skills. Get Hired.</p>
          </div>

        </div>
      </div>
    </>
  );
}