"use client";

import { type ReactNode } from "react";
import { X, Minus } from "lucide-react";

interface GlassPanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
  onDismiss?: () => void;
  onMinimize?: () => void;
  minimized?: boolean;
  priority?: 1 | 2 | 3;
  noPadding?: boolean;
}

export default function GlassPanel({
  children, title, className = "", onDismiss, onMinimize, minimized, priority = 2, noPadding,
}: GlassPanelProps) {
  const isHero = priority === 1;

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden pointer-events-auto ${className}`}
      style={{
        background: isHero ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderTop: isHero ? "2px solid rgba(0,212,170,0.4)" : "1px solid rgba(255,255,255,0.06)",
        animation: "breathe 4s ease-in-out infinite",
      }}
    >
      {/* Title bar */}
      {(title || onDismiss || onMinimize) && (
        <div className={`flex items-center justify-between border-b border-white/[0.04] ${isHero ? "px-6 py-3" : "px-4 py-2.5"}`}>
          {title && (
            <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-medium truncate">
              {title}
            </span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {onMinimize && (
              <button onClick={onMinimize}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/[0.08] transition-colors text-white/30 hover:text-amber-400 cursor-pointer">
                <Minus size={10} />
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/[0.08] transition-colors text-white/30 hover:text-rose-400 cursor-pointer">
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {!minimized && (
        <div className={noPadding ? "" : isHero ? "p-6" : "p-4"}>
          {children}
        </div>
      )}
    </div>
  );
}
