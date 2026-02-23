"use client";

import { motion } from "framer-motion";
import type { ChartBarData } from "@/lib/scene-v4-types";

interface ChartBarPrimitiveProps {
  data: ChartBarData;
}

export default function ChartBarPrimitive({ data }: ChartBarPrimitiveProps) {
  const maxVal = Math.max(...data.bars.map(b => b.value), 1);
  const color = data.color || "#00d4aa";

  if (data.horizontal) {
    return (
      <div className="space-y-2">
        {data.label && <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">{data.label}</p>}
        <div className="space-y-2">
          {data.bars.map((bar, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/50 truncate">{bar.label}</span>
                <span className="text-white/70 tabular-nums ml-2">{bar.value}</span>
              </div>
              <div className="h-5 rounded-md bg-white/[0.04] overflow-hidden">
                <motion.div
                  className="h-full rounded-md"
                  style={{ background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 12px ${color}30` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(bar.value / maxVal) * 100}%` }}
                  transition={{ delay: i * 0.08, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vertical bars
  return (
    <div className="space-y-2">
      {data.label && <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">{data.label}</p>}
      <div className="flex items-end gap-2 h-[180px]">
        {data.bars.map((bar, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <span className="text-[10px] text-white/50 tabular-nums">{bar.value}</span>
            <motion.div
              className="w-full max-w-[40px] rounded-t-md"
              style={{ background: `linear-gradient(to top, ${color}60, ${color})`, boxShadow: `0 0 12px ${color}20` }}
              initial={{ height: 0 }}
              animate={{ height: `${(bar.value / maxVal) * 100}%` }}
              transition={{ delay: i * 0.06, duration: 0.7, ease: "easeOut" }}
            />
            <span className="text-[9px] text-white/30 truncate max-w-full text-center">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
