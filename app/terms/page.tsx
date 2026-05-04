// app/terms/page.tsx
export default function TermsOfService() {
  const sections = [
    { id: "eligibility",    num: "01", title: "Eligibility" },
    { id: "account",        num: "02", title: "Account Registration" },
    { id: "roles",          num: "03", title: "User Roles & Task‑Based Applications" },
    { id: "applications",   num: "04", title: "Job Applications & External Listings" },
    { id: "prohibited",     num: "05", title: "Prohibited Conduct" },
    { id: "content",        num: "06", title: "Content Ownership & License" },
    { id: "points",         num: "07", title: "Points, Badges & Gamification" },
    { id: "termination",    num: "08", title: "Termination & Suspension" },
    { id: "disclaimer",     num: "09", title: "Disclaimer of Warranties" },
    { id: "liability",      num: "10", title: "Limitation of Liability" },
    { id: "indemnification",num: "11", title: "Indemnification" },
    { id: "third-party",    num: "12", title: "Third‑Party Links" },
    { id: "modifications",  num: "13", title: "Modifications to the Service" },
    { id: "changes",        num: "14", title: "Changes to These Terms" },
    { id: "governing",      num: "15", title: "Governing Law & Dispute Resolution" },
    { id: "grievance",      num: "16", title: "Grievance Officer (India)" },
    { id: "contact",        num: "17", title: "Contact Us" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .tos-root {
          font-family: 'DM Sans', sans-serif;
          background: #F7F6F2;
          min-height: 100vh;
          color: #1C1C1E;
        }

        /* ── Hero ── */
        .tos-hero {
          background: #0F1923;
          padding: 72px 24px 64px;
          position: relative;
          overflow: hidden;
        }
        .tos-hero::before {
          content: '';
          position: absolute;
          top: -100px; right: -80px;
          width: 420px; height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .tos-hero::after {
          content: '';
          position: absolute;
          bottom: -60px; left: 8%;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,179,237,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .tos-hero-inner {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .tos-eyebrow {
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
          margin-bottom: 24px;
        }
        .tos-live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22C55E;
          display: inline-block;
        }
        .tos-hero h1 {
          font-family: 'Lora', Georgia, serif;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 700;
          color: #FAFAF8;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin: 0 0 18px;
        }
        .tos-hero h1 span { color: #F59E0B; }
        .tos-meta {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .tos-meta-item {
          font-size: 13px;
          font-weight: 400;
          color: rgba(250,250,248,0.50);
        }
        .tos-meta-item strong {
          color: rgba(250,250,248,0.75);
          font-weight: 500;
        }

        /* ── Body ── */
        .tos-body {
          max-width: 800px;
          margin: 0 auto;
          padding: 52px 24px 80px;
        }

        /* ── Applies-to strip ── */
        .tos-applies {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-left: 3px solid #F59E0B;
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 20px;
        }
        .tos-applies p {
          font-size: 15px;
          color: #4A4A52;
          line-height: 1.75;
          margin: 0;
        }
        .tos-applies strong { color: #0F1923; font-weight: 600; }

        /* ── Applies-to audience chips ── */
        .tos-audience {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid #F0EDE7;
        }
        .tos-chip {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          background: #F0EDE7;
          color: #0F1923;
          padding: 5px 13px;
          border-radius: 100px;
        }
        .tos-chip-label {
          font-size: 12px;
          color: #9CA3AF;
          align-self: center;
          margin-right: 2px;
        }

        /* ── TOC ── */
        .tos-toc {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 32px;
        }
        .tos-toc-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #F59E0B;
          margin-bottom: 16px;
          display: block;
        }
        .tos-toc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 24px;
        }
        @media (max-width: 520px) { .tos-toc-grid { grid-template-columns: 1fr; } }
        .tos-toc-link {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 7px 0;
          border-bottom: 1px solid #F3F1EC;
          text-decoration: none;
          color: #4A4A52;
          font-size: 13.5px;
          font-weight: 400;
          transition: color 0.15s;
        }
        .tos-toc-link:hover { color: #0F1923; }
        .tos-toc-num {
          font-size: 11px;
          font-weight: 600;
          color: #C0BAB0;
          letter-spacing: 0.05em;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }

        /* ── Cards ── */
        .tos-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 32px 36px;
          margin-bottom: 20px;
          scroll-margin-top: 24px;
        }
        @media (max-width: 600px) {
          .tos-card { padding: 24px 22px; }
          .tos-applies, .tos-toc { padding: 22px 20px; }
          .tos-hero { padding: 56px 20px 52px; }
        }

        .tos-card-header {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #F3F1EC;
        }
        .tos-card-num {
          font-family: 'Lora', Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: #F0EDE7;
          line-height: 1;
          flex-shrink: 0;
          letter-spacing: -0.03em;
        }
        .tos-card-title {
          font-family: 'Lora', Georgia, serif;
          font-size: 20px;
          font-weight: 600;
          color: #0F1923;
          letter-spacing: -0.01em;
          margin: 0;
          line-height: 1.2;
        }

        /* ── Sub-heading ── */
        .tos-sub {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #0F1923;
          margin: 22px 0 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tos-sub::before {
          content: '';
          display: inline-block;
          width: 14px; height: 2px;
          background: #F59E0B;
          border-radius: 2px;
          flex-shrink: 0;
        }

        /* ── Body text ── */
        .tos-card p {
          font-size: 15px;
          font-weight: 400;
          color: #4A4A52;
          line-height: 1.75;
          margin: 0 0 14px;
        }
        .tos-card p:last-child { margin-bottom: 0; }
        .tos-card strong { color: #0F1923; font-weight: 600; }

        /* ── Lists ── */
        .tos-list {
          list-style: none;
          padding: 0;
          margin: 0 0 14px;
        }
        .tos-list:last-child { margin-bottom: 0; }
        .tos-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 15px;
          color: #4A4A52;
          line-height: 1.7;
          padding: 8px 0;
          border-bottom: 1px solid #F5F3EF;
        }
        .tos-list li:last-child { border-bottom: none; }
        .tos-list li:first-child { padding-top: 0; }
        .tos-bullet {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #F59E0B;
          flex-shrink: 0;
          margin-top: 8px;
        }
        .tos-list li strong { color: #0F1923; font-weight: 600; }

        /* ── Warning list (prohibited) ── */
        .tos-warn-list li .tos-bullet { background: #EF4444; }

        /* ── Infobox ── */
        .tos-infobox {
          background: #F7F6F2;
          border: 1px solid #E8E6E0;
          border-left: 3px solid #F59E0B;
          border-radius: 10px;
          padding: 18px 20px;
          margin-top: 16px;
        }
        .tos-infobox p {
          margin: 4px 0 !important;
          font-size: 14.5px !important;
        }

        /* ── Alert infobox (legal/warning) ── */
        .tos-alert {
          background: rgba(239,68,68,0.04);
          border: 1px solid rgba(239,68,68,0.15);
          border-left: 3px solid #EF4444;
          border-radius: 10px;
          padding: 16px 18px;
          margin-top: 14px;
        }
        .tos-alert p {
          font-size: 14px !important;
          color: #6B2020 !important;
          margin: 0 !important;
          line-height: 1.65 !important;
        }

        /* ── Link ── */
        .tos-link {
          color: #F59E0B;
          text-decoration: none;
          border-bottom: 1px solid rgba(245,158,11,0.35);
          transition: border-color 0.15s;
          font-weight: 500;
        }
        .tos-link:hover { border-color: #F59E0B; }

        /* ── Note (muted italic) ── */
        .tos-note {
          font-size: 13.5px !important;
          color: #9CA3AF !important;
          font-style: italic;
          margin-top: 12px !important;
        }

        /* ── CTA ── */
        .tos-cta {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 44px 36px;
          text-align: center;
          margin-top: 8px;
        }
        .tos-cta h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          color: #0F1923;
          margin: 0 0 10px;
          letter-spacing: -0.02em;
        }
        .tos-cta p {
          font-size: 15px;
          color: #6B7280;
          margin: 0 0 26px;
          line-height: 1.65;
        }
        .tos-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #0F1923;
          color: #FAFAF8;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 600;
          padding: 13px 26px;
          border-radius: 100px;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
        }
        .tos-cta-btn:hover {
          background: #F59E0B;
          color: #0F1923;
          transform: translateY(-1px);
        }
        .tos-footer {
          font-size: 12px;
          color: #C0BAB0;
          margin-top: 24px;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="tos-root">

        {/* ── Hero ── */}
        <div className="tos-hero">
          <div className="tos-hero-inner">
            <div className="tos-eyebrow">
              <span className="tos-live-dot" />
              Legal · OfSkillJob
            </div>
            <h1>Terms of<br /><span>Service</span></h1>
            <div className="tos-meta">
              <div className="tos-meta-item"><strong>Last updated:</strong> May 4, 2026</div>
              <div className="tos-meta-item"><strong>Effective from:</strong> May 4, 2026</div>
              <div className="tos-meta-item"><strong>Jurisdiction:</strong> India</div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="tos-body">

          {/* Intro + Applies-to */}
          <div className="tos-applies">
            <p>
              Welcome to OfSkillJob ("we", "our", "us"). By accessing or using our platform, website,
              and services (collectively, the "Service"), you agree to be bound by these Terms of
              Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
            </p>
            <div className="tos-audience">
              <span className="tos-chip-label">Applies to:</span>
              {["Developers", "Job Seekers", "Companies", "Visitors"].map((role) => (
                <span className="tos-chip" key={role}>{role}</span>
              ))}
            </div>
          </div>

          {/* TOC */}
          <div className="tos-toc">
            <span className="tos-toc-label">Table of Contents</span>
            <div className="tos-toc-grid">
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="tos-toc-link">
                  <span className="tos-toc-num">{s.num}</span>
                  {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* ── 01. Eligibility ── */}
          <div className="tos-card" id="eligibility">
            <div className="tos-card-header">
              <span className="tos-card-num">01</span>
              <h2 className="tos-card-title">Eligibility</h2>
            </div>
            <p>To use the Service, you must:</p>
            <ul className="tos-list">
              {[
                "Be at least 16 years old (or the age of majority in your jurisdiction).",
                "Have the legal capacity to enter into a binding agreement.",
                "Provide accurate, current, and complete information during registration.",
                "Not be prohibited from using the Service under applicable laws.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 02. Account Registration ── */}
          <div className="tos-card" id="account">
            <div className="tos-card-header">
              <span className="tos-card-num">02</span>
              <h2 className="tos-card-title">Account Registration</h2>
            </div>
            <p>When you create an account with us, you agree to:</p>
            <ul className="tos-list">
              {[
                "Provide truthful and accurate information.",
                "Maintain the security and confidentiality of your login credentials.",
                "Notify us immediately of any unauthorised use of your account.",
                "Accept responsibility for all activities that occur under your account.",
                "Not create multiple accounts or impersonate others.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
            <p style={{ marginTop: 14 }}>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
          </div>

          {/* ── 03. User Roles & Task-Based Applications ── */}
          <div className="tos-card" id="roles">
            <div className="tos-card-header">
              <span className="tos-card-num">03</span>
              <h2 className="tos-card-title">User Roles & Task‑Based Applications</h2>
            </div>

            <div className="tos-sub">Developers / Job Seekers</div>
            <ul className="tos-list">
              {[
                "You can create a profile showcasing your skills, experience, and projects.",
                "To apply for a job, you must first complete the associated skill task (e.g., coding challenge, design mock, sales scenario).",
                "Your application is submitted only after a successful task submission — no \"blind\" applications.",
                "You grant companies permission to view your public profile and task results when you apply.",
                "You are responsible for the accuracy of information in your profile.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>

            <div className="tos-sub">Companies</div>
            <ul className="tos-list">
              {[
                "You can post job opportunities with a required skill task.",
                "You agree to provide accurate job descriptions, salary ranges, and company information.",
                "You will not post fake jobs, collect applicant data for unauthorised purposes, or discriminate illegally.",
                "You are responsible for verifying candidate qualifications and conducting your own background checks.",
                "You may review task submissions and shortlist candidates based on demonstrated skills.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 04. Job Applications & External Listings ── */}
          <div className="tos-card" id="applications">
            <div className="tos-card-header">
              <span className="tos-card-num">04</span>
              <h2 className="tos-card-title">Job Applications & External Listings</h2>
            </div>
            <ul className="tos-list">
              {[
                "When you apply to a job, your profile information and task submission are shared with the company.",
                "Some jobs are curated by OfSkillJob and may redirect you to the employer's external application page. In such cases, we do not collect your application — you apply directly on the employer's site.",
                "We do not guarantee that you will receive a response or job offer from any company.",
                "We are not responsible for hiring decisions made by companies.",
                "Companies may update your application status (reviewed, shortlisted, rejected).",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 05. Prohibited Conduct ── */}
          <div className="tos-card" id="prohibited">
            <div className="tos-card-header">
              <span className="tos-card-num">05</span>
              <h2 className="tos-card-title">Prohibited Conduct</h2>
            </div>
            <p>You agree <strong>not</strong> to:</p>
            <ul className="tos-list tos-warn-list">
              {[
                "Post false, misleading, or fraudulent information.",
                "Impersonate another person or entity.",
                "Upload malware, viruses, or harmful code.",
                "Scrape, copy, or collect user data without permission.",
                "Spam, harass, or abuse other users.",
                "Post illegal content or promote illegal activities.",
                "Attempt to bypass our security measures or access unauthorised areas.",
                "Use the Service for any unlawful purpose.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 06. Content Ownership ── */}
          <div className="tos-card" id="content">
            <div className="tos-card-header">
              <span className="tos-card-num">06</span>
              <h2 className="tos-card-title">Content Ownership & License</h2>
            </div>

            <div className="tos-sub">Your Content</div>
            <p>
              You retain ownership of all content you post (profile information, resumes, project
              submissions, etc.). By posting content, you grant us a non‑exclusive, worldwide,
              royalty‑free license to:
            </p>
            <ul className="tos-list">
              {[
                "Host, store, and display your content on the Service.",
                "Share your content with companies when you apply to their jobs.",
                "Use aggregated, anonymised data to improve the Service.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>

            <div className="tos-sub">Our Content</div>
            <p>
              All content provided by us (designs, logos, text, graphics, software) is owned by
              OfSkillJob and protected by copyright and intellectual property laws. You may not
              copy, modify, or distribute our content without permission.
            </p>
          </div>

          {/* ── 07. Points, Badges & Gamification ── */}
          <div className="tos-card" id="points">
            <div className="tos-card-header">
              <span className="tos-card-num">07</span>
              <h2 className="tos-card-title">Points, Badges & Gamification</h2>
            </div>
            <ul className="tos-list">
              {[
                "Points are awarded for completing actions (profile completion, job applications, challenge submissions, login streaks).",
                "Badges are earned automatically when reaching point milestones.",
                "Points and badges have no monetary value and cannot be exchanged for real currency.",
                "We reserve the right to adjust point values or badge criteria at any time.",
                "We may remove points or badges if we detect fraudulent activity.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 08. Termination ── */}
          <div className="tos-card" id="termination">
            <div className="tos-card-header">
              <span className="tos-card-num">08</span>
              <h2 className="tos-card-title">Termination & Suspension</h2>
            </div>
            <p>We may terminate or suspend your account immediately, without notice, if you:</p>
            <ul className="tos-list tos-warn-list">
              {[
                "Violate these Terms of Service.",
                "Engage in fraudulent or harmful behaviour.",
                "Post illegal or prohibited content.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
            <p style={{ marginTop: 14 }}>
              You may delete your account at any time by contacting us. Upon termination, your
              profile and data will be deleted within <strong>30 days</strong>, except for
              information we must retain for legal reasons.
            </p>
          </div>

          {/* ── 09. Disclaimer ── */}
          <div className="tos-card" id="disclaimer">
            <div className="tos-card-header">
              <span className="tos-card-num">09</span>
              <h2 className="tos-card-title">Disclaimer of Warranties</h2>
            </div>
            <p>
              The Service is provided <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong>{" "}
              without warranties of any kind, either express or implied. We do not warrant that:
            </p>
            <ul className="tos-list">
              {[
                "The Service will be uninterrupted, secure, or error‑free.",
                "You will receive a job offer through the platform.",
                "The information provided by users is accurate or complete.",
                "Any errors will be corrected.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 10. Limitation of Liability ── */}
          <div className="tos-card" id="liability">
            <div className="tos-card-header">
              <span className="tos-card-num">10</span>
              <h2 className="tos-card-title">Limitation of Liability</h2>
            </div>
            <p>To the maximum extent permitted by law, OfSkillJob and its affiliates shall not be liable for:</p>
            <ul className="tos-list">
              {[
                "Any indirect, incidental, special, consequential, or punitive damages.",
                "Loss of profits, data, or business opportunities.",
                "Damages arising from your use or inability to use the Service.",
                "Any conduct or content of third parties on the platform.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
            <div className="tos-alert">
              <p>Our total liability to you shall not exceed the amount you paid us (if any) or $100, whichever is less.</p>
            </div>
          </div>

          {/* ── 11. Indemnification ── */}
          <div className="tos-card" id="indemnification">
            <div className="tos-card-header">
              <span className="tos-card-num">11</span>
              <h2 className="tos-card-title">Indemnification</h2>
            </div>
            <p>
              You agree to indemnify and hold harmless OfSkillJob, its officers, employees, and
              agents from any claims, damages, losses, or expenses (including legal fees) arising from:
            </p>
            <ul className="tos-list">
              {[
                "Your use of the Service.",
                "Your violation of these Terms.",
                "Your violation of any third‑party rights (e.g., intellectual property, privacy).",
                "Any content you post on the platform.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 12. Third-Party Links ── */}
          <div className="tos-card" id="third-party">
            <div className="tos-card-header">
              <span className="tos-card-num">12</span>
              <h2 className="tos-card-title">Third‑Party Links</h2>
            </div>
            <p>
              The Service may contain links to third‑party websites (GitHub, LinkedIn, Google Drive,
              etc.). We are not responsible for their content, privacy practices, or terms. You
              access them at your own risk.
            </p>
          </div>

          {/* ── 13. Modifications to Service ── */}
          <div className="tos-card" id="modifications">
            <div className="tos-card-header">
              <span className="tos-card-num">13</span>
              <h2 className="tos-card-title">Modifications to the Service</h2>
            </div>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Service at
              any time, without notice. We are not liable to you for any such changes.
            </p>
          </div>

          {/* ── 14. Changes to Terms ── */}
          <div className="tos-card" id="changes">
            <div className="tos-card-header">
              <span className="tos-card-num">14</span>
              <h2 className="tos-card-title">Changes to These Terms</h2>
            </div>
            <p>We may update these Terms from time to time. We will notify you of material changes by:</p>
            <ul className="tos-list">
              {[
                "Posting the new Terms on this page with an updated \"Last updated\" date.",
                "Sending an email to registered users (if you have provided one).",
                "Displaying a notice on the platform.",
              ].map((item, i) => (
                <li key={i}><div className="tos-bullet" /><span>{item}</span></li>
              ))}
            </ul>
            <p style={{ marginTop: 14 }}>Your continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </div>

          {/* ── 15. Governing Law ── */}
          <div className="tos-card" id="governing">
            <div className="tos-card-header">
              <span className="tos-card-num">15</span>
              <h2 className="tos-card-title">Governing Law & Dispute Resolution</h2>
            </div>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India,
              without regard to its conflict of law provisions. Any disputes arising under these
              Terms shall be subject to the exclusive jurisdiction of the courts in India.
            </p>
          </div>

          {/* ── 16. Grievance Officer ── */}
          <div className="tos-card" id="grievance">
            <div className="tos-card-header">
              <span className="tos-card-num">16</span>
              <h2 className="tos-card-title">Grievance Officer (India)</h2>
            </div>
            <p>
              In compliance with the Information Technology Act, 2000 and its rules, the Grievance
              Officer for OfSkillJob is:
            </p>
            <div className="tos-infobox">
              <p><strong>Name:</strong> Shahid Nabi</p>
              <p><strong>Email:</strong> <a href="mailto:ofskilljobs@gmail.com" className="tos-link">ofskilljobs@gmail.com</a></p>
              <p><strong>Address:</strong> Remote, India</p>
            </div>
            <p style={{ marginTop: 14 }}>
              Any complaints or grievances regarding the Service or these Terms can be sent to the
              above email. We will acknowledge your complaint within <strong>48 hours</strong> and
              resolve it within <strong>30 days</strong>.
            </p>
          </div>

          {/* ── 17. Contact ── */}
          <div className="tos-card" id="contact">
            <div className="tos-card-header">
              <span className="tos-card-num">17</span>
              <h2 className="tos-card-title">Contact Us</h2>
            </div>
            <p>If you have questions about these Terms, please contact us:</p>
            <div className="tos-infobox">
              <p><strong>Email:</strong> <a href="mailto:ofskilljobs@gmail.com" className="tos-link">ofskilljobs@gmail.com</a></p>
              <p><strong>Website:</strong> ofskilljobs.vercel.app</p>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="tos-cta">
            <h2>Questions about these Terms?</h2>
            <p>We're happy to clarify anything. Reach out and we'll respond within 48 hours.</p>
            <a href="mailto:ofskilljobs@gmail.com" className="tos-cta-btn">
              ofskilljobs@gmail.com
            </a>
            <p className="tos-footer">© 2026 OfSkillJob — Show Skills. Get Hired. All rights reserved.</p>
          </div>

        </div>
      </div>
    </>
  );
}