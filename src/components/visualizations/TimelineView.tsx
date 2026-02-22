"use client";

import { motion } from "framer-motion";
import type { TimelineData } from "@/lib/visualization-tools";

export default function TimelineView({ data }: { data: TimelineData }) {
  return (
    <div className="w-full">
      <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">
        {data.title}
      </div>
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-[#00d4aa]/60 via-[#6366f1]/40 to-transparent" />
        
        <div className="space-y-4">
          {data.events.map((event, i) => (
            <motion.div
              key={i}
              className="relative glass-card p-4"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              {/* Dot */}
              <div className="absolute -left-[21px] top-5 w-2.5 h-2.5 rounded-full bg-[#00d4aa] border-2 border-[#06060f] shadow-[0_0_8px_rgba(0,212,170,0.5)]" />
              
              <div className="flex items-start gap-3">
                {event.imageQuery && (
                  <div className="hidden sm:block w-16 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
                    <img
                      src={`https://source.unsplash.com/100x100/?${encodeURIComponent(event.imageQuery)}`}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-[#00d4aa] font-mono">{event.date}</span>
                    {event.tag && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/40">
                        {event.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-white">{event.title}</div>
                  <div className="text-xs text-white/50 mt-1">{event.description}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
