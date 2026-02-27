"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { createClient } from "@/lib/supabase";
import AmbientBackground from "@/components/AmbientBackground";
import ToastNotification from "@/components/ToastNotification";
import { WindowManagerProvider } from "@/features/window-manager";
import Taskbar from "@/features/window-manager/Taskbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  // Listen for AI thinking state from dashboard page
  useEffect(() => {
    const handler = (e: Event) => {
      setAiThinking((e as CustomEvent).detail?.thinking ?? false);
    };
    window.addEventListener("whut-ai-state", handler);
    return () => window.removeEventListener("whut-ai-state", handler);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          router.replace("/login");
        } else {
          setAuthed(true);
          document.body.classList.add("dashboard-active");
        }
      });
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
      router.replace("/login");
      return () => document.body.classList.remove("dashboard-active");
    }
  }, [router]);

  if (!authed) return null;

  return (
    <WindowManagerProvider>
      <div className="relative h-screen w-screen overflow-hidden text-white" style={{ background: '#06060f' }}>
        {/* Living ambient background */}
        <AmbientBackground intensified={aiThinking} />
        {/* Subtle radial tints on top of canvas */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(0,212,170,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(99,102,241,0.03) 0%, transparent 60%)',
        }} />
        <Sidebar />
        <div className="relative z-10 h-[calc(100vh-48px)] ml-0 md:ml-[200px]">{children}</div>
        <Taskbar />
        <ToastNotification />
      </div>
    </WindowManagerProvider>
  );
}
