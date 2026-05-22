"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { awardPoints, POINTS } from "@/lib/points";
import { trackSignupStart, event as gaEvent } from "@/lib/analytics";

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("developer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Track that user reached signup page
  useEffect(() => {
    trackSignupStart(window.location.pathname);
  }, []);

  async function handleSignup() {
    setError("");
    setMessage("");

    // Basic validation
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    localStorage.setItem("selectedRole", role);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      const { error: upsertError } = await supabase.from("users").upsert({
        id: data.user.id,
        email: data.user.email,
        role: role,
      });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        setError("Failed to save user data. Please try again.");
        setLoading(false);
        return;
      }

      // Award signup points
      await awardPoints(data.user.id, "signup", POINTS.SIGNUP);

      // Track successful signup in GA
      gaEvent("signup_complete", {
        method: "email",
        role: role,
      });

      setMessage("Account created! +20 points. Redirecting...");

      setTimeout(() => {
        if (role === "company") {
          router.push("/company/profile/edit");
        } else {
          router.push("/profile/edit");
        }
      }, 1500);
    }

    setLoading(false);
  }

  async function handleGoogle() {
    // Track that user started Google signup
    gaEvent("signup_start", { method: "google", source_page: window.location.pathname });
    localStorage.setItem("selectedRole", role);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "60px auto",
        padding: "30px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Create Account</h2>

      {error && <p style={{ color: "#dc2626", fontSize: "14px", marginBottom: "10px" }}>{error}</p>}
      {message && <p style={{ color: "#16a34a", fontSize: "14px", marginBottom: "10px" }}>{message}</p>}

      <div style={{ marginBottom: "15px" }}>
        <p style={{ marginBottom: "5px", fontSize: "14px", fontWeight: 500 }}>I want to:</p>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={input}
        >
          <option value="developer">Get Hired (Job Seeker)</option>
          <option value="company">Hire Talent (Company)</option>
        </select>
      </div>

      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={input}
      />

      <input
        type="password"
        placeholder="Password (min. 6 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={input}
      />

      <input
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        style={input}
      />

      <button onClick={handleSignup} disabled={loading} style={btn}>
        {loading ? "Creating account..." : "Sign Up"}
      </button>

      <button
        onClick={handleGoogle}
        style={{
          ...btn,
          background: "#db4437",
          marginTop: "10px",
        }}
      >
        Continue with Google
      </button>

      <p style={{ marginTop: "15px", textAlign: "center", fontSize: "14px" }}>
        Already have an account?{" "}
        <span
          onClick={() => router.push("/login")}
          style={{ color: "#2563eb", cursor: "pointer", fontWeight: "600" }}
        >
          Login here
        </span>
      </p>
    </div>
  );
}

const input = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "14px",
};

const btn = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
  transition: "opacity 0.2s",
  fontSize: "14px",
};