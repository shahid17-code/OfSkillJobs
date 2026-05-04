// app/contact/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return re.test(email);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    if (!formData.name.trim()) {
      setToast({ message: "Please enter your name", type: "error" });
      setStatus("idle");
      return;
    }
    if (!validateEmail(formData.email)) {
      setToast({ message: "Please enter a valid email address", type: "error" });
      setStatus("idle");
      return;
    }
    if (!formData.subject) {
      setToast({ message: "Please select a subject", type: "error" });
      setStatus("idle");
      return;
    }
    if (!formData.message.trim()) {
      setToast({ message: "Please enter your message", type: "error" });
      setStatus("idle");
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setToast({ message: "Message sent! We'll get back to you within 24–48 hours.", type: "success" });
        setFormData({ name: "", email: "", subject: "", message: "" });
        setStatus("success");
      } else {
        const error = await response.json();
        setToast({ message: error.message || "Something went wrong. Please try again.", type: "error" });
        setStatus("error");
      }
    } catch {
      setToast({ message: "Network error. Please check your connection.", type: "error" });
      setStatus("error");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .ct-root {
          font-family: 'DM Sans', sans-serif;
          background: #F7F6F2;
          min-height: 100vh;
          color: #1C1C1E;
        }

        /* ── Toast ── */
        .ct-toast {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 50;
          animation: slideIn 0.25s ease;
          max-width: 360px;
          width: calc(100vw - 40px);
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ct-toast-inner {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }
        .ct-toast-inner.success { border-left: 3px solid #22C55E; }
        .ct-toast-inner.error   { border-left: 3px solid #EF4444; }
        .ct-toast-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .ct-toast-dot.success { background: #22C55E; }
        .ct-toast-dot.error   { background: #EF4444; }
        .ct-toast-msg {
          font-size: 14px;
          color: #1C1C1E;
          line-height: 1.5;
        }

        /* ── Hero ── */
        .ct-hero {
          background: #0F1923;
          padding: 72px 24px 64px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .ct-hero::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .ct-hero::after {
          content: '';
          position: absolute;
          bottom: -60px; left: 5%;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,179,237,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .ct-hero-inner {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .ct-eyebrow {
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
        .ct-live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22C55E;
          display: inline-block;
        }
        .ct-hero h1 {
          font-family: 'Lora', Georgia, serif;
          font-size: clamp(34px, 5vw, 54px);
          font-weight: 700;
          color: #FAFAF8;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin: 0 0 16px;
        }
        .ct-hero h1 span { color: #F59E0B; }
        .ct-hero-sub {
          font-size: 16px;
          font-weight: 300;
          color: rgba(250,250,248,0.55);
          line-height: 1.65;
          margin: 0;
        }

        /* ── Body ── */
        .ct-body {
          max-width: 1040px;
          margin: 0 auto;
          padding: 48px 24px 80px;
        }

        /* ── 2-col grid ── */
        .ct-grid {
          display: grid;
          grid-template-columns: 1fr 1.45fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 760px) {
          .ct-grid { grid-template-columns: 1fr; }
        }

        /* ── Left column stack ── */
        .ct-left { display: flex; flex-direction: column; gap: 16px; }

        /* ── Cards ── */
        .ct-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 28px 30px;
        }
        .ct-card-dark {
          background: #0F1923;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 28px 30px;
        }

        /* ── Section label ── */
        .ct-section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #F59E0B;
          margin-bottom: 16px;
          display: block;
        }

        /* ── Contact info rows ── */
        .ct-info-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 0;
          border-bottom: 1px solid #F3F1EC;
        }
        .ct-info-row:first-of-type { padding-top: 0; }
        .ct-info-row:last-of-type  { border-bottom: none; padding-bottom: 0; }
        .ct-info-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #9CA3AF;
        }
        .ct-info-value {
          font-size: 15px;
          font-weight: 500;
          color: #0F1923;
        }

        /* ── Trust card items ── */
        .ct-trust-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 10px;
        }
        .ct-trust-item:last-child { margin-bottom: 0; }
        .ct-trust-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22C55E;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .ct-trust-text {
          font-size: 13.5px;
          color: rgba(250,250,248,0.80);
          line-height: 1.55;
        }
        .ct-card-dark .ct-section-label { color: #F59E0B; }

        /* ── Quick links ── */
        .ct-quicklink {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid #F3F1EC;
          text-decoration: none;
          color: #4A4A52;
          font-size: 14px;
          font-weight: 400;
          transition: color 0.15s;
        }
        .ct-quicklink:last-child { border-bottom: none; }
        .ct-quicklink:hover { color: #0F1923; }
        .ct-quicklink:hover .ct-quicklink-arrow { transform: translateX(3px); }
        .ct-quicklink-arrow {
          margin-left: auto;
          font-size: 12px;
          color: #C0BAB0;
          transition: transform 0.15s;
        }
        .ct-quicklink-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #F59E0B;
          flex-shrink: 0;
        }

        /* ── Form card ── */
        .ct-form-card {
          background: #FFFFFF;
          border: 1px solid #E8E6E0;
          border-radius: 16px;
          padding: 32px 36px;
        }
        @media (max-width: 600px) {
          .ct-form-card { padding: 24px 22px; }
          .ct-card, .ct-card-dark { padding: 24px 22px; }
        }

        .ct-form-card h2 {
          font-family: 'Lora', Georgia, serif;
          font-size: 22px;
          font-weight: 600;
          color: #0F1923;
          letter-spacing: -0.01em;
          margin: 0 0 6px;
        }
        .ct-form-sub {
          font-size: 14px;
          color: #9CA3AF;
          margin: 0 0 28px;
        }

        /* ── Form fields ── */
        .ct-field { margin-bottom: 18px; }
        .ct-field:last-of-type { margin-bottom: 0; }

        .ct-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #0F1923;
          margin-bottom: 7px;
        }
        .ct-req {
          color: #F59E0B;
          margin-left: 2px;
        }

        .ct-input, .ct-select, .ct-textarea {
          width: 100%;
          background: #F7F6F2;
          border: 1.5px solid #E8E6E0;
          border-radius: 10px;
          padding: 12px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 400;
          color: #1C1C1E;
          outline: none;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          box-sizing: border-box;
          appearance: none;
          -webkit-appearance: none;
        }
        .ct-input::placeholder, .ct-textarea::placeholder {
          color: #C0BAB0;
        }
        .ct-input:focus, .ct-select:focus, .ct-textarea:focus {
          border-color: #F59E0B;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.12);
        }
        .ct-select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 38px;
          cursor: pointer;
        }
        .ct-select option { font-family: 'DM Sans', sans-serif; }
        .ct-textarea { resize: none; }

        /* ── Submit button ── */
        .ct-submit {
          width: 100%;
          background: #0F1923;
          color: #FAFAF8;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          padding: 14px 24px;
          border-radius: 100px;
          border: none;
          cursor: pointer;
          margin-top: 22px;
          transition: background 0.2s, transform 0.15s;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .ct-submit:hover:not(:disabled) {
          background: #F59E0B;
          color: #0F1923;
          transform: translateY(-1px);
        }
        .ct-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* ── Spinner ── */
        .ct-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #FAFAF8;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Footer ── */
        .ct-footer {
          border-top: 1px solid #E8E6E0;
          margin-top: 56px;
          padding-top: 24px;
          text-align: center;
          font-size: 12px;
          color: #C0BAB0;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="ct-root">

        {/* ── Toast ── */}
        {toast && (
          <div className="ct-toast">
            <div className={`ct-toast-inner ${toast.type}`}>
              <div className={`ct-toast-dot ${toast.type}`} />
              <span className="ct-toast-msg">{toast.message}</span>
            </div>
          </div>
        )}

        {/* ── Hero ── */}
        <div className="ct-hero">
          <div className="ct-hero-inner">
            <div className="ct-eyebrow">
              <span className="ct-live-dot" />
              We respond in 24–48 hrs
            </div>
            <h1>Let's <span>talk</span></h1>
            <p className="ct-hero-sub">
              Questions, feedback, or partnership ideas — we'd love to hear from you.
              Fill the form or reach out directly.
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="ct-body">
          <div className="ct-grid">

            {/* ── Left column ── */}
            <div className="ct-left">

              {/* Contact info */}
              <div className="ct-card">
                <span className="ct-section-label">Reach us directly</span>
                <div className="ct-info-row">
                  <span className="ct-info-label">Email</span>
                  <span className="ct-info-value">ofskilljobs@gmail.com</span>
                </div>
                <div className="ct-info-row">
                  <span className="ct-info-label">Website</span>
                  <span className="ct-info-value">ofskilljobs.vercel.app</span>
                </div>
                <div className="ct-info-row">
                  <span className="ct-info-label">Location</span>
                  <span className="ct-info-value">Remote team · India</span>
                </div>
              </div>

              {/* Trust */}
              <div className="ct-card-dark">
                <span className="ct-section-label">Your data is safe</span>
                {[
                  "Your message goes directly to us — no third parties.",
                  "We never sell or share your contact details.",
                  "We reply within 24–48 hours, always.",
                ].map((item, i) => (
                  <div className="ct-trust-item" key={i}>
                    <div className="ct-trust-dot" />
                    <span className="ct-trust-text">{item}</span>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div className="ct-card">
                <span className="ct-section-label">Quick links</span>
                {[
                  { href: "/jobs",               label: "Browse jobs"        },
                  { href: "/company/dashboard",  label: "Company dashboard"  },
                  { href: "/privacy",            label: "Privacy policy"     },
                ].map((link) => (
                  <Link href={link.href} key={link.href} className="ct-quicklink">
                    <div className="ct-quicklink-dot" />
                    {link.label}
                    <span className="ct-quicklink-arrow">›</span>
                  </Link>
                ))}
              </div>

            </div>

            {/* ── Right column: Form ── */}
            <div className="ct-form-card">
              <h2>Send a message</h2>
              <p className="ct-form-sub">All fields are required.</p>

              <form onSubmit={handleSubmit} noValidate>

                <div className="ct-field">
                  <label className="ct-label">Your name <span className="ct-req">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Shahid Nabi"
                    className="ct-input"
                  />
                </div>

                <div className="ct-field">
                  <label className="ct-label">Email address <span className="ct-req">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="ct-input"
                  />
                </div>

                <div className="ct-field">
                  <label className="ct-label">Subject <span className="ct-req">*</span></label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="ct-select"
                  >
                    <option value="">Select a subject</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Support">Technical Support</option>
                    <option value="Partnership">Partnership / Collaboration</option>
                    <option value="Feedback">Feedback</option>
                    <option value="Report Issue">Report an Issue</option>
                  </select>
                </div>

                <div className="ct-field">
                  <label className="ct-label">Message <span className="ct-req">*</span></label>
                  <textarea
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us how we can help…"
                    className="ct-textarea"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="ct-submit"
                >
                  {status === "loading" ? (
                    <><div className="ct-spinner" /> Sending…</>
                  ) : (
                    "Send Message"
                  )}
                </button>

              </form>
            </div>

          </div>

          <div className="ct-footer">
            © 2026 OfSkillJob — Show Skills. Get Hired.
          </div>
        </div>
      </div>
    </>
  );
}