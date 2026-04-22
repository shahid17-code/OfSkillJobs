// app/contact/page.tsx
"use client";

import { useState, useEffect } from "react";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setToast({ message: "Message sent successfully! We'll get back to you soon.", type: "success" });
        setFormData({ name: "", email: "", subject: "", message: "" });
        setStatus("success");
      } else {
        const error = await response.json();
        setToast({ message: error.message || "Something went wrong. Please try again.", type: "error" });
        setStatus("error");
      }
    } catch (err) {
      setToast({ message: "Network error. Please check your connection.", type: "error" });
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-xl backdrop-blur-md ${
              toast.type === "success"
                ? "border-green-200 bg-white/90 text-green-800"
                : "border-red-200 bg-white/90 text-red-800"
            }`}
          >
            <span className="text-xl">{toast.type === "success" ? "✓" : "⚠"}</span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">Contact Us</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            We're here to help and answer any questions you might have.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Contact Info & Quick Help */}
          <div className="space-y-8">
            {/* Contact Info Card */}
            <div className="group rounded-3xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="bg-blue-100 p-2 rounded-xl">📬</span>
                Get in Touch
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="text-2xl">📧</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                    <p className="text-gray-800 font-medium">ofskilljobs@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🌐</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Website</p>
                    <p className="text-gray-800 font-medium break-all">ofskilljobs.vercel.app</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-2xl">📍</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Location</p>
                    <p className="text-gray-800 font-medium">Remote Team (India)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Help Card */}
            <div className="group rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-lg transition-all hover:shadow-xl">
              <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">✨ Quick Help</h3>
              <p className="text-blue-100 mb-6 leading-relaxed">
                Job seekers can explore open opportunities directly from the Jobs page. Companies can manage hiring from the Company Dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/jobs"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 px-5 py-2 font-semibold backdrop-blur-sm transition hover:bg-white/30"
                >
                  Explore Jobs <span>→</span>
                </a>
                <a
                  href="/company/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 px-5 py-2 font-semibold backdrop-blur-sm transition hover:bg-white/30"
                >
                  Company Dashboard <span>→</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div className="rounded-3xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="bg-blue-100 p-2 rounded-xl">✉️</span>
              Send us a Message
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                >
                  <option value="">Select a subject</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Support">Technical Support</option>
                  <option value="Partnership">Partnership / Collaboration</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Report Issue">Report an Issue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Tell us how we can help..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 py-3 font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {status === "loading" ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center text-sm text-gray-400 border-t border-gray-200 pt-6">
          © 2026 OfSkillJob — Show Skills. Get Hired.
        </div>
      </div>
    </div>
  );
}