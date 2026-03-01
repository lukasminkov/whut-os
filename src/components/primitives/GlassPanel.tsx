"use client";

import { type ReactNode, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
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
  variant?: GlassPanelVariant;
  titleBarExtra?: ReactNode;
  /** Stagger index for mount animation */
  staggerIndex?: number;
}

const variantStyles = {
  default: {
    bg: "rgba(8, 12, 20, 0.65)",
    border: "rgba(0, 212, 170, 0.08)",
    blur: 24,
    glow: "0 0 20px rgba(0,212,170,0.03)",
    shadow: "0 8px 32px rgba(0,0,0,0.4)",
    innerHighlight: 0.03,
  },
  center: {
    bg: "rgba(6, 10, 18, 0.82)",
    border: "rgba(0, 212, 170, 0.2)",
    blur: 28,
    glow: "0 0 40px rgba(0,212,170,0.08), 0 0 80px rgba(0,212,170,0.03)",
    shadow: "0 12px 48px rgba(0,0,0,0.5)",
    innerHighlight: 0.06,
  },
  orbital: {
    bg: "rgba(8, 12, 20, 0.45)",
    border: "rgba(0, 212, 170, 0.06)",
    blur: 32,
    glow: "0 0 12px rgba(0,212,170,0.02)",
    shadow: "0 4px 20px rgba(0,0,0,0.3)",
    innerHighlight: 0.02,
  },
  "cinematic-overlay": {
    bg: "rgba(6, 10, 18, 0.7)",
    border: "rgba(0, 212, 170, 0.1)",
    blur: 32,
    glow: "0 0 24px rgba(0,212,170,0.04)",
    shadow: "0 8px 32px rgba(0,0,0,0.4)",
    innerHighlight: 0.04,
  },
};

export default function GlassPanel({
  children, title, className = "", onDismiss, onMinimize, onFocus,
  minimized, focused, dimmed, priority = 2, noPadding,
  isDragging, onDragStart, variant = "default", titleBarExtra,
  staggerIndex = 0,
}: GlassPanelProps) {
  const isHero = priority === 1 || variant === "center";
  const contentRef = useRef<HTMLDivElement>(null);

  const v = variantStyles[variant] || variantStyles.default;

  // Use CSS custom properties for adaptive accent colors
  const accentBorder = `rgba(var(--accent-rgb, 0,212,170), ${focused ? 0.25 : variant === "center" ? 0.2 : variant === "orbital" ? 0.06 : 0.08})`;
  const accentGlow = focused
    ? `0 0 30px rgba(var(--accent-rgb, 0,212,170), 0.12), 0 0 60px rgba(var(--accent-rgb, 0,212,170), 0.05)`
    : v.glow.replace(/0,\s*212,\s*170/g, "var(--accent-rgb, 0,212,170)");
  const borderFinal = focused ? accentBorder : accentBorder;
  const glowFinal = accentGlow;
  const bgFinal = focused ? "rgba(6,10,18,0.85)" : v.bg;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
      transition={{
        duration: 0.4,
        delay: staggerIndex * 0.1,
        ease: [0.23, 1, 0.32, 1],
      }}
      className={`group relative rounded-xl overflow-hidden pointer-events-auto ${className}`}
      style={{
        background: bgFinal,
        backdropFilter: `blur(${v.blur}px)`,
        WebkitBackdropFilter: `blur(${v.blur}px)`,
        border: `1px solid ${borderFinal}`,
        boxShadow: `${v.shadow}, inset 0 1px 0 rgba(255,255,255,${v.innerHighlight}), ${glowFinal}`,
        transform: isDragging ? "scale(1.02)" : undefined,
        opacity: dimmed ? 0.5 : undefined,
        filter: dimmed ? "brightness(0.7)" : undefined,
        transition: "box-shadow 0.4s ease, border-color 0.4s ease, opacity 0.3s ease",
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
          className={`flex items-center justify-between border-b border-white/[0.04] select-none shrink-0 ${isHero ? "px-5 py-2.5" : "px-4 py-2"}`}
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
              className="uppercase tracking-[0.18em] font-medium truncate max-w-[70%]"
              style={{
                fontSize: isHero ? "10px" : "9px",
                color: variant === "center" || focused
                  ? `rgba(var(--accent-rgb, 0,212,170), 0.7)`
                  : "rgba(255,255,255,0.35)",
                letterSpacing: "0.18em",
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
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-amber-500/15 transition-colors text-white/25 hover:text-amber-400/70 cursor-pointer"
              >
                <Minus size={10} />
              </button>
            )}
            {onDismiss && (
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDismiss(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-rose-500/15 transition-colors text-white/25 hover:text-rose-400/70 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {!minimized && (
        <div
          ref={contentRef}
          className={`${noPadding ? "" : isHero ? "p-5" : "p-4"} overflow-y-auto overflow-x-hidden flex-1 min-h-0`}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.08) transparent",
          }}
        >
          {children}
        </div>
      )}
    </motion.div>
  );
}
