"use client";

import { motion } from "framer-motion";
import type { StatsData } from "@/lib/visualization-tools";

export default function StatCards({ data }: { data: any }) {
  // Handle both { title, stats: [...] } and { stats: [...] } and direct array
  const stats: StatsData["stats"] = Array.isArray(data) ? data : (data?.stats ?? []);
  const title = data?.title;

  return (
    <div className="w-full">
      {title && (
        <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">
          {title}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat: any, i: number) => (
          <motion.div
            key={i}
            className="glass-card-bright p-4 text-center"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, type: "spring" }}
          >
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">
              {stat.label}
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {stat.value}
            </div>
            {stat.change && (
              <div
                className={`mt-2 text-xs font-medium ${
                  (stat.changeDirection === "up" || stat.change.startsWith("+") || stat.change.startsWith("↑"))
                    ? "text-emerald-300"
                    : (stat.changeDirection === "down" || stat.change.startsWith("-") || stat.change.startsWith("↓"))
                    ? "text-rose-300"
                    : "text-white/50"
                }`}
              >
                {stat.change}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
