"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  Crosshair,
  FileText,
  Plug,
  Bell,
  Settings,
  LogOut,
  BarChart2,
  Plus,
  MessageCircle,
} from "lucide-react";

const MENU_ITEMS = [
  { href: "/dashboard", label: "HUD", icon: Crosshair },
  { href: "/dashboard/docs", label: "Docs", icon: FileText },
];

const BOTTOM_NAV = [
  { href: "/dashboard/usage", label: "Usage", icon: BarChart2 },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

interface Conversation {
  id: string;
  title: string | null;
  last_message_at: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showConvos, setShowConvos] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations((data.conversations || []).slice(0, 15));
    } catch {}
  }, []);

  useEffect(() => {
    loadConversations();
    const handler = () => loadConversations();
    window.addEventListener('whut-conversation-changed', handler);
    return () => window.removeEventListener('whut-conversation-changed', handler);
  }, [loadConversations]);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
          isActive
            ? "text-[#00d4aa]"
            : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
        }`}
        style={isActive ? { background: 'rgba(0,212,170,0.08)', boxShadow: '0 0 20px rgba(0,212,170,0.05)' } : {}}
      >
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </Link>
    );
  };

  const formatConvTitle = (conv: Conversation) => {
    if (conv.title) return conv.title;
    const date = new Date(conv.last_message_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-xl md:hidden"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        aria-label="Open menu"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <path d="M1 1h16M1 7h16M1 13h16" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-4 top-4 bottom-4 z-50 w-[168px] flex flex-col transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-[200px]"} md:translate-x-0`}
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Image src="/whut-logo.svg" alt="WHUT" width={20} height={20} />
              <span className="text-[10px] uppercase tracking-[0.35em] text-white/50 font-medium">WHUT OS</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="md:hidden text-white/40 hover:text-white/70 text-sm"
              aria-label="Close menu"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* New Chat button */}
          <button
            onClick={() => (window as any).__whut_newConversation?.()}
            className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3 text-xs font-medium text-white/60 hover:text-white/90 transition-all cursor-pointer"
            style={{
              background: 'rgba(0,212,170,0.08)',
              border: '1px solid rgba(0,212,170,0.15)',
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </button>

          {/* Main Navigation */}
          <nav className="space-y-1 text-sm">
            {MENU_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>

          {/* Conversations */}
          <div className="mt-4">
            <button
              onClick={() => setShowConvos(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-white/30 hover:text-white/50 transition w-full cursor-pointer"
            >
              <MessageCircle className="h-3 w-3" />
              Recent Chats
              <svg
                width="8" height="8" viewBox="0 0 8 8" fill="none"
                className={`ml-auto transition-transform ${showConvos ? "rotate-180" : ""}`}
              >
                <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </button>

            {showConvos && (
              <div className="mt-1 space-y-0.5 max-h-[200px] overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => (window as any).__whut_loadConversation?.(conv.id)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition truncate cursor-pointer"
                    title={conv.title || undefined}
                  >
                    {formatConvTitle(conv)}
                  </button>
                ))}
                {conversations.length === 0 && (
                  <p className="px-3 py-1.5 text-[10px] text-white/20">No conversations yet</p>
                )}
              </div>
            )}
          </div>

          {/* Bottom section */}
          <div className="mt-auto space-y-1">
            {BOTTOM_NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}

            <div className="my-2 border-t border-white/[0.06]" />

            {/* User profile */}
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, #E84D8A, #D64045)' }}>
                L
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/70 truncate">Lukas Minkov</div>
                <div className="text-[10px] text-white/30 truncate">Whut.AI LLC</div>
              </div>
            </div>

            {/* Settings & Sign Out */}
            <div className="flex items-center gap-2 px-3">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="text-[10px]">Settings</span>
              </Link>
              <span className="text-white/10">|</span>
              <button
                onClick={async () => {
                  try {
                    const { createClient } = await import("@/lib/supabase");
                    const supabase = createClient();
                    if (supabase) await supabase.auth.signOut();
                  } catch {}
                  window.location.href = "/login";
                }}
                className="flex items-center gap-1.5 text-white/30 hover:text-red-400/70 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="text-[10px]">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
