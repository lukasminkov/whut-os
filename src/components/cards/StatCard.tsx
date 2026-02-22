"use client";
import { motion } from "framer-motion";

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  icon?: string;
}

export default function StatCard({ data }: { data: { stats: Stat[] } }) {
  const stats = data?.stats || [];
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={i}
          className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          {s.icon && <span className="text-lg mb-1 block">{s.icon}</span>}
          <div className="text-2xl font-semibold text-white/90">{s.value}</div>
          <div className="text-xs text-white/40 mt-1">{s.label}</div>
          {s.change && (
            <div className={`text-xs mt-1 ${s.change.startsWith('+') || s.change.startsWith('↑') ? 'text-emerald-400' : s.change.startsWith('-') || s.change.startsWith('↓') ? 'text-rose-400' : 'text-white/40'}`}>
              {s.change}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
