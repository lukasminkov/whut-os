"use client";
import { motion } from "framer-motion";

interface CalEvent {
  title: string;
  start: string;
  end?: string;
  location?: string;
}

export default function CalendarCard({ data }: { data: { events: CalEvent[] } }) {
  const events = data?.events || [];

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

  return (
    <div className="space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar">
      {events.length === 0 && (
        <p className="text-xs text-white/30 text-center py-4">No upcoming events</p>
      )}
      {events.map((ev, i) => (
        <motion.div
          key={i}
          className="flex gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="shrink-0 w-12 text-center">
            <div className="text-[10px] text-white/30">{formatDate(ev.start)}</div>
            <div className="text-sm font-medium text-[#00d4aa]/80">{formatTime(ev.start)}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white/80 truncate">{ev.title}</div>
            {ev.location && (
              <div className="text-[11px] text-white/30 truncate mt-0.5">{ev.location}</div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
