"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU_ITEMS = [
  { href: "/dashboard", label: "HUD", icon: "🎯" },
  { href: "/dashboard/docs", label: "Docs", icon: "📄" },
  { href: "/dashboard/integrations", label: "Integrations", icon: "🔗" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-4 top-4 bottom-4 z-40 w-[168px] flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(0,212,170,0.03)',
      }}
    >
      <div className="flex h-full flex-col p-4 text-white/80">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <span className="inline-block h-2 w-2 rounded-full bg-[#00d4aa]" style={{ boxShadow: '0 0 8px rgba(0,212,170,0.6)' }} />
          <span className="text-[10px] uppercase tracking-[0.35em] text-white/50 font-medium">WHUT OS</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 text-sm">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                  isActive
                    ? "text-[#00d4aa]"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
                style={isActive ? { background: 'rgba(0,212,170,0.08)', boxShadow: '0 0 20px rgba(0,212,170,0.05)' } : {}}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="mt-auto space-y-2">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-200"
          >
            <span className="text-sm">⚙️</span>
            <span className="text-xs font-medium">Settings</span>
          </Link>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="h-7 w-7 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.6), rgba(99,102,241,0.6))' }} />
            <div>
              <div className="text-xs text-white/70">John Doe</div>
              <div className="text-[10px] text-white/30">Operator</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
