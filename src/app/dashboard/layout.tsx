"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("whut-os-auth") !== "true") {
      router.replace("/login");
    } else {
      setAuthed(true);
      document.body.classList.add("dashboard-active");
    }
    return () => document.body.classList.remove("dashboard-active");
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
