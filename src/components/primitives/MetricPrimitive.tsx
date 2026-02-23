"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import type { MetricData } from "@/lib/scene-v4-types";

function AnimatedNumber({ value }: { value: number }) {
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

interface MetricPrimitiveProps {
  data: MetricData;
}

export default function MetricPrimitive({ data }: MetricPrimitiveProps) {
  const { label, value, change, trend, unit, sparkline, delta } = data as MetricData & { sparkline?: number[]; delta?: string };
  const numericValue = typeof value === "number" ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numericValue);

  const TrendIcon = trend === "up" ? ChevronUp : trend === "down" ? ChevronDown : Minus;
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-white/40";

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <motion.span
          className="text-2xl font-bold text-white tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {isNumeric ? <AnimatedNumber value={numericValue} /> : value}
        </motion.span>
        {unit && <span className="text-[11px] text-white/25">{unit}</span>}
        {sparkline && <Sparkline data={sparkline} />}
      </div>

      {(change !== undefined || trend || delta) && (
        <div className="flex items-center gap-2 mt-0.5">
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
              <TrendIcon size={14} />
              {change !== undefined && <span>{change > 0 ? "+" : ""}{change}%</span>}
            </span>
          )}
          {delta && <span className="text-[11px] text-white/25">{delta}</span>}
        </div>
      )}
    </div>
  );
}
