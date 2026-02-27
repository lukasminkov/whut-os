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
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-black/70 backdrop-blur-xl border-t border-white/10 flex items-center px-4 gap-1 z-[9999]">
      {/* Quick launch */}
      <div className="flex items-center gap-1 mr-3 pr-3 border-r border-white/10">
        {(["chat", "files", "browser"] as WindowType[]).map((type) => {
          const Icon = ICONS[type];
          return (
            <button
              key={type}
              onClick={() => openWindow(type)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
              title={`Open ${type}`}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      {/* Open windows */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
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

      {/* Clock / status */}
      <div className="text-xs text-white/40 font-mono">
        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
