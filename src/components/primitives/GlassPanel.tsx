"use client";

import { type ReactNode, useState, useEffect, useRef } from "react";
import { X, Minus } from "lucide-react";

export type GlassPanelVariant = "default" | "center" | "orbital" | "cinematic-overlay";

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
  /** HUD variant — controls glass depth, glow, opacity */
  variant?: GlassPanelVariant;
  /** Extra content rendered in the title bar (e.g. feedback widget) */
  titleBarExtra?: ReactNode;
}

// Visual presets per variant
const variantStyles = {
  default: {
    bgAlpha: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.06)",
    blur: 20,
    glow: "0 0 12px rgba(0,212,170,0.02)",
    shadow: "0 4px 16px rgba(0,0,0,0.2)",
  },
  center: {
    bgAlpha: "rgba(10,12,18,0.85)",
    borderColor: "rgba(0,212,170,0.18)",
    blur: 24,
    glow: "0 0 40px rgba(0,212,170,0.1), 0 0 80px rgba(0,212,170,0.04)",
    shadow: "0 12px 48px rgba(0,0,0,0.5)",
  },
  orbital: {
    bgAlpha: "rgba(255,255,255,0.025)",
    borderColor: "rgba(255,255,255,0.05)",
    blur: 28,
    glow: "0 0 8px rgba(0,212,170,0.015)",
    shadow: "0 4px 20px rgba(0,0,0,0.25)",
  },
  "cinematic-overlay": {
    bgAlpha: "rgba(10,12,18,0.7)",
    borderColor: "rgba(255,255,255,0.08)",
    blur: 32,
    glow: "0 0 20px rgba(0,212,170,0.05)",
    shadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
};

export default function GlassPanel({
  children, title, className = "", onDismiss, onMinimize, onFocus,
  minimized, focused, dimmed, priority = 2, noPadding,
  isDragging, onDragStart, variant = "default", titleBarExtra,
}: GlassPanelProps) {
  const isHero = priority === 1 || variant === "center";
  const [entered, setEntered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 500);
    return () => clearTimeout(t);
  }, []);

  const vStyle = variantStyles[variant] || variantStyles.default;

  // Override with focus state if explicitly focused
  const borderFinal = focused
    ? "rgba(0,212,170,0.22)"
    : vStyle.borderColor;

  const glowFinal = focused
    ? "0 0 30px rgba(0,212,170,0.14), 0 0 60px rgba(0,212,170,0.06)"
    : vStyle.glow;

  const bgFinal = focused
    ? "rgba(10,12,18,0.88)"
    : vStyle.bgAlpha;

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden pointer-events-auto holo-panel holo-scanlines holo-glow ${!entered ? "holo-enter" : ""} ${className}`}
      style={{
        background: bgFinal,
        backdropFilter: `blur(${vStyle.blur}px)`,
        WebkitBackdropFilter: `blur(${vStyle.blur}px)`,
        border: `1px solid ${borderFinal}`,
        boxShadow: `${vStyle.shadow}, inset 0 1px 0 rgba(255,255,255,${variant === "center" ? 0.08 : 0.04}), ${glowFinal}`,
        transform: isDragging ? "scale(1.02)" : undefined,
        opacity: dimmed ? 0.5 : 1,
        filter: dimmed ? "brightness(0.7)" : undefined,
        transition: "box-shadow 0.4s ease, transform 0.2s, border-color 0.4s ease, opacity 0.3s ease, filter 0.3s ease, background 0.4s ease",
        minWidth: "250px",
        minHeight: minimized ? undefined : "150px",
        display: "flex",
        flexDirection: "column" as const,
        height: "100%",
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        onFocus?.();
      }}
    >
      {/* Title bar */}
      {(title || onDismiss || onMinimize) && (
        <div
          className={`flex items-center justify-between border-b border-white/[0.04] select-none shrink-0 ${isHero ? "px-6 py-3" : "px-4 py-2.5"}`}
          style={{ cursor: isDragging ? "grabbing" : onDragStart ? "grab" : "default" }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            if (!onDragStart) return;
            e.preventDefault();
            onDragStart(e);
          }}
        >
          {title && (
            <span
              className="uppercase tracking-[0.15em] font-medium truncate max-w-[70%]"
              style={{
                fontSize: isHero ? "11px" : "10px",
                color: variant === "center" ? "rgba(0,212,170,0.6)" : "rgba(255,255,255,0.4)",
              }}
            >
              {title}
            </span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {titleBarExtra}
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

      {/* Content — scrollable */}
      {!minimized && (
        <div
          ref={contentRef}
          className={`${noPadding ? "" : isHero ? "p-6" : "p-4"} overflow-y-auto overflow-x-hidden flex-1 min-h-0`}
          style={{
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
