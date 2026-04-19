"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // First, try to get the session directly
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // If no session, try to extract tokens from URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setError(error.message);
            return;
          }
          if (!data.user?.id) {
            setError("User ID not found.");
            return;
          }
          await redirectBasedOnRole(data.user.id);
        } else {
          setError("No session found. Please try logging in again.");
        }
      } else {
        // Session already exists
        if (!session.user.id) {
          setError("User ID not found.");
          return;
        }
        await redirectBasedOnRole(session.user.id);
      }
    };

    const redirectBasedOnRole = async (userId: string) => {
      // Fetch user role from database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        // Fallback: try to create user record
        const { error: insertError } = await supabase.from("users").insert({
          id: userId,
          email: (await supabase.auth.getUser()).data.user?.email,
          role: "developer",
          total_points: 0,
        });
        if (insertError) {
          setError("User profile not found and could not be created.");
          return;
        }
        router.replace("/profile/edit");
        return;
      }

      const role = userData.role;
      if (role === "company") {
        router.replace("/company/dashboard");
      } else {
        router.replace("/profile");
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Authentication Error</h2>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => (window.location.href = "/login")}>Go to Login</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <p>Logging you in...</p>
    </div>
  );
}