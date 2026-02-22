"use client";

import { motion } from "framer-motion";

export type AppMode = "chat" | "speech";

interface ModeToggleProps {
  mode: AppMode;
  onToggle: () => void;
}

export default function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs"
      title="Toggle Speech/Chat mode (Cmd+M / Alt+M)"
    >
      {/* Chat icon */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${mode === "chat" ? "bg-white/15 text-white" : "text-white/40"}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Chat</span>
      </div>
      {/* Speech icon */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${mode === "speech" ? "bg-white/15 text-white" : "text-white/40"}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        <span>Speech</span>
      </div>
    </button>
  );
}
