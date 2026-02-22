"use client";

import { motion } from "framer-motion";

interface CommerceSummaryProps {
  data: {
    revenue?: string;
    orders?: string;
    profit?: string;
    period?: string;
    avgOrderValue?: string;
    profitMargin?: string;
    stats?: { label: string; value: string; change?: string }[];
  };
  title?: string;
}

export default function CommerceSummary({ data, title }: CommerceSummaryProps) {
  // Support both flat fields and a stats array
  const stats = data?.stats ?? [
    data?.revenue && { label: "Revenue", value: data.revenue },
    data?.orders && { label: "Orders", value: data.orders },
    data?.profit && { label: "Profit", value: data.profit },
    data?.avgOrderValue && { label: "AOV", value: data.avgOrderValue },
    data?.profitMargin && { label: "Margin", value: data.profitMargin },
  ].filter(Boolean) as { label: string; value: string; change?: string }[];

  return (
    <div
      className="rounded-2xl border border-white/[0.08] p-5"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      }}
    >
      {(title || data?.period) && (
        <div className="flex items-baseline justify-between mb-4">
          {title && (
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">{title}</div>
          )}
          {data?.period && (
            <span className="text-[10px] text-white/25 uppercase tracking-wider">{data.period}</span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className="rounded-xl border border-white/[0.06] p-4"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
            }}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, type: "spring", damping: 20 }}
          >
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/35 mb-1.5">
              {stat.label}
            </div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
            {stat.change && (
              <div
                className={`mt-1.5 text-xs font-medium ${
                  stat.change.startsWith("+") || stat.change.startsWith("↑")
                    ? "text-emerald-300"
                    : stat.change.startsWith("-") || stat.change.startsWith("↓")
                    ? "text-rose-300"
                    : "text-white/40"
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
