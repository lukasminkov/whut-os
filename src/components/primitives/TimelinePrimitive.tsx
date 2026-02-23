"use client";

import { motion } from "framer-motion";
import type { TimelineData } from "@/lib/scene-v4-types";

interface TimelinePrimitiveProps {
  data: TimelineData;
}

export default function TimelinePrimitive({ data }: TimelinePrimitiveProps) {
  return (
    <div className="space-y-2">
      {data.title && <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">{data.title}</p>}

      {/* Horizontal timeline */}
      <div className="overflow-x-auto scrollbar-thin pb-2">
        <div className="flex items-start gap-0 min-w-max relative">
          {/* Connection line */}
          <div className="absolute top-[14px] left-4 right-4 h-[1px] bg-white/[0.08]" />

          {data.events.map((event, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center w-[120px] flex-shrink-0 relative"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              {/* Node */}
              <div
                className={`w-[10px] h-[10px] rounded-full border-2 z-10 ${
                  event.active
                    ? "border-[#00d4aa] bg-[#00d4aa] shadow-[0_0_12px_rgba(0,212,170,0.5)]"
                    : "border-white/20 bg-white/[0.06]"
                }`}
              />

              {/* Content */}
              <div className="mt-3 text-center px-1">
                <p className="text-[10px] text-white/40">{event.time}</p>
                <p className={`text-xs mt-0.5 ${event.active ? "text-[#00d4aa]" : "text-white/60"}`}>
                  {event.title}
                </p>
                {event.description && (
                  <p className="text-[10px] text-white/30 mt-0.5">{event.description}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
