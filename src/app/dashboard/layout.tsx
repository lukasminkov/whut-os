"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { createClient } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      // Supabase auth
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          router.replace("/login");
        } else {
          setAuthed(true);
          document.body.classList.add("dashboard-active");
        }
      });
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.replace("/login");
        }
      });
      return () => {
        subscription.unsubscribe();
        document.body.classList.remove("dashboard-active");
      };
    } else {
      // Fallback: localStorage auth
      if (localStorage.getItem("whut-os-auth") !== "true") {
        router.replace("/login");
      } else {
        setAuthed(true);
        document.body.classList.add("dashboard-active");
      }
      return () => document.body.classList.remove("dashboard-active");
    }
  }, [router]);

  if (!authed) return null;

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white" style={{ background: '#06060f' }}>
      <div className="absolute inset-0 z-0" style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(0,212,170,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(99,102,241,0.03) 0%, transparent 60%)',
      }} />
      <Sidebar />
      <div className="relative z-10 h-screen ml-0 md:ml-[200px]">{children}</div>
    </div>
  );
}
