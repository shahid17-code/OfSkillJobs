"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill all fields");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setError("User not found");
      setLoading(false);
      return;
    }

    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching role:", profileError);
      router.push("/profile/edit");
      setLoading(false);
      return;
    }

    const role = userData?.role || "developer";

    if (role === "company") {
      router.push("/company/dashboard");
    } else {
      router.push("/profile");
    }

    setLoading(false);
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Google login error:", error);
      setError(error.message);
    }
  }

  return (
    <div style={container}>
      <div style={card}>
        <h1 style={title}>Welcome Back</h1>
        <p style={subtitle}>Login to continue your journey</p>

        {error && <div style={errorBox}>{error}</div>}

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        <button onClick={handleLogin} style={primaryBtn} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <div style={divider}>OR</div>

        <button onClick={handleGoogleLogin} style={googleBtn}>
          Continue with Google
        </button>

        <p style={signupText}>
          Don’t have an account?{" "}
          <Link href="/signup" style={signupLink}>
            Signup here
          </Link>
        </p>
      </div>
    </div>
  );
}

// STYLES with proper typing
const container: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  background: "#f4f6fb",
  padding: "20px",
};

const card: React.CSSProperties = {
  background: "white",
  padding: "30px",
  borderRadius: "16px",
  width: "100%",
  maxWidth: "400px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
};

const title: React.CSSProperties = {
  marginBottom: "10px",
  fontSize: "26px",
};

const subtitle: React.CSSProperties = {
  color: "#64748b",
  marginBottom: "20px",
  fontSize: "14px",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  fontSize: "14px",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  background: "#2563eb",
  color: "white",
  padding: "12px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  marginTop: "10px",
};

const googleBtn: React.CSSProperties = {
  width: "100%",
  background: "#111827",
  color: "white",
  padding: "12px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
};

const divider: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "15px 0",
  color: "#94a3b8",
  fontSize: "12px",
};

const errorBox: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "10px",
  borderRadius: "6px",
  marginBottom: "12px",
  fontSize: "13px",
};

const signupText: React.CSSProperties = {
  marginTop: "18px",
  textAlign: "center" as const,
  fontSize: "14px",
};

const signupLink: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: "500",
  textDecoration: "none",
};