"use client";

import { useEffect, useRef } from "react";

export default function BlogScripts() {
  // Store created elements for cleanup
  const createdElements = useRef<HTMLElement[]>([]);
  const observers = useRef<{ fadeObs?: IntersectionObserver; tocObs?: IntersectionObserver; statObs?: IntersectionObserver }>({});
  const eventListeners = useRef<{ scrollProgress?: () => void; scrollBtt?: () => void }>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      /* ─────────────────────────────────────────────
         1. READING PROGRESS BAR
      ───────────────────────────────────────────── */
      const bar = document.createElement("div");
      bar.id = "blog-progress-bar";
      Object.assign(bar.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "0%",
        height: "3px",
        background: "linear-gradient(90deg, #F59E0B 0%, #FCD34D 50%, #F59E0B 100%)",
        backgroundSize: "200% 100%",
        zIndex: "99999",
        transition: "width 0.15s ease-out",
        boxShadow: "0 0 8px rgba(245,158,11,0.60), 0 0 2px rgba(245,158,11,0.30)",
        animation: "shimmer-bar 2s linear infinite",
      });
      document.body.appendChild(bar);
      createdElements.current.push(bar);

      // shimmer keyframe
      if (!document.getElementById("blog-scripts-keyframes")) {
        const kf = document.createElement("style");
        kf.id = "blog-scripts-keyframes";
        kf.textContent = `
          @keyframes shimmer-bar {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes blob-pulse {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.10; }
            50%       { transform: scale(1.08) rotate(6deg); opacity: 0.15; }
          }
          @keyframes float-stat {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-4px); }
          }
          @keyframes count-up {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-slide-up {
            from { opacity: 0; transform: translateY(28px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-slide-right {
            from { opacity: 0; transform: translateX(-20px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
            50%       { box-shadow: 0 0 0 6px rgba(245,158,11,0.12); }
          }
          @keyframes dot-ping {
            0%   { transform: scale(1); opacity: 1; }
            70%  { transform: scale(2.2); opacity: 0; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          @keyframes hero-float {
            0%, 100% { transform: translateY(0) scale(1); }
            50%       { transform: translateY(-8px) scale(1.02); }
          }
          .section-visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
          }
          .toc-active {
            color: #F59E0B !important;
            padding-left: 8px !important;
            border-left: 2px solid #F59E0B !important;
          }
          .toc-link {
            transition: color 0.2s ease, padding-left 0.2s ease, border-left 0.2s ease !important;
          }
          .blog-share-btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
          }
          .back-to-top {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease, transform 0.3s ease !important;
          }
          .back-to-top.visible {
            opacity: 1 !important;
            pointer-events: all !important;
          }
          .hero-stat-animated {
            animation: float-stat 3s ease-in-out infinite;
          }
          .hero-stat-animated:nth-child(2) { animation-delay: 0.4s; }
          .hero-stat-animated:nth-child(3) { animation-delay: 0.8s; }
          .hero-stat-animated:nth-child(4) { animation-delay: 1.2s; }
        `;
        document.head.appendChild(kf);
        createdElements.current.push(kf);
      }

      const updateProgress = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = Math.min(100, (scrollTop / Math.max(1, docHeight)) * 100);
        bar.style.width = pct + "%";
      };
      window.addEventListener("scroll", updateProgress, { passive: true });
      eventListeners.current.scrollProgress = updateProgress;
      updateProgress();

      /* ─────────────────────────────────────────────
         2. INTERSECTION OBSERVER — SECTION FADE-IN
      ───────────────────────────────────────────── */
      const fadeTargets = document.querySelectorAll(
        "#blogArticle .post-section, #blogArticle .post-intro, " +
        "#blogArticle .post-callout, #blogArticle .pull-quote, " +
        "#blogArticle .stat-callout, #blogArticle .cta-banner, " +
        "#blogArticle .key-rule, #blogArticle .process-flow, " +
        "#blogArticle .post-table-wrap, #blogArticle .post-timeline, " +
        "#blogArticle .related-posts-section, #blogArticle .tldr-box"
      );

      const fadeObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add("section-visible");
              fadeObs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.07, rootMargin: "0px 0px -40px 0px" }
      );
      fadeTargets.forEach((el) => fadeObs.observe(el));
      observers.current.fadeObs = fadeObs;

      /* ─────────────────────────────────────────────
         3. DYNAMIC TOC GENERATION
      ───────────────────────────────────────────── */
      const tocContainer = document.getElementById("dynamic-toc");
      if (tocContainer) {
        const sections = Array.from(
          document.querySelectorAll("#blogArticle .post-section[id]")
        );
        tocContainer.innerHTML = "";
        sections.forEach((section) => {
          const h2 = section.querySelector("h2");
          const title = h2 ? h2.textContent : "Section";
          const a = document.createElement("a");
          a.href = "#" + section.id;
          a.className = "toc-link";
          a.innerHTML = `<div class="toc-dot"></div><span>${title}</span>`;
          a.addEventListener("click", (e) => {
            e.preventDefault();
            const target = document.getElementById(section.id);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          });
          tocContainer.appendChild(a);
        });
        if (sections.length === 0) {
          tocContainer.innerHTML = '<span style="color:#94a3b8; font-size:13px;">No headings found</span>';
        }
      }

      /* ─────────────────────────────────────────────
         4. ACTIVE TOC HIGHLIGHTING
      ───────────────────────────────────────────── */
      const articleSections = document.querySelectorAll("#blogArticle .post-section[id]");
      const tocObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              document.querySelectorAll(".toc-link").forEach((l) =>
                l.classList.remove("toc-active")
              );
              const active = document.querySelector(
                `.toc-link[href="#${entry.target.id}"]`
              );
              if (active) active.classList.add("toc-active");
            }
          });
        },
        { rootMargin: "-20% 0px -65% 0px" }
      );
      articleSections.forEach((section) => tocObs.observe(section));
      observers.current.tocObs = tocObs;

      /* ─────────────────────────────────────────────
         5. HERO STAT COUNTER ANIMATION
      ───────────────────────────────────────────── */
      const statNums = document.querySelectorAll(".blog-hero-stat-num");
      const statObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement;
              el.style.animation = "count-up 0.5s ease forwards";
              statObs.unobserve(el);
            }
          });
        },
        { threshold: 0.5 }
      );
      statNums.forEach((el) => statObs.observe(el));
      observers.current.statObs = statObs;

      /* ─────────────────────────────────────────────
         6. BACK TO TOP BUTTON
      ───────────────────────────────────────────── */
      const btt = document.createElement("button");
      btt.className = "back-to-top";
      btt.setAttribute("aria-label", "Back to top");
      btt.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 13V5M9 5L5 9M9 5l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      Object.assign(btt.style, {
        position: "fixed",
        bottom: "28px",
        right: "24px",
        zIndex: "9998",
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        background: "#0F1923",
        color: "#F59E0B",
        border: "1px solid rgba(245,158,11,0.25)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        transform: "translateY(8px)",
      });
      btt.addEventListener("click", () =>
        window.scrollTo({ top: 0, behavior: "smooth" })
      );
      document.body.appendChild(btt);
      createdElements.current.push(btt);

      const toggleBackToTop = () => {
        if (window.scrollY > 400) btt.classList.add("visible");
        else btt.classList.remove("visible");
      };
      window.addEventListener("scroll", toggleBackToTop, { passive: true });
      eventListeners.current.scrollBtt = toggleBackToTop;
      toggleBackToTop();

      /* ─────────────────────────────────────────────
         7. SHARE BUTTON ACTIONS
      ───────────────────────────────────────────── */
      document.querySelectorAll("[data-share]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const platform = (btn as HTMLElement).dataset.share;
          const url = encodeURIComponent(window.location.href);
          const title = encodeURIComponent(document.title);
          if (platform === "twitter") {
            window.open(`https://twitter.com/intent/tweet?url=${url}&text=${title}`, "_blank");
          } else if (platform === "linkedin") {
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
          } else if (platform === "copy") {
            navigator.clipboard.writeText(window.location.href).then(() => {
              const el = btn as HTMLElement;
              const orig = el.textContent;
              el.textContent = "Copied!";
              setTimeout(() => { el.textContent = orig; }, 2000);
            });
          }
        });
      });

      /* ─────────────────────────────────────────────
         8. HERO STAT FLOAT ANIMATION
      ───────────────────────────────────────────── */
      document.querySelectorAll(".blog-hero-stat").forEach((el) => {
        el.classList.add("hero-stat-animated");
      });

      /* ─────────────────────────────────────────────
         9. SMOOTH HOVER ON CALLOUT CARDS
      ───────────────────────────────────────────── */
      document.querySelectorAll(".post-callout, .pull-quote, .key-rule, .stat-callout").forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.transition = "transform 0.25s ease, box-shadow 0.25s ease";
        htmlEl.addEventListener("mouseenter", () => {
          htmlEl.style.transform = "translateY(-2px)";
          htmlEl.style.boxShadow = "0 8px 28px rgba(15,25,35,0.08)";
        });
        htmlEl.addEventListener("mouseleave", () => {
          htmlEl.style.transform = "translateY(0)";
          htmlEl.style.boxShadow = "";
        });
      });

      /* ─────────────────────────────────────────────
         10. READING TIME ESTIMATOR
      ───────────────────────────────────────────── */
      const article = document.getElementById("blogArticle");
      const readTimeEl = document.getElementById("live-read-time");
      if (article && readTimeEl) {
        const wordCount = (article.textContent || "").split(/\s+/).filter(Boolean).length;
        const mins = Math.max(1, Math.ceil(wordCount / 220));
        readTimeEl.textContent = `${mins} min read`;
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      // Remove scroll event listeners
      if (eventListeners.current.scrollProgress) {
        window.removeEventListener("scroll", eventListeners.current.scrollProgress);
      }
      if (eventListeners.current.scrollBtt) {
        window.removeEventListener("scroll", eventListeners.current.scrollBtt);
      }
      // Disconnect observers
      if (observers.current.fadeObs) observers.current.fadeObs.disconnect();
      if (observers.current.tocObs) observers.current.tocObs.disconnect();
      if (observers.current.statObs) observers.current.statObs.disconnect();
      // Remove DOM elements
      createdElements.current.forEach((el) => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      createdElements.current = [];
      observers.current = {};
      eventListeners.current = {};
    };
  }, []);

  return null;
}