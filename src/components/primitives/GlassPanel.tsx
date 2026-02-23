"use client";

import { type ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { X, Minus } from "lucide-react";

// Corner accent decorator — HUD style L-shaped lines
function CornerAccent({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const size = 12;
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: -1, left: -1 },
    tr: { top: -1, right: -1 },
    bl: { bottom: -1, left: -1 },
    br: { bottom: -1, right: -1 },
  };
  const paths: Record<string, string> = {
    tl: `M0,${size} L0,0 L${size},0`,
    tr: `M${size - size},0 L${size},0 L${size},${size}`,
    bl: `M0,0 L0,${size} L${size},${size}`,
    br: `M0,${size} L${size},${size} L${size},0`,
  };

  return (
    <svg
      className="absolute pointer-events-none"
      style={{ ...styles[position], width: size, height: size }}
      viewBox={`0 0 ${size} ${size}`}
    >
      <path d={paths[position]} fill="none" stroke="rgba(0,212,170,0.3)" strokeWidth="1" />
    </svg>
  );
}

// Scan-line hover effect
function ScanLine() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    >
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4aa]/20 to-transparent"
        animate={{ top: ["-2%", "102%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

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
  children,
  title,
  className = "",
  onDismiss,
  onMinimize,
  minimized,
  priority = 2,
  noPadding,
}: GlassPanelProps) {
  const [hovered, setHovered] = useState(false);

  const glowIntensity = priority === 1 ? "0.05" : priority === 2 ? "0.03" : "0.02";

  return (
    <div
      className={`group relative rounded-xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] overflow-hidden transition-all duration-300 ${
        hovered ? "border-white/[0.12]" : ""
      } ${className}`}
      style={{
        boxShadow: `inset 0 0 30px rgba(0,212,170,${glowIntensity}), 0 8px 32px rgba(0,0,0,0.3)`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CornerAccent position="tl" />
      <CornerAccent position="tr" />
      <CornerAccent position="bl" />
      <CornerAccent position="br" />
      <ScanLine />

      {/* Title bar */}
      {(title || onDismiss || onMinimize) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
          {title && (
            <span className="text-[11px] text-white/40 uppercase tracking-[0.15em] truncate">
              {title}
            </span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/[0.08] transition-colors text-white/30 hover:text-amber-400"
              >
                <Minus size={10} />
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/[0.08] transition-colors text-white/30 hover:text-rose-400"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {!minimized && (
        <div className={noPadding ? "" : "p-4"}>
          {children}
        </div>
      )}
    </div>
  );
}
