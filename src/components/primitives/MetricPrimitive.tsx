"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricData } from "@/lib/scene-v4-types";

// ── Spring-animated number ──────────────────────────────

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20, mass: 0.5 });
  const display = useTransform(spring, (v) =>
    Number.isInteger(value) ? Math.round(v).toLocaleString() : v.toFixed(1)
  );
  const [text, setText] = useState("0");

  useEffect(() => {
    spring.set(value);
    const unsub = display.on("change", (v) => setText(v));
    return unsub;
  }, [value, spring, display]);

  return <>{text}</>;
}

// ── Inline sparkline ────────────────────────────────────

function Sparkline({ data, color = "#00d4aa" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 60, h = 20;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");

  return (
    <svg width={w} height={h} className="inline-block ml-2 align-middle opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${color}40)` }} />
    </svg>
  );
}

// ── Radial gauge (ECharts-powered) ──────────────────────

function RadialGauge({ value, max, min = 0, color = "#00d4aa" }: { value: number; max: number; min?: number; color?: string }) {
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const circumference = 2 * Math.PI * 38;
  const offset = circumference * (1 - pct * 0.75);

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-[135deg]">
      <circle cx="40" cy="40" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"
        strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} />
      <motion.circle
        cx="40" cy="40" r="38" fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
        initial={{ strokeDashoffset: circumference * 0.75 }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
      />
    </svg>
  );
}

// ── Main ────────────────────────────────────────────────

interface MetricPrimitiveProps {
  data: MetricData;
}

export default function MetricPrimitive({ data }: MetricPrimitiveProps) {
  const { label, value, change, trend, unit, gauge, sparkline, delta } = data as MetricData & { sparkline?: number[]; delta?: string };
  const numericValue = typeof value === "number" ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numericValue);

  const trendIcon = trend === "up" ? <TrendingUp size={14} /> : trend === "down" ? <TrendingDown size={14} /> : <Minus size={14} />;
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-white/40";

  return (
    <div className="flex items-center gap-4">
      {gauge && (
        <div className="relative flex-shrink-0">
          <RadialGauge value={gauge.value} max={gauge.max} min={gauge.min} />
          <div className="absolute inset-0 flex items-center justify-center transform rotate-[135deg]">
            <span className="text-xs text-white/60 font-mono">{Math.round((gauge.value / gauge.max) * 100)}%</span>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <motion.span
            className="text-2xl font-light text-white tabular-nums"
            style={{ textShadow: "0 0 20px rgba(0,212,170,0.3)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {isNumeric ? <AnimatedNumber value={numericValue} /> : value}
          </motion.span>
          {unit && <span className="text-xs text-white/30">{unit}</span>}
          {sparkline && <Sparkline data={sparkline} />}
        </div>

        <div className="flex items-center gap-3 mt-1">
          {(change !== undefined || trend) && (
            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
              {trendIcon}
              {change !== undefined && <span>{change > 0 ? "+" : ""}{change}%</span>}
            </div>
          )}
          {delta && (
            <span className="text-[10px] text-white/30">{delta}</span>
          )}
        </div>
      </div>
    </div>
  );
}
