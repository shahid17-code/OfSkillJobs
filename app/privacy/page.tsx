// app/privacy/page.tsx
export default function PrivacyPolicy() {
  const sections = [
    { id: "collect",      num: "01", title: "Information We Collect" },
    { id: "use",          num: "02", title: "How We Use Your Information" },
    { id: "legal-basis",  num: "03", title: "Legal Basis for Processing" },
    { id: "sharing",      num: "04", title: "Sharing Your Information" },
    { id: "public",       num: "05", title: "Public Information" },
    { id: "retention",    num: "06", title: "Data Retention" },
    { id: "cookies",      num: "07", title: "Cookies & Tracking" },
    { id: "analytics",    num: "08", title: "Google Analytics" },
    { id: "rights",       num: "09", title: "Your Rights" },
    { id: "security",     num: "10", title: "Data Security" },
    { id: "controller",   num: "11", title: "Data Controller & Grievance Officer" },
    { id: "children",     num: "12", title: "Children's Privacy" },
    { id: "third-party",  num: "13", title: "Third-Party Links" },
    { id: "changes",      num: "14", title: "Changes to This Policy" },
    { id: "governing",    num: "15", title: "Governing Law" },
    { id: "contact",      num: "16", title: "Contact Us" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        /* ── Root ── */
        .pp-root {
          font-family: 'DM Sans', sans-serif;
          background: #F7F6F2;
          min-height: 100vh;
          color: #1C1C1E;
        }

        /* ── Hero ── */
        .pp-hero {
          background: #0F1923;
          padding: 72px 24px 64px;
          position: relative;
          overflow: hidden;
        }
        .pp-hero::before {
          content: '';
          position: absolute;
          top: -100px; right: -80px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .pp-hero::after {
          content: '';
          position: absolute;
          bottom: -60px; left: 10%;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,179,237,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .pp-hero-inner {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .pp-eyebrow {
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
        .pp-live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22C55E;
          display: inline-block;
        }
        .pp-hero h1 {
          font-family: 'Lora', Georgia, serif;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 700;
          color: #FAFAF8;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin: 0 0 18px;
        }
        .pp-hero h1 span { color: #F59E0B; }
        .pp-meta {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .pp-meta-item {
          font-size: 13px;
          font-weight: 400;
          color: rgba(250,250,248,0.50);
        }
        .pp-meta-item strong {
          color: rgba(250,250,248,0.75);
          font-weight: 500;
        }

        /* ── Body layout ── */
        .pp-body {
          max-width: 800px;
          margin: 0 auto;
          padding: 52px 24px 80px;
        }

        /* ── Key points summary ── */
        .pp-summary {
          background: #0F1923;
          border-radius: 16px;
          padding: 32px 36px;
          margin-bottom: 32px;
        }
        .pp-summary-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #F59E0B;
          margin-bottom: 14px;
          display: block;
        }
        .pp-summary h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 19px;
          font-weight: 600;
          color: #FAFAF8;
          margin: 0 0 20px;
          letter-spacing: -0.01em;
        }
        .pp-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 520px) { .pp-summary-grid { grid-template-columns: 1fr; } }
        .pp-summary-item {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 13px 15px;
        }
        .pp-green-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #22C55E;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .pp-summary-item span {
          font-size: 13.5px;
          color: rgba(250,250,248,0.80);
          line-height: 1.55;
        }

        /* ── TOC ── */
        .pp-toc {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 32px;
        }
        .pp-toc-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #F59E0B;
          margin-bottom: 16px;
          display: block;
        }
        .pp-toc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 24px;
        }
        @media (max-width: 520px) { .pp-toc-grid { grid-template-columns: 1fr; } }
        .pp-toc-link {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 7px 0;
          border-bottom: 1px solid #F3F1EC;
          text-decoration: none;
          color: #4A4A52;
          font-size: 14px;
          font-weight: 400;
          transition: color 0.15s;
        }
        .pp-toc-link:hover { color: #0F1923; }
        .pp-toc-num {
          font-size: 11px;
          font-weight: 600;
          color: #C0BAB0;
          letter-spacing: 0.05em;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }

        /* ── Section label ── */
        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #F59E0B;
          margin-bottom: 10px;
          display: block;
        }

        /* ── Cards ── */
        .pp-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 32px 36px;
          margin-bottom: 20px;
          scroll-margin-top: 24px;
        }
        @media (max-width: 600px) {
          .pp-card { padding: 24px 22px; }
          .pp-summary, .pp-toc { padding: 24px 20px; }
        }

        .pp-card-header {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #F3F1EC;
        }
        .pp-card-num {
          font-family: 'Lora', Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: #F0EDE7;
          line-height: 1;
          flex-shrink: 0;
          letter-spacing: -0.03em;
        }
        .pp-card-title {
          font-family: 'Lora', Georgia, serif;
          font-size: 20px;
          font-weight: 600;
          color: #0F1923;
          letter-spacing: -0.01em;
          margin: 0;
          line-height: 1.2;
        }

        /* ── Sub-headings inside cards ── */
        .pp-sub {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #0F1923;
          margin: 22px 0 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pp-sub::before {
          content: '';
          display: inline-block;
          width: 14px; height: 2px;
          background: #F59E0B;
          border-radius: 2px;
          flex-shrink: 0;
        }

        /* ── Body text ── */
        .pp-card p {
          font-size: 15px;
          font-weight: 400;
          color: #4A4A52;
          line-height: 1.75;
          margin: 0 0 14px;
        }
        .pp-card p:last-child { margin-bottom: 0; }
        .pp-card strong { color: #0F1923; font-weight: 600; }

        /* ── Lists ── */
        .pp-list {
          list-style: none;
          padding: 0;
          margin: 0 0 14px;
        }
        .pp-list:last-child { margin-bottom: 0; }
        .pp-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 15px;
          color: #4A4A52;
          line-height: 1.7;
          padding: 8px 0;
          border-bottom: 1px solid #F5F3EF;
        }
        .pp-list li:last-child { border-bottom: none; }
        .pp-list-bullet {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #F59E0B;
          flex-shrink: 0;
          margin-top: 8px;
        }
        .pp-list li strong { color: #0F1923; font-weight: 600; }

        /* ── Info box ── */
        .pp-infobox {
          background: #F7F6F2;
          border: 1px solid #E8E6E0;
          border-left: 3px solid #F59E0B;
          border-radius: 10px;
          padding: 18px 20px;
          margin-top: 16px;
        }
        .pp-infobox p {
          margin: 4px 0 !important;
          font-size: 14.5px !important;
        }

        /* ── Code inline ── */
        .pp-code {
          background: #F0EDE7;
          color: #0F1923;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 12.5px;
          padding: 2px 7px;
          border-radius: 5px;
          letter-spacing: -0.02em;
        }

        /* ── Links ── */
        .pp-link {
          color: #F59E0B;
          text-decoration: none;
          border-bottom: 1px solid rgba(245,158,11,0.35);
          transition: border-color 0.15s;
          font-weight: 500;
        }
        .pp-link:hover { border-color: #F59E0B; }

        /* ── Note card (muted) ── */
        .pp-note {
          font-size: 13.5px !important;
          color: #9CA3AF !important;
          font-style: italic;
          margin-top: 12px !important;
        }

        /* ── CTA / footer ── */
        .pp-cta {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 44px 36px;
          text-align: center;
          margin-top: 8px;
        }
        .pp-cta h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          color: #0F1923;
          margin: 0 0 10px;
          letter-spacing: -0.02em;
        }
        .pp-cta p {
          font-size: 15px;
          color: #6B7280;
          margin: 0 0 26px;
          line-height: 1.65;
        }
        .pp-cta-btn {
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
          letter-spacing: 0.01em;
          transition: background 0.2s, transform 0.15s;
        }
        .pp-cta-btn:hover {
          background: #F59E0B;
          color: #0F1923;
          transform: translateY(-1px);
        }
        .pp-footer {
          font-size: 12px;
          color: #C0BAB0;
          margin-top: 24px;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="pp-root">

        {/* ── Hero ── */}
        <div className="pp-hero">
          <div className="pp-hero-inner">
            <div className="pp-eyebrow">
              <span className="pp-live-dot" />
              Legal · OfSkillJob
            </div>
            <h1>Privacy<br /><span>Policy</span></h1>
            <div className="pp-meta">
              <div className="pp-meta-item"><strong>Last updated:</strong> May 4, 2026</div>
              <div className="pp-meta-item"><strong>Effective from:</strong> May 4, 2026</div>
              <div className="pp-meta-item"><strong>Jurisdiction:</strong> India (+ GDPR / CCPA)</div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="pp-body">

          {/* Intro paragraph */}
          <div className="pp-card" style={{ borderLeft: "3px solid #F59E0B", marginBottom: 20 }}>
            <p style={{ margin: 0 }}>
              OfSkillJob ("we", "our", "us") respects your privacy. This Privacy Policy explains how
              we collect, use, disclose, and safeguard your information when you use our platform,
              website, and services (the "Service"). We are a remote company operated from{" "}
              <strong>India</strong>, and this policy complies with Indian IT laws (the Information
              Technology Act, 2000 and SPDI Rules, 2011) as well as applicable international
              frameworks (GDPR, CCPA) where relevant.
            </p>
          </div>

          {/* Key commitments summary */}
          <div className="pp-summary">
            <span className="pp-summary-label">Key Commitments at a Glance</span>
            <h2>What we promise you</h2>
            <div className="pp-summary-grid">
              {[
                "We never sell your personal data.",
                "100% free for job seekers — no hidden fees.",
                "No Aadhaar, PAN, or bank details collected.",
                "Every job is manually reviewed before listing.",
                "Data encrypted in transit and at rest.",
                "You can request deletion within 30 days.",
              ].map((item, i) => (
                <div className="pp-summary-item" key={i}>
                  <div className="pp-green-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table of Contents */}
          <div className="pp-toc">
            <span className="pp-toc-label">Table of Contents</span>
            <div className="pp-toc-grid">
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="pp-toc-link">
                  <span className="pp-toc-num">{s.num}</span>
                  {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* ── 1. Information We Collect ── */}
          <div className="pp-card" id="collect">
            <div className="pp-card-header">
              <span className="pp-card-num">01</span>
              <h2 className="pp-card-title">Information We Collect</h2>
            </div>

            <div className="pp-sub">Personal Information You Provide</div>
            <ul className="pp-list">
              {[
                { label: "Account Information", text: "Name, email address, password, profile picture, username, role (developer / company)." },
                { label: "Profile Information", text: "Bio, headline, location, phone number, skills, languages, work experience, education, intro video URL, GitHub / LinkedIn / website links." },
                { label: "Application Data", text: "Resume / CV uploads, Google Drive links, cover letters, job applications, and communication notes." },
                { label: "Project Submissions", text: "Challenge solutions, code repositories, project descriptions." },
              ].map((item, i) => (
                <li key={i}><div className="pp-list-bullet" /><span><strong>{item.label}:</strong> {item.text}</span></li>
              ))}
            </ul>

            <div className="pp-sub">Automatically Collected Information</div>
            <ul className="pp-list">
              {[
                { label: "Usage Data", text: "Pages visited, time spent, clicks, scrolls, interactions." },
                { label: "Device & Browser", text: "IP address, browser type, operating system, device identifiers." },
                { label: "Location Data", text: "Approximate location derived from IP address." },
                { label: "Cookies & Tracking", text: "We use essential and analytics cookies (see Section 07)." },
              ].map((item, i) => (
                <li key={i}><div className="pp-list-bullet" /><span><strong>{item.label}:</strong> {item.text}</span></li>
              ))}
            </ul>

            <div className="pp-sub">Information from Third Parties</div>
            <ul className="pp-list">
              {[
                { label: "Google OAuth", text: "When you sign up with Google, we receive your name, email address, and profile picture (subject to your Google privacy settings)." },
                { label: "Google Drive (optional)", text: "If you link a Google Drive folder for job applications, we access only the files you choose to share." },
                { label: "GitHub / LinkedIn (optional)", text: "Public profile data from links you provide." },
              ].map((item, i) => (
                <li key={i}><div className="pp-list-bullet" /><span><strong>{item.label}:</strong> {item.text}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 2. How We Use Your Information ── */}
          <div className="pp-card" id="use">
            <div className="pp-card-header">
              <span className="pp-card-num">02</span>
              <h2 className="pp-card-title">How We Use Your Information</h2>
            </div>
            <ul className="pp-list">
              {[
                "Provide, operate, and improve the Service.",
                "Match developers with relevant job opportunities.",
                "Process job applications and share them with companies you apply to.",
                "Track application status (submitted, reviewed, shortlisted, rejected).",
                "Calculate profile completion scores, points, and award badges.",
                "Display leaderboards and public developer profiles (for companies).",
                "Send notifications about application updates, new jobs, or challenges.",
                "Prevent fraud, abuse, and unauthorised access.",
                "Analyse usage trends to improve user experience.",
                "Comply with legal obligations.",
              ].map((item, i) => (
                <li key={i}><div className="pp-list-bullet" /><span>{item}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 3. Legal Basis ── */}
          <div className="pp-card" id="legal-basis">
            <div className="pp-card-header">
              <span className="pp-card-num">03</span>
              <h2 className="pp-card-title">Legal Basis for Processing</h2>
            </div>
            <p>For individuals in the European Economic Area (EEA) or under Indian IT law where consent is required, we rely on:</p>
            <ul className="pp-list">
              {[
                { label: "Contract performance", text: "To provide our services under your user agreement." },
                { label: "Legitimate interests", text: "To improve our platform, prevent fraud, and market similar services." },
                { label: "Consent", text: "For optional features (e.g., Google Drive linking, non‑essential cookies)." },
                { label: "Legal obligation", text: "To comply with applicable laws." },
              ].map((item, i) => (
                <li key={i}><div className="pp-list-bullet" /><span><strong>{item.label}:</strong> {item.text}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 4. Sharing ── */}
          <div className="pp-card" id="sharing">
            <div className="pp-card-header">
              <span className="pp-card-num">04</span>
              <h2 className="pp-card-title">Sharing Your Information</h2>
            </div>
            <p>We <strong>do not sell</strong> your personal information. We share data only in these circumstances:</p>
            <ul className="pp-list">
              {[
                { label: "With Companies You Apply To", text: "Your profile (name, skills, experience, resume, etc.) is shared with that company." },
                { label: "Service Providers", text: "Supabase (database & auth), Vercel (hosting), Google Analytics. These providers are contractually bound to protect your data." },
                { label: "Legal Requirements", text: "If required by law, court order, or to protect our rights / safety." },
                { label: "Business Transfers", text: "In case of merger, acquisition, or asset sale (you will be notified)." },
                { label: "With Your Consent", text: "For any other purpose you explicitly approve." },
              ].map((item, i) => (
                <li key={i}><div className="pp-list-bullet" /><span><strong>{item.label}:</strong> {item.text}</span></li>
              ))}
            </ul>
          </div>

          {/* ── 5. Public Information ── */}
          <div className="pp-card" id="public">
            <div className="pp-card-header">
              <span className="pp-card-num">05</span>
              <h2 className="pp-card-title">Public Information</h2>
            </div>
            <ul className="pp-list">
              {[
                { label: "Developer Profiles", text: null, extra: <>Companies can view your public profile at <code className="pp-code">/candidate/[id]</code> (name, skills, experience, projects, bio).</> },
                { label: "Company Profiles", text: null, extra: <>Developers can view company profiles at <code className="pp-code">/company/[username]</code>.</> },
                { label: "Leaderboard", text: "Your points, username, and projects count are publicly visible." },
                { label: "Challenge Submissions", text: "If marked public, other users can view your project submissions." },
              ].map((item, i) => (
                <li key={i}>
                  <div className="pp-list-bullet" />
                  <span><strong>{item.label}:</strong> {item.extra ?? item.text}</span>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 14 }}>You can control what appears on your public profile by editing your profile settings.</p>
          </div>

          {/* ── 6. Retention ── */}
          <div className="pp-card" id="retention">
            <div className="pp-card-header">
              <span className="pp-card-num">06</span>
              <h2 className="pp-card-title">Data Retention</h2>
            </div>
            <p>We retain your information as long as your account is active. If you delete your account, we will delete or anonymise your personal information within <strong>30 days</strong>, except:</p>
            <ul className="pp-list">
              <li><div className="pp-list-bullet" /><span>Job applications already submitted to companies (companies may retain copies).</span></li>
              <li><div className="pp-list-bullet" /><span>Information we must keep for legal, tax, or fraud prevention purposes.</span></li>
            </ul>
          </div>

          {/* ── 7. Cookies ── */}
          <div className="pp-card" id="cookies">
            <div className="pp-card-header">
              <span className="pp-card-num">07</span>
              <h2 className="pp-card-title">Cookies & Tracking Technologies</h2>
            </div>
            <p>We use cookies and similar technologies to:</p>
            <ul className="pp-list">
              <li><div className="pp-list-bullet" /><span>Keep you logged in (session cookies).</span></li>
              <li><div className="pp-list-bullet" /><span>Remember your preferences (e.g., dark / light mode).</span></li>
              <li><div className="pp-list-bullet" /><span>Analyse traffic via Google Analytics (see Section 08).</span></li>
              <li><div className="pp-list-bullet" /><span>Prevent fraud and improve security.</span></li>
            </ul>
            <p className="pp-note">You can disable cookies in your browser settings, but some features may not work properly.</p>
          </div>

          {/* ── 8. Google Analytics ── */}
          <div className="pp-card" id="analytics">
            <div className="pp-card-header">
              <span className="pp-card-num">08</span>
              <h2 className="pp-card-title">Google Analytics</h2>
            </div>
            <p>We use Google Analytics to understand how users interact with our platform. Google Analytics collects:</p>
            <ul className="pp-list">
              <li><div className="pp-list-bullet" /><span>Pages visited, time on site, clicks, scroll depth.</span></li>
              <li><div className="pp-list-bullet" /><span>Approximate geographic location (city / country level).</span></li>
              <li><div className="pp-list-bullet" /><span>Device and browser information.</span></li>
            </ul>
            <p>Google Analytics does <strong>not</strong> collect your name, email, or other direct identifiers. You can opt out by installing the{" "}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="pp-link">
                Google Analytics Opt-out Browser Add-on
              </a>.
            </p>
          </div>

          {/* ── 9. Your Rights ── */}
          <div className="pp-card" id="rights">
            <div className="pp-card-header">
              <span className="pp-card-num">09</span>
              <h2 className="pp-card-title">Your Rights (International & Indian Law)</h2>
            </div>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="pp-list">
              {[
                { label: "Access", text: "Request a copy of your personal data." },
                { label: "Correction", text: "Update inaccurate or incomplete information." },
                { label: "Deletion", text: "Request deletion of your data (subject to legal exceptions)." },
                { label: "Restriction", text: "Limit how we use your data." },
                { label: "Portability", text: "Receive your data in a machine-readable format." },
                { label: "Objection", text: "Opt out of certain processing (e.g., direct marketing)." },
                { label: "Withdraw Consent", text: "For optional features (e.g., cookies)." },
              ].map((item, i) => (
                <li key={i}><div className="pp-list-bullet" /><span><strong>{item.label}:</strong> {item.text}</span></li>
              ))}
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:ofskilljobs@gmail.com" className="pp-link">ofskilljobs@gmail.com</a>. We will respond within <strong>30 days</strong>.</p>
          </div>

          {/* ── 10. Security ── */}
          <div className="pp-card" id="security">
            <div className="pp-card-header">
              <span className="pp-card-num">10</span>
              <h2 className="pp-card-title">Data Security</h2>
            </div>
            <p>We implement industry‑standard security measures, including:</p>
            <ul className="pp-list">
              {[
                "Encryption in transit (TLS / SSL) and at rest (Supabase).",
                "Row Level Security (RLS) policies on Supabase to prevent unauthorised access.",
                "Regular security updates and dependency scanning.",
                "Password hashing (bcrypt).",
              ].map((item, i) => (
                <li key={i}><div className="pp-list-bullet" /><span>{item}</span></li>
              ))}
            </ul>
            <p className="pp-note">No method of transmission over the internet is 100% secure. You use the Service at your own risk.</p>
          </div>

          {/* ── 11. Controller & Grievance ── */}
          <div className="pp-card" id="controller">
            <div className="pp-card-header">
              <span className="pp-card-num">11</span>
              <h2 className="pp-card-title">Data Controller & Grievance Officer (India)</h2>
            </div>
            <p>As required under Indian law (Information Technology Act, 2000 and SPDI Rules, 2011), the data controller and grievance officer for OfSkillJob is:</p>
            <div className="pp-infobox">
              <p><strong>Name:</strong> Shahid Nabi</p>
              <p><strong>Email:</strong> <a href="mailto:ofskilljobs@gmail.com" className="pp-link">ofskilljobs@gmail.com</a></p>
              <p><strong>Address:</strong> Remote, India</p>
            </div>
            <p style={{ marginTop: 14 }}>Any complaints or grievances regarding processing of personal information can be sent to the above email. We will address your concerns within <strong>30 days</strong>.</p>
          </div>

          {/* ── 12. Children ── */}
          <div className="pp-card" id="children">
            <div className="pp-card-header">
              <span className="pp-card-num">12</span>
              <h2 className="pp-card-title">Children's Privacy</h2>
            </div>
            <p>The Service is not intended for individuals under 16. We do not knowingly collect personal information from children under 16. If you believe a child has provided us with data, please contact us and we will delete it promptly.</p>
          </div>

          {/* ── 13. Third-Party Links ── */}
          <div className="pp-card" id="third-party">
            <div className="pp-card-header">
              <span className="pp-card-num">13</span>
              <h2 className="pp-card-title">Third-Party Links</h2>
            </div>
            <p>Our platform may contain links to external sites (GitHub, LinkedIn, Google Drive, etc.). We are not responsible for their privacy practices. Please review their privacy policies before sharing data.</p>
          </div>

          {/* ── 14. Changes ── */}
          <div className="pp-card" id="changes">
            <div className="pp-card-header">
              <span className="pp-card-num">14</span>
              <h2 className="pp-card-title">Changes to This Privacy Policy</h2>
            </div>
            <p>We may update this policy from time to time. We will notify you of material changes by:</p>
            <ul className="pp-list">
              <li><div className="pp-list-bullet" /><span>Posting the new policy on this page with an updated "Last updated" date.</span></li>
              <li><div className="pp-list-bullet" /><span>Sending an email to registered users (if you have provided one).</span></li>
              <li><div className="pp-list-bullet" /><span>Displaying a notice on the platform.</span></li>
            </ul>
            <p style={{ marginTop: 12 }}>Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </div>

          {/* ── 15. Governing Law ── */}
          <div className="pp-card" id="governing">
            <div className="pp-card-header">
              <span className="pp-card-num">15</span>
              <h2 className="pp-card-title">Governing Law & Dispute Resolution</h2>
            </div>
            <p>This Privacy Policy shall be governed by and construed in accordance with the laws of India. Any disputes arising under or in connection with this Policy shall be subject to the exclusive jurisdiction of the courts in India.</p>
          </div>

          {/* ── 16. Contact ── */}
          <div className="pp-card" id="contact">
            <div className="pp-card-header">
              <span className="pp-card-num">16</span>
              <h2 className="pp-card-title">Contact Us</h2>
            </div>
            <p>If you have questions, concerns, or requests regarding this Privacy Policy, please reach out:</p>
            <div className="pp-infobox">
              <p><strong>Email:</strong> <a href="mailto:ofskilljobs@gmail.com" className="pp-link">ofskilljobs@gmail.com</a></p>
              <p><strong>Website:</strong> ofskilljobs.vercel.app</p>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="pp-cta">
            <h2>Questions about your data?</h2>
            <p>We're committed to transparency. Reach out anytime and we'll respond within 30 days.</p>
            <a href="mailto:ofskilljobs@gmail.com" className="pp-cta-btn">
              ofskilljobs@gmail.com
            </a>
            <p className="pp-footer">© 2026 OfSkillJob — Show Skills. Get Hired. All rights reserved.</p>
          </div>

        </div>
      </div>
    </>
  );
}