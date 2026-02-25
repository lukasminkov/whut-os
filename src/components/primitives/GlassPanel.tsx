"use client";

import { type ReactNode, useState, useEffect, useRef } from "react";
import { X, Minus } from "lucide-react";

interface GlassPanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
  onDismiss?: () => void;
  onMinimize?: () => void;
  onFocus?: () => void;
  minimized?: boolean;
  focused?: boolean;
  dimmed?: boolean;
  priority?: 1 | 2 | 3;
  noPadding?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.PointerEvent) => void;
}

export default function GlassPanel({
  children, title, className = "", onDismiss, onMinimize, onFocus,
  minimized, focused, dimmed, priority = 2, noPadding,
  isDragging, onDragStart,
}: GlassPanelProps) {
  const isHero = priority === 1;
  const [entered, setEntered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Compute visual states
  const glowColor = focused
    ? "0 0 30px rgba(0,212,170,0.12), 0 0 60px rgba(0,212,170,0.06)"
    : isHero
    ? "0 0 20px rgba(0,212,170,0.04)"
    : "0 0 12px rgba(0,212,170,0.02)";

  const borderColor = focused
    ? "rgba(0,212,170,0.2)"
    : "rgba(255,255,255,0.06)";

  const bgAlpha = focused
    ? "rgba(255,255,255,0.07)"
    : isHero
    ? "rgba(255,255,255,0.05)"
    : "rgba(255,255,255,0.03)";

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden pointer-events-auto holo-panel holo-scanlines holo-glow ${!entered ? "holo-enter" : ""} ${className}`}
      style={{
        background: bgAlpha,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${borderColor}`,
        boxShadow: `0 ${isHero ? 8 : 4}px ${isHero ? 32 : 16}px rgba(0,0,0,${focused ? 0.4 : isHero ? 0.3 : 0.2}), inset 0 1px 0 rgba(255,255,255,0.06), ${glowColor}`,
        transform: isDragging ? "scale(1.02)" : undefined,
        opacity: dimmed ? 0.5 : 1,
        filter: dimmed ? "brightness(0.7)" : undefined,
        transition: "box-shadow 0.4s ease, transform 0.2s, border-color 0.4s ease, opacity 0.3s ease, filter 0.3s ease, background 0.4s ease",
        // Content-aware: let the panel size itself, constrained by grid
        minWidth: 0,
        minHeight: minimized ? undefined : "auto",
        display: "flex",
        flexDirection: "column" as const,
      }}
      onClick={(e) => {
        // Don't trigger focus on button clicks
        if ((e.target as HTMLElement).closest("button")) return;
        onFocus?.();
      }}
    >
      {/* Title bar — drag handle */}
      {(title || onDismiss || onMinimize) && (
        <div
          className={`flex items-center justify-between border-b border-white/[0.04] select-none shrink-0 ${isHero ? "px-6 py-3" : "px-4 py-2.5"}`}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            e.preventDefault();
            onDragStart?.(e);
          }}
        >
          {title && (
            <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-medium truncate max-w-[70%]">
              {title}
            </span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {onMinimize && (
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onMinimize(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-6 h-6 flex items-center justify-center rounded-full border border-white/10 hover:bg-amber-500/20 hover:border-amber-400/30 transition-colors text-white/40 hover:text-amber-400 cursor-pointer"
              >
                <Minus size={12} />
              </button>
            )}
            {onDismiss && (
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDismiss(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-white/10 hover:bg-rose-500/20 hover:border-rose-400/30 transition-colors text-white/40 hover:text-rose-400 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content — scrollable when overflowing, auto-height up to constraint */}
      {!minimized && (
        <div
          ref={contentRef}
          className={`${noPadding ? "" : isHero ? "p-6" : "p-4"} overflow-y-auto overflow-x-hidden flex-1 min-h-0`}
          style={{
            // Smart scroll: content grows naturally but scrolls when it exceeds available space
            // The max-height is determined by the grid cell, not a hardcoded px value
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
