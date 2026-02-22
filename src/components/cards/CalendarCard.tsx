"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "@/lib/card-types";

interface CalEvent {
  title: string;
  start: string;
  end?: string;
  location?: string;
  description?: string;
}

export default function CalendarCard({
  data,
  onAddCard,
}: {
  data: { events: CalEvent[] };
  onAddCard?: (card: Card) => void;
}) {
  const events = data?.events || [];
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch { return iso; }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    } catch { return ""; }
  };

  const formatFullDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    } catch { return ""; }
  };

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
      {events.length === 0 && (
        <p className="text-xs text-white/30 text-center py-4">No upcoming events</p>
      )}
      {events.map((ev, i) => {
        const isExpanded = expandedIdx === i;
        return (
          <motion.div
            key={i}
            layout
            onClick={() => setExpandedIdx(isExpanded ? null : i)}
            className="p-3 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex gap-3">
              <div className="shrink-0 w-14 text-center">
                <div className="text-[10px] text-white/30">{formatDate(ev.start)}</div>
                <div className="text-sm font-semibold text-[#00d4aa]/80">{formatTime(ev.start)}</div>
                {ev.end && (
                  <div className="text-[10px] text-white/20">{formatTime(ev.end)}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80">{ev.title}</div>
                {ev.location && (
                  <div className="text-[11px] text-white/30 truncate mt-0.5">{ev.location}</div>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-white/15 shrink-0 mt-0.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 ml-17 pl-3 border-l border-white/[0.08] space-y-2">
                    <div className="text-xs text-white/40">
                      {formatFullDate(ev.start)}
                      {ev.end && ` — ${formatTime(ev.start)} to ${formatTime(ev.end)}`}
                    </div>
                    {ev.location && (
                      <div className="text-xs text-white/40">
                        <span className="text-white/25">Location:</span> {ev.location}
                      </div>
                    )}
                    {ev.description && (
                      <div className="text-xs text-white/35 leading-relaxed">{ev.description}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
