"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ApplicationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        router.replace(`/applications/${user.id}`);
      } else {
        router.push("/login");
      }
    }
    redirect();
  }, [router]);

  return <div>Redirecting...</div>;
}