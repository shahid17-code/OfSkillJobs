"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: "developer" | "company";
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.log("No user found, redirecting to login");
          router.replace("/login");
          return;
        }

        // Try to fetch user profile
        let { data: userData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        // If profile doesn't exist, create it
        if (profileError || !userData) {
          console.log("Profile not found, attempting to create one for user:", user.id);
          const newProfile = {
            id: user.id,
            email: user.email,
            role: role,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            created_at: new Date().toISOString(),
          };
          
          const { data: inserted, error: insertError } = await supabase
            .from("users")
            .insert([newProfile])
            .select()
            .single();
            
          if (insertError) {
            console.error("Failed to create user profile - detailed error:", insertError);
            // If insertion fails, maybe the row already exists but with a different role? Try fetching again
            const { data: retryData, error: retryError } = await supabase
              .from("users")
              .select("*")
              .eq("id", user.id)
              .single();
            if (retryError || !retryData) {
              router.replace("/login?error=profile_creation_failed");
              return;
            }
            userData = retryData;
          } else {
            userData = inserted;
          }
        }

        const userRole = userData?.role;
        console.log("User role:", userRole, "Required role:", role);

        if (userRole !== role) {
          console.log(`Role mismatch. Expected ${role}, got ${userRole}`);
          if (userRole === "company") {
            router.replace("/company/dashboard");
          } else if (userRole === "developer") {
            router.replace("/profile/edit");
          } else {
            router.replace("/login");
          }
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, role]);

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        fontSize: "16px",
        color: "#64748b"
      }}>
        Loading...
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}