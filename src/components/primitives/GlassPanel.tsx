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
  isDragging?: boolean;
  onDragStart?: (e: React.PointerEvent) => void;
}

export default function GlassPanel({
  children, title, className = "", onDismiss, onMinimize, minimized, priority = 2, noPadding,
  isDragging, onDragStart,
}: GlassPanelProps) {
  const isHero = priority === 1;

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden pointer-events-auto transition-shadow duration-300 ${className}`}
      style={{
        background: isHero ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: isHero
          ? "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 4px 16px rgba(0,0,0,0.2)",
        transform: isDragging ? "scale(1.02)" : undefined,
        transition: "box-shadow 0.3s, transform 0.2s",
      }}
    >
      {/* Title bar — drag handle */}
      {(title || onDismiss || onMinimize) && (
        <div
          className={`flex items-center justify-between border-b border-white/[0.04] select-none ${isHero ? "px-6 py-3" : "px-4 py-2.5"}`}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          onPointerDown={(e) => {
            // Only start drag from the title area, not from buttons
            if ((e.target as HTMLElement).closest("button")) return;
            e.preventDefault();
            onDragStart?.(e);
          }}
        >
          {title && (
            <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-medium truncate">
              {title}
            </span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {onMinimize && (
              <button
                onClick={() => onMinimize()}
                className="w-6 h-6 flex items-center justify-center rounded-full border border-white/10 hover:bg-amber-500/20 hover:border-amber-400/30 transition-colors text-white/40 hover:text-amber-400 cursor-pointer"
              >
                <Minus size={12} />
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss()}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-white/10 hover:bg-rose-500/20 hover:border-rose-400/30 transition-colors text-white/40 hover:text-rose-400 cursor-pointer"
              >
                <X size={14} />
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
