"use client";

import { motion } from "framer-motion";
import type { ChartRadialData } from "@/lib/scene-v4-types";

interface ChartRadialPrimitiveProps {
  data: ChartRadialData;
}

export default function ChartRadialPrimitive({ data }: ChartRadialPrimitiveProps) {
  const { value, max, label, color = "#00d4aa" } = data;
  const pct = Math.min(1, Math.max(0, value / max));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270-degree arc
  const offset = arcLength * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[130px] h-[130px]">
        <svg width="130" height="130" viewBox="0 0 130 130" className="transform -rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx="65" cy="65" r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <motion.circle
            cx="65" cy="65" r={radius}
            fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 8px ${color}50)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-light text-white tabular-nums"
            style={{ textShadow: `0 0 16px ${color}40` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(pct * 100)}%
          </motion.span>
          <span className="text-[9px] text-white/30">{value}/{max}</span>
        </div>
      </div>
      <p className="text-[10px] text-white/40 uppercase tracking-[0.15em]">{label}</p>
    </div>
  );
}
