"use client";

import { type ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { X, Minus } from "lucide-react";
import AnimatedFrame from "../hud/AnimatedFrame";
import PulsingCornerDots from "../hud/PulsingCornerDots";

// Scan-line hover effect (enhanced)
function ScanLine() {
  return (
    <motion.div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <motion.div
        className="absolute left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(0,212,170,0.25), transparent)",
          boxShadow: "0 0 12px rgba(0,212,170,0.15)",
        }}
        animate={{ top: ["-2%", "102%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
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
  children, title, className = "", onDismiss, onMinimize, minimized, priority = 2, noPadding,
}: GlassPanelProps) {
  const [hovered, setHovered] = useState(false);

  const glowIntensity = priority === 1 ? "0.06" : priority === 2 ? "0.03" : "0.02";
  const isPrimary = priority === 1;

  return (
    <div
      className={`group relative rounded-xl overflow-hidden transition-all duration-300 ${
        hovered ? "border-white/[0.14]" : "border-white/[0.08]"
      } ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(24px) saturate(1.2)",
        WebkitBackdropFilter: "blur(24px) saturate(1.2)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: `inset 0 0 30px rgba(0,212,170,${glowIntensity}), 0 8px 32px rgba(0,0,0,0.4)`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Teal accent line for priority-1 panels */}
      {isPrimary && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, #00d4aa, transparent)" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
      )}

      {/* Frosted glass noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Inner border glow — pulses on interactive elements */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ boxShadow: `inset 0 0 1px rgba(0,212,170,${hovered ? 0.2 : 0.08})` }}
        animate={hovered ? { boxShadow: [
          "inset 0 0 1px rgba(0,212,170,0.1)",
          "inset 0 0 3px rgba(0,212,170,0.2)",
          "inset 0 0 1px rgba(0,212,170,0.1)",
        ] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <AnimatedFrame />
      <PulsingCornerDots />
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
              <button onClick={onMinimize}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/[0.08] transition-colors text-white/30 hover:text-amber-400">
                <Minus size={10} />
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/[0.08] transition-colors text-white/30 hover:text-rose-400">
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {!minimized && <div className={noPadding ? "" : "p-4"}>{children}</div>}
    </div>
  );
}
