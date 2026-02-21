import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen w-screen overflow-hidden text-white" style={{ background: '#06060f' }}>
      {/* Subtle gradient overlay instead of ugly dots */}
      <div className="absolute inset-0 z-0" style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(0,212,170,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(99,102,241,0.03) 0%, transparent 60%)',
      }} />
      <Sidebar />
      <div className="relative z-10 h-screen ml-[200px]">{children}</div>
    </div>
  );
}
