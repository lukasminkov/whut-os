"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricData } from "@/lib/scene-v4-types";

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = start + diff * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = value;
    }

    requestAnimationFrame(tick);
  }, [value, duration]);

  const isInt = Number.isInteger(value);
  return <>{isInt ? Math.round(display) : display.toFixed(1)}</>;
}

function RadialGauge({ value, max, min = 0, color = "#00d4aa" }: { value: number; max: number; min?: number; color?: string }) {
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const circumference = 2 * Math.PI * 38;
  const offset = circumference * (1 - pct * 0.75); // 270-degree arc

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-[135deg]">
      <circle cx="40" cy="40" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} />
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

interface MetricPrimitiveProps {
  data: MetricData;
}

export default function MetricPrimitive({ data }: MetricPrimitiveProps) {
  const { label, value, change, trend, unit, gauge } = data;
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
        </div>

        {(change !== undefined || trend) && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${trendColor}`}>
            {trendIcon}
            {change !== undefined && <span>{change > 0 ? "+" : ""}{change}%</span>}
          </div>
        )}
      </div>
    </div>
  );
}
