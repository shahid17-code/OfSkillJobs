// app/contact/success/page.tsx
import Link from "next/link";

export default function ContactSuccess() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .cs-root {
          font-family: 'DM Sans', sans-serif;
          background: #F7F6F2;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .cs-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 20px;
          padding: 52px 44px;
          text-align: center;
          max-width: 440px;
          width: 100%;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 480px) {
          .cs-card { padding: 40px 28px; }
        }

        /* Subtle amber glow top */
        .cs-card::before {
          content: '';
          position: absolute;
          top: -60px; left: 50%;
          transform: translateX(-50%);
          width: 260px; height: 120px;
          background: radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Icon ring ── */
        .cs-icon-wrap {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px; height: 72px;
          background: #0F1923;
          border-radius: 50%;
          margin-bottom: 28px;
        }
        .cs-icon-wrap svg {
          width: 32px; height: 32px;
        }

        /* Pulsing ring */
        .cs-icon-wrap::after {
          content: '';
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          border: 1.5px solid rgba(245,158,11,0.30);
          animation: pulse-ring 2.4s ease infinite;
        }
        @keyframes pulse-ring {
          0%   { opacity: 1;   transform: scale(1); }
          60%  { opacity: 0;   transform: scale(1.3); }
          100% { opacity: 0;   transform: scale(1.3); }
        }

        .cs-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(34,197,94,0.10);
          border: 1px solid rgba(34,197,94,0.22);
          color: #16A34A;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 100px;
          margin-bottom: 20px;
        }
        .cs-green-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22C55E;
          display: inline-block;
        }

        .cs-card h1 {
          font-family: 'Lora', Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: #0F1923;
          letter-spacing: -0.02em;
          margin: 0 0 12px;
        }

        .cs-card p {
          font-size: 15px;
          font-weight: 400;
          color: #6B7280;
          line-height: 1.70;
          margin: 0 0 32px;
        }

        /* ── What happens next list ── */
        .cs-steps {
          background: #F7F6F2;
          border: 1px solid #E8E6E0;
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 32px;
          text-align: left;
        }
        .cs-steps-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: #F59E0B;
          margin-bottom: 12px;
          display: block;
        }
        .cs-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 7px 0;
          border-bottom: 1px solid #EEECE6;
          font-size: 13.5px;
          color: #4A4A52;
          line-height: 1.55;
        }
        .cs-step:last-child { border-bottom: none; padding-bottom: 0; }
        .cs-step:first-child { padding-top: 0; }
        .cs-step-num {
          font-size: 11px;
          font-weight: 700;
          color: #C0BAB0;
          flex-shrink: 0;
          margin-top: 2px;
          font-variant-numeric: tabular-nums;
          min-width: 18px;
        }

        /* ── Buttons ── */
        .cs-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #0F1923;
          color: #FAFAF8;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px;
          font-weight: 600;
          padding: 13px 28px;
          border-radius: 100px;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
          width: 100%;
          box-sizing: border-box;
          letter-spacing: 0.01em;
        }
        .cs-btn-primary:hover {
          background: #F59E0B;
          color: #0F1923;
          transform: translateY(-1px);
        }

        .cs-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: transparent;
          color: #6B7280;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          padding: 12px 24px;
          border-radius: 100px;
          border: 1.5px solid #E8E6E0;
          text-decoration: none;
          margin-top: 10px;
          transition: border-color 0.18s, color 0.18s;
          width: 100%;
          box-sizing: border-box;
        }
        .cs-btn-secondary:hover {
          border-color: #0F1923;
          color: #0F1923;
        }

        .cs-footer-note {
          font-size: 12px;
          color: #C0BAB0;
          margin-top: 24px;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="cs-root">
        <div className="cs-card">

          {/* Icon */}
          <div className="cs-icon-wrap">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="16" fill="#0F1923" />
              <path
                d="M7 16l5.5 5.5L25 10"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Eyebrow */}
          <div className="cs-eyebrow">
            <span className="cs-green-dot" />
            Message received
          </div>

          <h1>You're all set.</h1>

          <p>
            Thanks for reaching out to OfSkillJob. We've received your message and
            will get back to you within <strong style={{ color: '#0F1923' }}>24–48 hours</strong>.
          </p>

          {/* What happens next */}
          <div className="cs-steps">
            <span className="cs-steps-label">What happens next</span>
            <div className="cs-step">
              <span className="cs-step-num">01</span>
              <span>We review your message and assign it to the right person.</span>
            </div>
            <div className="cs-step">
              <span className="cs-step-num">02</span>
              <span>You'll receive a reply at the email address you provided.</span>
            </div>
            <div className="cs-step">
              <span className="cs-step-num">03</span>
              <span>For urgent matters, email us directly at ofskilljobs@gmail.com.</span>
            </div>
          </div>

          {/* Actions */}
          <Link href="/" className="cs-btn-primary">
            Return Home
          </Link>
          <Link href="/jobs" className="cs-btn-secondary">
            Browse Jobs
          </Link>

          <p className="cs-footer-note">© 2026 OfSkillJob — Show Skills. Get Hired.</p>
        </div>
      </div>
    </>
  );
}