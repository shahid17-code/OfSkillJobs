"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [companyUsername, setCompanyUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      } else {
        setRole(null);
        setCompanyUsername(null);
      }
    } catch (err) {
      console.log("Navbar error:", err);
    }
    setLoading(false);
  }

  // ✅ Reload user data when pathname changes (e.g., after redirect from edit page)
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
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      loadUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    setMobileMenuOpen(false);
  }

  function isActive(path) {
    return pathname === path;
  }

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);

  const desktopButtons = () => {
    if (loading) return null;
    if (!user) {
      return (
        <div className="desktop-menu">
          <button className={isActive("/") ? "active-btn" : "nav-btn"} onClick={() => router.push("/")}>Home</button>
          <button className={isActive("/challenges") ? "active-btn" : "nav-btn"} onClick={() => router.push("/challenges")}>Challenges</button>
          <button className={isActive("/jobs") ? "active-btn" : "nav-btn"} onClick={() => router.push("/jobs")}>Jobs</button>
          <button className="primary-btn" onClick={() => router.push("/signup")}>Signup</button>
          <button className="secondary-btn" onClick={() => router.push("/login")}>Login</button>
        </div>
      );
    }
    if (role === "developer") {
      return (
        <div className="desktop-menu">
          <button className={isActive("/") ? "active-btn" : "nav-btn"} onClick={() => router.push("/")}>Home</button>
          <button className={isActive("/jobs") ? "active-btn" : "nav-btn"} onClick={() => router.push("/jobs")}>Jobs</button>
          <button className={isActive(`/applications/${user?.id}`) ? "active-btn" : "nav-btn"} onClick={() => user?.id && router.push(`/applications/${user.id}`)}>Applications</button>
          <button className={isActive("/challenges") ? "active-btn" : "nav-btn"} onClick={() => router.push("/challenges")}>Challenges</button>
          <button className={isActive("/leaderboard") ? "active-btn" : "nav-btn"} onClick={() => router.push("/leaderboard")}>Leaderboard</button>
          <button className={isActive("/profile") ? "active-btn" : "nav-btn"} onClick={() => router.push("/profile")}>Profile</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      );
    }
    if (role === "company") {
      return (
        <div className="desktop-menu">
          <button className={isActive("/") ? "active-btn" : "nav-btn"} onClick={() => router.push("/")}>Home</button>
          <button 
            className={isActive(`/company/${companyUsername || ""}`) ? "active-btn" : "nav-btn"} 
            onClick={() => { 
              if (companyUsername) router.push(`/company/${companyUsername}`); 
              else router.push("/company/profile/edit"); 
            }}
          >
            Profile
          </button>
          <button className={isActive("/company/dashboard") ? "active-btn" : "nav-btn"} onClick={() => router.push("/company/dashboard")}>Dashboard</button>
          <button className="highlighted-btn" onClick={() => router.push("/company/jobs/new")}>Post Job</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      );
    }
    return null;
  };

  const bottomTabItems = () => {
    if (loading) return null;
    if (!user) {
      return [
        { label: "Home", icon: "🏠", path: "/" },
        { label: "Jobs", icon: "💼", path: "/jobs" },
        { label: "Challenges", icon: "🏆", path: "/challenges" },
      ];
    }
    if (role === "developer") {
      return [
        { label: "Home", icon: "🏠", path: "/" },
        { label: "Jobs", icon: "💼", path: "/jobs" },
        { label: "Challenges", icon: "🏆", path: "/challenges" },
        { label: "Profile", icon: "👤", path: "/profile" },
      ];
    }
    if (role === "company") {
      return [
        { label: "Home", icon: "🏠", path: "/" },
        { label: "Dashboard", icon: "📊", path: "/company/dashboard" },
        { label: "Post Job", icon: "➕", path: "/company/jobs/new" },
      ];
    }
    return [];
  };

  const hamburgerItems = () => {
    if (loading) return <span>Loading...</span>;
    if (!user) {
      return (
        <>
          <button onClick={() => { closeMenu(); router.push("/"); }} className="mobile-btn">Home</button>
          <button onClick={() => { closeMenu(); router.push("/jobs"); }} className="mobile-btn">Jobs</button>
          <button onClick={() => { closeMenu(); router.push("/challenges"); }} className="mobile-btn">Challenges</button>
          <button onClick={() => { closeMenu(); router.push("/signup"); }} className="mobile-btn">Signup</button>
          <button onClick={() => { closeMenu(); router.push("/login"); }} className="mobile-btn">Login</button>
        </>
      );
    }
    if (role === "developer") {
      return (
        <>
          <button onClick={() => { closeMenu(); router.push("/"); }} className="mobile-btn">Home</button>
          <button onClick={() => { closeMenu(); router.push("/jobs"); }} className="mobile-btn">Jobs</button>
          <button onClick={() => { closeMenu(); router.push(`/applications/${user.id}`); }} className="mobile-btn">Track Applications</button>
          <button onClick={() => { closeMenu(); router.push("/challenges"); }} className="mobile-btn">Challenges</button>
          <button onClick={() => { closeMenu(); router.push("/leaderboard"); }} className="mobile-btn">Leaderboard</button>
          <button onClick={() => { closeMenu(); router.push("/profile"); }} className="mobile-btn">My Profile</button>
          <button onClick={handleLogout} className="mobile-logout-btn">Logout</button>
        </>
      );
    }
    if (role === "company") {
      return (
        <>
          <button onClick={() => { closeMenu(); router.push("/"); }} className="mobile-btn">Home</button>
          <button onClick={() => { closeMenu(); router.push("/company/dashboard"); }} className="mobile-btn">Dashboard</button>
          <button onClick={() => { closeMenu(); router.push("/company/jobs/new"); }} className="mobile-btn">Post Job</button>
          <button 
            onClick={() => { 
              closeMenu(); 
              if (companyUsername) router.push(`/company/${companyUsername}`); 
              else router.push("/company/profile/edit"); 
            }} 
            className="mobile-btn"
          >
            My Profile
          </button>
          <button onClick={handleLogout} className="mobile-logout-btn">Logout</button>
        </>
      );
    }
    return null;
  };

  const bottomItems = bottomTabItems();

  return (
    <nav className="navbar">
      <div className="nav-row">
        <div className="logo-area" onClick={() => router.push("/")}>
          <img src="/favicon.ico" alt="Logo" width="24" height="24" style={{ width: '24px', height: '24px' }} />
          <span className="logo-text">OfSkillJob</span>
        </div>
        <div className="desktop-wrapper">
          {desktopButtons()}
        </div>
        <button onClick={toggleMenu} className="hamburger">
          <span className="hamburger-line" style={{ transform: mobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <span className="hamburger-line" style={{ opacity: mobileMenuOpen ? 0 : 1 }} />
          <span className="hamburger-line" style={{ transform: mobileMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>
      </div>
      <div className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
        {hamburgerItems()}
      </div>
      {bottomItems && bottomItems.length > 0 && (
        <div className="bottom-tab-bar">
          {bottomItems.map((item) => (
            <button key={item.path} className={`bottom-tab-btn ${pathname === item.path ? "active" : ""}`} onClick={() => router.push(item.path)}>
              <span className="tab-icon">{item.icon}</span>
              <span className="tab-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .navbar {
          background: #0f172a;
          color: white;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .nav-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
        }
        .logo-area {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        .logo-text {
          font-weight: 800;
          font-size: 20px;
          letter-spacing: -0.5px;
        }
        .desktop-wrapper {
          display: flex;
        }
        .desktop-menu {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        /* Base button styles – polished, rounded, with transition */
        .nav-btn, .active-btn, .primary-btn, .secondary-btn, .highlighted-btn, .logout-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 40px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        /* Hover effect: slight lift and shadow */
        .nav-btn:hover, .active-btn:hover, .primary-btn:hover, .secondary-btn:hover, .highlighted-btn:hover, .logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        /* Active (click) effect: scale down */
        .nav-btn:active, .active-btn:active, .primary-btn:active, .secondary-btn:active, .highlighted-btn:active, .logout-btn:active {
          transform: scale(0.96);
        }
        /* Default nav button */
        .nav-btn {
          background: transparent;
          color: #cbd5e1;
        }
        .nav-btn:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }
        /* Active page button */
        .active-btn {
          background: #334155;
          color: white;
        }
        .active-btn:hover {
          background: #3b4a63;
        }
        /* Primary (Signup / Get Started) */
        .primary-btn {
          background: #2563eb;
          color: white;
        }
        .primary-btn:hover {
          background: #1d4ed8;
        }
        /* Secondary (Login) */
        .secondary-btn {
          background: transparent;
          border: 1px solid #2563eb;
          color: #2563eb;
        }
        .secondary-btn:hover {
          background: rgba(37,99,235,0.1);
        }
        /* Highlighted (Post Job) */
        .highlighted-btn {
          background: #f59e0b;
          color: #0f172a;
        }
        .highlighted-btn:hover {
          background: #d97706;
        }
        /* Logout button */
        .logout-btn {
          background: #dc2626;
          color: white;
        }
        .logout-btn:hover {
          background: #b91c1c;
        }
        /* Hamburger menu */
        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 28px;
          height: 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .hamburger-line {
          width: 100%;
          height: 2px;
          background: white;
          transition: all 0.2s ease;
        }
        .mobile-menu {
          flex-direction: column;
          background: #1e293b;
          padding: 16px 24px;
          gap: 12px;
          border-top: 1px solid #334155;
          display: none;
        }
        .mobile-menu.open {
          display: flex;
        }
        .mobile-btn {
          background: transparent;
          border: none;
          color: #cbd5e1;
          cursor: pointer;
          padding: 10px 0;
          font-size: 16px;
          text-align: left;
          width: 100%;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .mobile-btn:hover {
          background: rgba(255,255,255,0.05);
          padding-left: 8px;
        }
        .mobile-logout-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 10px 0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 8px;
          text-align: center;
          transition: all 0.2s;
        }
        .mobile-logout-btn:hover {
          background: #b91c1c;
        }
        /* Bottom tab bar */
        .bottom-tab-bar {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #0f172a;
          border-top: 1px solid #334155;
          justify-content: space-around;
          padding: 8px 0;
          z-index: 1000;
        }
        .bottom-tab-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: transparent;
          border: none;
          color: #cbd5e1;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
          transition: all 0.2s;
          font-size: 12px;
        }
        .bottom-tab-btn.active {
          color: #3b82f6;
        }
        .bottom-tab-btn:active {
          transform: scale(0.95);
        }
        .tab-icon {
          font-size: 22px;
          margin-bottom: 2px;
        }
        .tab-label {
          font-size: 10px;
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .desktop-wrapper {
            display: none;
          }
          .hamburger {
            display: flex;
          }
          .bottom-tab-bar {
            display: flex;
          }
          body {
            padding-bottom: 70px;
          }
        }
      `}</style>
    </nav>
  );
}