"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [companyUsername, setCompanyUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Notification states
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  // Fetch notifications for the current user
  async function fetchNotifications(userId) {
    if (!userId) return;
    const { count, error: countError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (!countError) setUnreadCount(count || 0);

    const { data, error } = await supabase
      .from("notifications")
      .select("*, from_user:from_user_id ( full_name, username ), capsule: capsule_id ( title )")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (!error) setNotifications(data || []);
  }

  // Load user and fetch notifications
  async function loadUser(currentUser) {
    try {
      setUser(currentUser);
      if (currentUser) {
        const { data, error } = await supabase
          .from("users")
          .select("role, username")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (error) console.log("Navbar fetch error:", error);
        if (!data || !data.role) {
          const savedRole = localStorage.getItem("selectedRole") || "developer";
          await supabase.from("users").upsert({
            id: currentUser.id,
            email: currentUser.email,
            role: savedRole,
          });
          setRole(savedRole);
          setCompanyUsername(null);
        } else {
          setRole(data.role);
          setCompanyUsername(data.username || null);
        }
        await fetchNotifications(currentUser.id);
      } else {
        setRole(null);
        setCompanyUsername(null);
        setUnreadCount(0);
        setNotifications([]);
      }
    } catch (err) {
      console.log("Navbar error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function refreshUser() {
      const { data: { user } } = await supabase.auth.getUser();
      await loadUser(user);
    }
    refreshUser();
  }, [pathname]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      await loadUser(user);
    }
    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      loadUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new;
          setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    setMobileMenuOpen(false);
  }

  function go(path) {
    router.push(path);
    setMobileMenuOpen(false);
    setShowNotifications(false);
  }

  function isActive(path) {
    return pathname === path;
  }

  // Mark all notifications as read when opening the dropdown
  async function markAllAsRead() {
    if (unreadCount === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setUnreadCount(0);
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }

  function toggleNotifications() {
    if (!showNotifications) {
      markAllAsRead();
    }
    setShowNotifications(!showNotifications);
  }

  // ── Nav links per role ───────────────────────────────────────────
  function getNavLinks() {
    if (loading) return [];
    if (!user) return [
      { label: "Home", path: "/" },
      { label: "Showfloor", path: "/the-stage" },
      { label: "Jobs", path: "/jobs" },
      { label: "Forges", path: "/skill-forges" },
      { label: "Blog", path: "/blog" },
    ];
    if (role === "developer") return [
      { label: "Home", path: "/" },
      { label: "Jobs", path: "/jobs" },
      { label: "Applications", path: `/applications/${user?.id}` },
      { label: "Showfloor", path: "/the-stage" },
      { label: "Forges", path: "/skill-forges" },
      { label: "Roster", path: "/leaderboard" },
      { label: "Blog", path: "/blog" },
      { label: "Profile", path: "/profile" },
    ];
    if (role === "company") return [
      { label: "Home", path: "/" },
      { label: "Profile", path: companyUsername ? `/company/${companyUsername}` : "/company/profile/edit" },
      { label: "Dashboard", path: "/company/dashboard" },
      { label: "Foundry", path: "/company/foundry" },
      { label: "Showfloor", path: "/the-stage" },
      { label: "Forges", path: "/skill-forges" },
      { label: "Blog", path: "/blog" },
    ];
    return [];
  }

  // ── Bottom tabs per role ─────────────────────────────────────────
  function getBottomTabs() {
    if (!user) return [
      { label: "Home", icon: "🏠", path: "/" },
      { label: "Jobs", icon: "💼", path: "/jobs" },
      { label: "Showfloor", icon: "🎪", path: "/the-stage" },
      { label: "Forges", icon: "⚙️", path: "/skill-forges" },
    ];
    if (role === "developer") return [
      { label: "Home", icon: "🏠", path: "/" },
      { label: "Jobs", icon: "💼", path: "/jobs" },
      { label: "Showfloor", icon: "🎪", path: "/the-stage" },
      { label: "Forges", icon: "⚙️", path: "/skill-forges" },
      { label: "Profile", icon: "👤", path: "/profile" },
    ];
    if (role === "company") return [
      { label: "Home", icon: "🏠", path: "/" },
      { label: "Dashboard", icon: "📊", path: "/company/dashboard" },
      { label: "Post Job", icon: "➕", path: "/company/jobs/new" },
    ];
    return [];
  }

  // ── Icon map for drawer ──────────────────────────────────────────
  const iconMap = {
    "/": "🏠",
    "/jobs": "💼",
    "/the-stage": "🎪",
    "/skill-forges": "⚙️",
    "/blog": "📝",
    "/profile": "👤",
    "/leaderboard": "🏆",
    "/company/dashboard": "📊",
    "/company/foundry": "🔬",
    "/notifications": "🔔",
  };
  if (user?.id) iconMap[`/applications/${user.id}`] = "📋";

  const navLinks = getNavLinks();
  const bottomTabs = getBottomTabs();

  return (
    <>
      <style>{`
        .nb-root *, .nb-root *::before, .nb-root *::after { box-sizing: border-box; }

        .nb-root {
          position: sticky;
          top: 0;
          z-index: 1000;
          font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
        }
        .nb-bar {
          background: rgba(10, 15, 28, 0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: box-shadow .25s ease;
        }
        .nb-bar.scrolled {
          box-shadow: 0 4px 32px rgba(0,0,0,0.4);
        }
        .nb-inner {
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 20px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        /* Logo */
        .nb-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .nb-logo img {
          width: 32px; height: 32px;
          border-radius: 9px;
          box-shadow: 0 4px 12px rgba(37,99,235,.4);
        }
        .nb-logo-text {
          font-size: 18px;
          font-weight: 900;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.04em;
        }

        /* Role pill */
        .nb-role-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .nb-role-pill.company {
          background: rgba(16,185,129,.15);
          border: 1px solid rgba(16,185,129,.3);
          color: #34d399;
        }
        .nb-role-pill.developer {
          background: rgba(99,102,241,.15);
          border: 1px solid rgba(99,102,241,.3);
          color: #a5b4fc;
        }
        .nb-role-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          animation: nbPulse 2s infinite;
        }
        .nb-role-pill.company .nb-role-dot { background: #34d399; }
        .nb-role-pill.developer .nb-role-dot { background: #a5b4fc; }

        /* Desktop nav links */
        .nb-links {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          justify-content: center;
        }
        .nb-link {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 7px 12px;
          font-size: 13.5px;
          font-weight: 600;
          border-radius: 10px;
          transition: color .15s, background .15s;
          white-space: nowrap;
          position: relative;
        }
        .nb-link:hover {
          color: #e2e8f0;
          background: rgba(255,255,255,.06);
        }
        .nb-link.active {
          color: #ffffff;
          background: rgba(255,255,255,.1);
          font-weight: 700;
        }
        .nb-link.active::after {
          content: '';
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px; height: 2px;
          background: linear-gradient(90deg, #2563eb, #7c3aed);
          border-radius: 999px;
        }

        /* Desktop action buttons */
        .nb-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .nb-btn {
          border: none;
          cursor: pointer;
          font-size: 13.5px;
          font-weight: 700;
          border-radius: 11px;
          padding: 8px 16px;
          transition: transform .15s, box-shadow .15s, opacity .15s;
          white-space: nowrap;
        }
        .nb-btn:hover { transform: translateY(-1px); }
        .nb-btn:active { transform: scale(.97); opacity: .9; }

        .nb-btn-ghost {
          background: transparent;
          border: 1px solid rgba(255,255,255,.12);
          color: #cbd5e1;
        }
        .nb-btn-ghost:hover { background: rgba(255,255,255,.08); color: white; border-color: rgba(255,255,255,.22); }

        .nb-btn-primary {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          box-shadow: 0 4px 14px rgba(37,99,235,.35);
        }
        .nb-btn-primary:hover { box-shadow: 0 6px 20px rgba(37,99,235,.5); }

        .nb-btn-post {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #0f172a;
          box-shadow: 0 4px 14px rgba(245,158,11,.3);
          font-weight: 800;
        }
        .nb-btn-post:hover { box-shadow: 0 6px 20px rgba(245,158,11,.45); }

        .nb-btn-logout {
          background: transparent;
          border: 1px solid rgba(239,68,68,.3);
          color: #f87171;
        }
        .nb-btn-logout:hover { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.5); }

        /* Notification bell */
        .nb-notif-wrapper {
          display: flex;
          align-items: center;
          position: relative;
          flex-shrink: 0;
        }
        .nb-notif-btn {
          position: relative;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 22px;
          padding: 4px 6px;
          border-radius: 12px;
          transition: background .15s;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nb-notif-btn:hover { background: rgba(255,255,255,.06); color: white; }
        .nb-notif-badge {
          position: absolute;
          top: -2px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 800;
          border-radius: 50%;
          min-width: 18px;
          padding: 2px 5px;
          text-align: center;
          line-height: 1.2;
          border: 2px solid rgba(10,15,28,0.8);
          pointer-events: none;
          box-shadow: 0 2px 6px rgba(239,68,68,0.4);
        }

        /* Notification dropdown – fixed width issues */
        .nb-notif-dropdown {
          position: absolute;
          top: 44px;
          right: 0;
          min-width: 320px;
          max-width: 400px;
          width: auto;
          max-height: 420px;
          overflow-y: auto;
          background: rgba(15, 23, 42, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7);
          z-index: 1001;
          padding: 8px 0;
          display: none;
          opacity: 0;
          transform: translateY(-8px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .nb-notif-dropdown.open {
          display: block;
          opacity: 1;
          transform: translateY(0);
        }
        .nb-notif-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 16px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nb-notif-title {
          font-size: 14px;
          font-weight: 800;
          color: white;
        }
        .nb-notif-view-all {
          font-size: 12px;
          color: #60a5fa;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }
        .nb-notif-view-all:hover { color: #93c5fd; }
        .nb-notif-item {
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.12s;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .nb-notif-item:hover { background: rgba(255,255,255,0.06); }
        .nb-notif-item.unread { border-left: 3px solid #2563eb; }
        .nb-notif-msg {
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.5;
          word-break: break-word; /* prevents long words from breaking layout */
        }
        .nb-notif-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          font-size: 11px;
          color: #64748b;
          flex-wrap: wrap;
          gap: 4px;
        }
        .nb-notif-type {
          text-transform: uppercase;
          font-weight: 700;
        }
        .nb-notif-type.spotlight { color: #f59e0b; }
        .nb-notif-type.call { color: #10b981; }
        .nb-notif-empty {
          padding: 30px 16px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }

        /* Hamburger */
        .nb-hamburger {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 24px;
          height: 18px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
          margin-left: 4px;
        }
        .nb-hline {
          width: 100%; height: 2px;
          background: #94a3b8;
          border-radius: 999px;
          transition: all .22s ease;
          display: block;
        }
        .nb-hamburger:hover .nb-hline { background: white; }
        .open-1 { transform: rotate(45deg) translate(5px, 5px); background: white; }
        .open-2 { opacity: 0; transform: scaleX(0); }
        .open-3 { transform: rotate(-45deg) translate(5px, -5px); background: white; }

        /* Mobile drawer */
        .nb-drawer {
          position: fixed;
          top: 60px; left: 0; right: 0; bottom: 0;
          background: rgba(8,12,22,.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow-y: auto;
          transform: translateX(100%);
          transition: transform .28s cubic-bezier(.4,0,.2,1);
          z-index: 999;
          border-top: 1px solid rgba(255,255,255,.06);
        }
        .nb-drawer.open { transform: translateX(0); }
        .nb-drawer-inner {
          padding: 20px 20px 120px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .nb-drawer-section {
          font-size: 10px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          padding: 16px 8px 8px;
        }
        .nb-drawer-link {
          display: flex;
          align-items: center;
          gap: 12px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 13px 12px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 14px;
          text-align: left;
          width: 100%;
          transition: background .15s, color .15s;
        }
        .nb-drawer-link:hover { background: rgba(255,255,255,.07); color: white; }
        .nb-drawer-link.active { background: rgba(37,99,235,.15); color: #93c5fd; }
        .nb-drawer-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .nb-drawer-link.active .nb-drawer-icon { background: rgba(37,99,235,.2); }
        .nb-drawer-arrow { margin-left: auto; color: #334155; font-size: 14px; }

        .nb-drawer-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          border: none;
          cursor: pointer;
          padding: 14px;
          font-size: 15px;
          font-weight: 800;
          border-radius: 16px;
          margin-top: 6px;
          transition: transform .15s, opacity .15s;
        }
        .nb-drawer-btn:active { transform: scale(.97); opacity: .9; }
        .nb-drawer-btn-primary { background: linear-gradient(135deg,#2563eb,#1d4ed8); color: white; box-shadow: 0 6px 18px rgba(37,99,235,.3); }
        .nb-drawer-btn-ghost { background: rgba(255,255,255,.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,.1); }
        .nb-drawer-btn-post { background: linear-gradient(135deg,#f59e0b,#d97706); color: #0f172a; box-shadow: 0 6px 18px rgba(245,158,11,.3); }
        .nb-drawer-btn-logout { background: rgba(239,68,68,.12); color: #fca5a5; border: 1px solid rgba(239,68,68,.25); }

        /* Bottom tab bar */
        .nb-bottom-bar {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: rgba(10,15,28,.97);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid rgba(255,255,255,.08);
          z-index: 998;
          padding: 6px 0;
        }
        .nb-bottom-inner {
          display: flex;
          justify-content: space-around;
          align-items: stretch;
          max-width: 480px;
          margin: 0 auto;
        }
        .nb-tab-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex: 1;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px 4px;
          border-radius: 12px;
          transition: all .15s ease;
          color: #475569;
          position: relative;
        }
        .nb-tab-btn:active { transform: scale(.93); }
        .nb-tab-btn.active { color: #3b82f6; }
        .nb-tab-indicator {
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 20px; height: 2.5px;
          background: linear-gradient(90deg,#2563eb,#7c3aed);
          border-radius: 0 0 999px 999px;
          opacity: 0;
          transition: opacity .2s;
        }
        .nb-tab-btn.active .nb-tab-indicator { opacity: 1; }
        .nb-tab-icon { font-size: 20px; line-height: 1; }
        .nb-tab-label { font-size: 10px; font-weight: 600; }

        @keyframes nbPulse { 0%,100%{opacity:1}50%{opacity:.4} }

        /* Responsive */
        @media (max-width: 900px) {
          .nb-links, .nb-actions { display: none; }
          .nb-hamburger { display: flex; }
          .nb-bottom-bar { display: block; }
          .nb-notif-dropdown {
            right: -20px;
            min-width: unset;
            width: calc(100vw - 32px);
            max-width: 380px;
          }
        }
        @media (max-width: 360px) {
          .nb-logo-text { font-size: 15px; }
          .nb-notif-dropdown {
            right: -12px;
            width: calc(100vw - 24px);
          }
        }
      `}</style>

      <nav className="nb-root">
        <div className={`nb-bar${scrolled ? " scrolled" : ""}`}>
          <div className="nb-inner">

            {/* Logo */}
            <div className="nb-logo" onClick={() => go("/")}>
              <img src="/favicon.png" alt="OfSkillJob" width="32" height="32" />
              <span className="nb-logo-text">OfSkillJob</span>
            </div>

            {/* Role pill (desktop only) */}
            {!loading && user && role && (
              <div className={`nb-role-pill ${role}`}>
                <span className="nb-role-dot" />
                {role === "company" ? "Company" : "Job Seeker"}
              </div>
            )}

            {/* Desktop nav links */}
            <div className="nb-links">
              {navLinks.map(link => (
                <button
                  key={link.path}
                  className={`nb-link${isActive(link.path) ? " active" : ""}`}
                  onClick={() => go(link.path)}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop actions */}
            <div className="nb-actions">
              {!loading && !user && (
                <>
                  <button className="nb-btn nb-btn-ghost" onClick={() => go("/login")}>Log in</button>
                  <button className="nb-btn nb-btn-primary" onClick={() => go("/signup")}>Sign up free →</button>
                </>
              )}
              {!loading && role === "developer" && (
                <button className="nb-btn nb-btn-logout" onClick={handleLogout}>Log out</button>
              )}
              {!loading && role === "company" && (
                <>
                  <button className="nb-btn nb-btn-post" onClick={() => go("/company/jobs/new")}>＋ Post Job</button>
                  <button className="nb-btn nb-btn-logout" onClick={handleLogout}>Log out</button>
                </>
              )}
            </div>

            {/* Notification bell */}
            {!loading && user && (
              <div className="nb-notif-wrapper">
                <button
                  className="nb-notif-btn"
                  onClick={toggleNotifications}
                  aria-label="Notifications"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="nb-notif-badge">{unreadCount}</span>
                  )}
                </button>
                <div className={`nb-notif-dropdown${showNotifications ? " open" : ""}`}>
                  <div className="nb-notif-header">
                    <span className="nb-notif-title">Notifications</span>
                    <Link href="/notifications" className="nb-notif-view-all" onClick={() => setShowNotifications(false)}>
                      View all
                    </Link>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="nb-notif-empty">No notifications yet.</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`nb-notif-item${!n.read ? " unread" : ""}`}
                        onClick={() => {
                          setShowNotifications(false);
                          if (n.capsule_id) router.push(`/candidate/${n.capsule_id}`);
                        }}
                      >
                        <div className="nb-notif-msg">{n.message}</div>
                        <div className="nb-notif-meta">
                          <span>{n.from_user?.full_name || "Someone"} · {new Date(n.created_at).toLocaleDateString()}</span>
                          <span className={`nb-notif-type ${n.type}`}>
                            {n.type === "call" ? "📞 Call" : "🔦 Spotlight"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Hamburger */}
            <button
              className="nb-hamburger"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <span className={`nb-hline${mobileMenuOpen ? " open-1" : ""}`} />
              <span className={`nb-hline${mobileMenuOpen ? " open-2" : ""}`} />
              <span className={`nb-hline${mobileMenuOpen ? " open-3" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div className={`nb-drawer${mobileMenuOpen ? " open" : ""}`}>
          <div className="nb-drawer-inner">

            {!loading && user && role && (
              <div style={{ display: "flex", alignItems: "center", padding: "8px 12px 4px" }}>
                <div className={`nb-role-pill ${role}`} style={{ fontSize: 12 }}>
                  <span className="nb-role-dot" />
                  {role === "company" ? "🏢 Company Account" : "👤 Job Seeker Account"}
                </div>
              </div>
            )}

            {navLinks.length > 0 && (
              <>
                <div className="nb-drawer-section">Navigate</div>
                {navLinks.map(link => (
                  <button
                    key={link.path}
                    className={`nb-drawer-link${isActive(link.path) ? " active" : ""}`}
                    onClick={() => go(link.path)}
                  >
                    <div className="nb-drawer-icon">{iconMap[link.path] || "→"}</div>
                    <span>{link.label}</span>
                    <span className="nb-drawer-arrow">›</span>
                  </button>
                ))}
                {user && (
                  <button
                    className={`nb-drawer-link${isActive("/notifications") ? " active" : ""}`}
                    onClick={() => go("/notifications")}
                  >
                    <div className="nb-drawer-icon">🔔</div>
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={{
                        marginLeft: "auto",
                        background: "#ef4444",
                        color: "white",
                        fontSize: 11,
                        fontWeight: 800,
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}>{unreadCount}</span>
                    )}
                    <span className="nb-drawer-arrow">›</span>
                  </button>
                )}
              </>
            )}

            <div className="nb-drawer-section">Actions</div>

            {!loading && !user && (
              <>
                <button className="nb-drawer-btn nb-drawer-btn-primary" onClick={() => go("/signup")}>
                  🚀 Sign up free
                </button>
                <button className="nb-drawer-btn nb-drawer-btn-ghost" onClick={() => go("/login")}>
                  🔑 Log in
                </button>
              </>
            )}

            {!loading && role === "company" && (
              <>
                <button className="nb-drawer-btn nb-drawer-btn-post" onClick={() => go("/company/jobs/new")}>
                  ＋ Post a New Job
                </button>
                <button className="nb-drawer-btn nb-drawer-btn-logout" onClick={handleLogout}>
                  ← Log out
                </button>
              </>
            )}

            {!loading && role === "developer" && (
              <>
                <button className="nb-drawer-btn nb-drawer-btn-primary" onClick={() => go("/jobs")}>
                  💼 Browse Jobs
                </button>
                <button className="nb-drawer-btn nb-drawer-btn-logout" onClick={handleLogout}>
                  ← Log out
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom tab bar */}
        {!loading && bottomTabs.length > 0 && (
          <div className="nb-bottom-bar">
            <div className="nb-bottom-inner">
              {bottomTabs.map(tab => (
                <button
                  key={tab.path}
                  className={`nb-tab-btn${isActive(tab.path) ? " active" : ""}`}
                  onClick={() => go(tab.path)}
                >
                  <div className="nb-tab-indicator" />
                  <span className="nb-tab-icon">{tab.icon}</span>
                  <span className="nb-tab-label">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}