"use client";

import { motion } from "framer-motion";
import type { StatsData } from "@/lib/visualization-tools";

const ACCENT_COLORS = [
  { border: "rgba(0, 212, 170, 0.4)", glow: "rgba(0, 212, 170, 0.08)", text: "text-emerald-400" },
  { border: "rgba(99, 102, 241, 0.4)", glow: "rgba(99, 102, 241, 0.08)", text: "text-indigo-400" },
  { border: "rgba(244, 114, 182, 0.4)", glow: "rgba(244, 114, 182, 0.08)", text: "text-pink-400" },
  { border: "rgba(56, 189, 248, 0.4)", glow: "rgba(56, 189, 248, 0.08)", text: "text-sky-400" },
  { border: "rgba(251, 191, 36, 0.4)", glow: "rgba(251, 191, 36, 0.08)", text: "text-amber-400" },
  { border: "rgba(167, 139, 250, 0.4)", glow: "rgba(167, 139, 250, 0.08)", text: "text-violet-400" },
];

function ChangeIndicator({ change, direction }: { change: string; direction?: string }) {
  const isUp = direction === "up" || change.startsWith("+") || change.startsWith("↑");
  const isDown = direction === "down" || change.startsWith("-") || change.startsWith("↓");

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isUp ? "text-emerald-400" : isDown ? "text-rose-400" : "text-white/40"
      }`}
    >
      {isUp && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
      )}
      {isDown && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
        </svg>
      )}
      {change}
    </span>
  );
}

export default function StatCards({ data }: { data: any }) {
  const stats: StatsData["stats"] = Array.isArray(data) ? data : (data?.stats ?? []);
  const title = data?.title;
  const colCount = stats.length <= 2 ? stats.length : stats.length <= 4 ? 2 : 3;

  return (
    <div className="w-full">
      {title && (
        <motion.div
          className="text-[10px] uppercase tracking-[0.35em] text-white/40 mb-5 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.div>
      )}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        }}
      >
        {stats.map((stat: any, i: number) => {
          const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
          return (
            <motion.div
              key={i}
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] p-5"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderLeft: `2px solid ${accent.border}`,
                boxShadow: `0 0 30px ${accent.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: i * 0.1,
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
            >
              {/* Subtle gradient overlay */}
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 20% 50%, ${accent.glow}, transparent 70%)`,
                }}
              />

              <div className="relative z-10">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-medium mb-3">
                  {stat.label}
                </div>
                <div className="text-3xl md:text-[2.25rem] font-bold text-white tracking-tight leading-none">
                  {stat.value}
                </div>
                {stat.change && (
                  <div className="mt-3">
                    <ChangeIndicator change={stat.change} direction={stat.changeDirection} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
