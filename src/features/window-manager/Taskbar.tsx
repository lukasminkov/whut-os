"use client";

import { useState, useEffect } from "react";
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
  const { state, focusWindow } = useWindowManager();
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  // Hide taskbar completely when no windows are open
  if (state.windows.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 bg-black/60 backdrop-blur-xl border-t border-white/[0.06] flex items-center z-[9999] md:pl-[200px]">
      {/* Open windows */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto px-3">
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
      <div className="text-xs text-white/40 font-mono px-3 shrink-0">
        {time}
      </div>
    </div>
  );
}
