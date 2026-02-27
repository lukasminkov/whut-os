"use client";

import { useWindowManager } from "./context";
import type { WindowType } from "./types";
import { MessageSquare, Globe, FolderOpen, Layout, Settings, Monitor } from "lucide-react";

const ICONS: Record<WindowType, typeof MessageSquare> = {
  chat: MessageSquare,
  browser: Globe,
  files: FolderOpen,
  scene: Monitor,
  document: Layout,
  settings: Settings,
};

export default function Taskbar() {
  const { state, focusWindow, openWindow } = useWindowManager();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-black/70 backdrop-blur-xl border-t border-white/[0.08] flex items-center z-[9999] md:pl-[200px]">
      {/* Open windows */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto px-4">
        {state.windows.map((win) => {
          const Icon = ICONS[win.type];
          const isActive = state.activeWindowId === win.id;
          return (
            <button
              key={win.id}
              onClick={() => focusWindow(win.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-white/15 text-white border border-white/20"
                  : win.minimized
                  ? "bg-white/5 text-white/30 border border-transparent"
                  : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10"
              }`}
            >
              <Icon size={12} />
              <span className="truncate max-w-[100px]">{win.title}</span>
            </button>
          );
        })}
      </div>

      {/* Clock */}
      <div className="text-xs text-white/40 font-mono px-4 shrink-0">
        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
