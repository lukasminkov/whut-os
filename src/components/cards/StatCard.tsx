"use client";
import { motion } from "framer-motion";

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  icon?: string;
}

const accentColors = [
  { bg: "from-cyan-500/10 to-cyan-500/0", border: "border-cyan-500/20", text: "text-cyan-400" },
  { bg: "from-violet-500/10 to-violet-500/0", border: "border-violet-500/20", text: "text-violet-400" },
  { bg: "from-amber-500/10 to-amber-500/0", border: "border-amber-500/20", text: "text-amber-400" },
  { bg: "from-emerald-500/10 to-emerald-500/0", border: "border-emerald-500/20", text: "text-emerald-400" },
  { bg: "from-rose-500/10 to-rose-500/0", border: "border-rose-500/20", text: "text-rose-400" },
  { bg: "from-blue-500/10 to-blue-500/0", border: "border-blue-500/20", text: "text-blue-400" },
];

export default function StatCard({ data }: { data: { stats: Stat[] } }) {
  const stats = data?.stats || [];
  return (
    <div className={`grid ${stats.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
      {stats.map((s, i) => {
        const accent = accentColors[i % accentColors.length];
        return (
          <motion.div
            key={i}
            className={`p-4 rounded-xl bg-gradient-to-br ${accent.bg} border ${accent.border} hover:border-white/[0.15] transition-colors`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            {s.icon && <span className="text-lg mb-1 block">{s.icon}</span>}
            <div className="text-3xl font-semibold text-white/90 tracking-tight">{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
            {s.change && (
              <div
                className={`text-xs mt-1.5 font-medium ${
                  s.change.startsWith("+") || s.change.startsWith("↑")
                    ? "text-emerald-400"
                    : s.change.startsWith("-") || s.change.startsWith("↓")
                    ? "text-rose-400"
                    : "text-white/40"
                }`}
              >
                {s.change}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
