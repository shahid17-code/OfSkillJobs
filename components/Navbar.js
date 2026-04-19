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

  // Desktop buttons (visible on large screens)
  const desktopButtons = () => {
    if (loading) return null;
    if (!user) {
      return (
        <div style={styles.desktopMenu}>
          <button style={isActive("/") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/")}>Home</button>
          <button style={isActive("/challenges") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/challenges")}>Challenges</button>
          <button style={isActive("/jobs") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/jobs")}>Jobs</button>
          <button style={styles.primaryBtn} onClick={() => router.push("/signup")}>Signup</button>
          <button style={styles.secondaryBtn} onClick={() => router.push("/login")}>Login</button>
        </div>
      );
    }
    if (role === "developer") {
      return (
        <div style={styles.desktopMenu}>
          <button style={isActive("/") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/")}>Home</button>
          <button style={isActive("/jobs") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/jobs")}>Jobs</button>
          <button style={isActive("/challenges") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/challenges")}>Challenges</button>
          <button style={isActive("/leaderboard") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/leaderboard")}>Leaderboard</button>
          <button style={isActive("/profile") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/profile")}>Profile</button>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      );
    }
    if (role === "company") {
      return (
        <div style={styles.desktopMenu}>
          <button style={isActive("/") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/")}>Home</button>
          <button style={isActive("/company/dashboard") ? styles.activeBtn : styles.navBtn} onClick={() => router.push("/company/dashboard")}>Dashboard</button>
          <button style={styles.highlightedBtn} onClick={() => router.push("/company/jobs/new")}>Post Job</button>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      );
    }
    return null;
  };

  // Mobile menu items (full list)
  const hamburgerItems = () => {
    if (loading) return <span>Loading...</span>;
    if (!user) {
      return (
        <>
          <button onClick={() => { closeMenu(); router.push("/"); }} style={styles.mobileBtn}>Home</button>
          <button onClick={() => { closeMenu(); router.push("/challenges"); }} style={styles.mobileBtn}>Challenges</button>
          <button onClick={() => { closeMenu(); router.push("/jobs"); }} style={styles.mobileBtn}>Jobs</button>
          <button onClick={() => { closeMenu(); router.push("/signup"); }} style={styles.mobileBtn}>Signup</button>
          <button onClick={() => { closeMenu(); router.push("/login"); }} style={styles.mobileBtn}>Login</button>
        </>
      );
    }
    if (role === "developer") {
      return (
        <>
          <button onClick={() => { closeMenu(); router.push("/"); }} style={styles.mobileBtn}>Home</button>
          <button onClick={() => { closeMenu(); router.push("/jobs"); }} style={styles.mobileBtn}>Jobs</button>
          <button onClick={() => { closeMenu(); router.push(`/applications/${user.id}`); }} style={styles.mobileBtn}>Applications</button>
          <button onClick={() => { closeMenu(); router.push("/challenges"); }} style={styles.mobileBtn}>Challenges</button>
          <button onClick={() => { closeMenu(); router.push("/leaderboard"); }} style={styles.mobileBtn}>Leaderboard</button>
          <button onClick={() => { closeMenu(); router.push("/profile"); }} style={styles.mobileBtn}>Profile</button>
          <button onClick={handleLogout} style={styles.mobileLogoutBtn}>Logout</button>
        </>
      );
    }
    if (role === "company") {
      return (
        <>
          <button onClick={() => { closeMenu(); router.push("/"); }} style={styles.mobileBtn}>Home</button>
          <button onClick={() => { closeMenu(); router.push("/company/dashboard"); }} style={styles.mobileBtn}>Dashboard</button>
          <button onClick={() => { closeMenu(); router.push("/company/jobs/new"); }} style={styles.mobileBtn}>Post Job</button>
          <button onClick={() => { closeMenu(); router.push("/company/profile/edit"); }} style={styles.mobileBtn}>Edit Profile</button>
          <button onClick={handleLogout} style={styles.mobileLogoutBtn}>Logout</button>
        </>
      );
    }
    return null;
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.navRow}>
        <div style={styles.logoArea} onClick={() => router.push("/")}>
          <img src="/favicon.ico" alt="Logo" width="24" height="24" style={{ width: '24px', height: '24px' }} />
          <span style={styles.logoText}>OfSkillJob</span>
        </div>
        <div style={styles.desktopWrapper}>
          {desktopButtons()}
        </div>
        <button onClick={toggleMenu} style={styles.hamburger}>
          <span style={{ ...styles.hamburgerLine, transform: mobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <span style={{ ...styles.hamburgerLine, opacity: mobileMenuOpen ? 0 : 1 }} />
          <span style={{ ...styles.hamburgerLine, transform: mobileMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>
      </div>
      <div style={{ ...styles.mobileMenu, display: mobileMenuOpen ? "flex" : "none" }}>
        {hamburgerItems()}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    background: "#0f172a",
    color: "white",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  navRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 24px",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
  },
  logoText: {
    fontWeight: "800",
    fontSize: "20px",
    letterSpacing: "-0.5px",
  },
  desktopWrapper: {
    display: "flex",
  },
  desktopMenu: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  navBtn: {
    background: "transparent",
    border: "none",
    color: "#cbd5e1",
    cursor: "pointer",
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: "500",
    borderRadius: "8px",
  },
  activeBtn: {
    background: "#334155",
    color: "white",
  },
  primaryBtn: {
    background: "#2563eb",
    color: "white",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "600",
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "transparent",
    border: "1px solid #2563eb",
    color: "#2563eb",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
  },
  highlightedBtn: {
    background: "#f59e0b",
    color: "#0f172a",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "700",
    cursor: "pointer",
  },
  logoutBtn: {
    background: "#dc2626",
    color: "white",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "600",
    cursor: "pointer",
  },
  hamburger: {
    display: "none",
    flexDirection: "column",
    justifyContent: "space-between",
    width: "28px",
    height: "20px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  hamburgerLine: {
    width: "100%",
    height: "2px",
    background: "white",
    transition: "all 0.2s ease",
  },
  mobileMenu: {
    flexDirection: "column",
    background: "#1e293b",
    padding: "16px 24px",
    gap: "12px",
    borderTop: "1px solid #334155",
  },
  mobileBtn: {
    background: "transparent",
    border: "none",
    color: "#cbd5e1",
    cursor: "pointer",
    padding: "10px 0",
    fontSize: "16px",
    textAlign: "left",
    width: "100%",
  },
  mobileLogoutBtn: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "10px 0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    marginTop: "8px",
  },
};

// Media query for mobile: hide desktop menu, show hamburger
if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(max-width: 768px)");
  const handleResize = (e) => {
    const desktopWrapper = document.querySelector(".desktop-wrapper");
    const hamburger = document.querySelector(".hamburger");
    if (e.matches) {
      if (desktopWrapper) desktopWrapper.style.display = "none";
      if (hamburger) hamburger.style.display = "flex";
    } else {
      if (desktopWrapper) desktopWrapper.style.display = "flex";
      if (hamburger) hamburger.style.display = "none";
    }
  };
  mediaQuery.addEventListener("change", handleResize);
  handleResize(mediaQuery);
}