"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { ComparisonData } from "@/lib/visualization-tools";

export default function ComparisonView({ data }: { data: ComparisonData }) {
  return (
    <div className="w-full">
      <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">
        {data.title}
      </div>
      <div className={`grid gap-4 ${data.items.length === 2 ? "grid-cols-1 md:grid-cols-2" : `grid-cols-1 md:grid-cols-${Math.min(data.items.length, 3)}`}`}>
        {data.items.map((item, i) => (
          <motion.div
            key={i}
            className="glass-card-bright p-5 flex flex-col"
            initial={{ opacity: 0, x: i === 0 ? -20 : 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
          >
            {item.imageQuery && (
              <div className="w-full h-32 rounded-xl overflow-hidden mb-4 bg-white/5">
                <img
                  src={`https://source.unsplash.com/400x200/?${encodeURIComponent(item.imageQuery)}`}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <h3 className="text-base font-semibold text-white mb-3">{item.name}</h3>
            
            <div className="space-y-2 flex-1">
              {item.specs.map((spec, j) => (
                <div key={j} className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                  <span className="text-white/50">{spec.label}</span>
                  <span className="text-white font-medium">{spec.value}</span>
                </div>
              ))}
            </div>

            {(item.pros || item.cons) && (
              <div className="mt-4 space-y-2">
                {item.pros?.map((pro, j) => (
                  <div key={j} className="text-xs text-emerald-300 flex items-start gap-1.5">
                    <span>✓</span>
                    <span>{pro}</span>
                  </div>
                ))}
                {item.cons?.map((con, j) => (
                  <div key={j} className="text-xs text-rose-300 flex items-start gap-1.5">
                    <span>✗</span>
                    <span>{con}</span>
                  </div>
                ))}
              </div>
            )}

            {item.verdict && (
              <div className="mt-4 pt-3 border-t border-white/10 text-xs text-[#00d4aa]">
                {item.verdict}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
