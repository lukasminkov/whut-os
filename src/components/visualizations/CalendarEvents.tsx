"use client";

import { motion } from "framer-motion";

interface CalendarEvent {
  title: string;
  start: string;
  end?: string;
  location?: string;
  attendees?: string[];
}

interface CalendarEventsProps {
  data: { events?: CalendarEvent[] } | CalendarEvent[];
  title?: string;
}

const ACCENT_COLORS = [
  "from-[#00d4aa]/30 to-[#00d4aa]/10",
  "from-indigo-400/30 to-indigo-400/10",
  "from-pink-400/30 to-pink-400/10",
  "from-amber-400/30 to-amber-400/10",
  "from-sky-400/30 to-sky-400/10",
];

export default function CalendarEvents({ data, title }: CalendarEventsProps) {
  const events: CalendarEvent[] = Array.isArray(data) ? data : data?.events ?? [];

  return (
    <div
      className="rounded-2xl border border-white/[0.08] p-5"
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
    >
      {title && (
        <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">{title}</div>
      )}
      {events.length === 0 ? (
        <p className="text-sm text-white/30">No upcoming events</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[23px] top-2 bottom-2 w-px bg-white/[0.06]" />

          <div className="space-y-1">
            {events.map((event, i) => {
              const time = formatTime(event.start);
              const endTime = event.end ? formatTime(event.end) : null;

              return (
                <motion.div
                  key={i}
                  className="flex items-start gap-4 pl-1 py-2.5 relative"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                >
                  {/* Time badge */}
                  <div
                    className={`shrink-0 w-[46px] h-[38px] rounded-lg bg-gradient-to-b ${
                      ACCENT_COLORS[i % ACCENT_COLORS.length]
                    } flex items-center justify-center border border-white/[0.06] relative z-10`}
                  >
                    <span className="text-[11px] font-semibold text-white/90 tabular-nums">
                      {time}
                    </span>
                  </div>

                  {/* Event details */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-white/90 truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {endTime && (
                        <span className="text-[10px] text-white/30 tabular-nums">
                          {time} – {endTime}
                        </span>
                      )}
                      {event.location && (
                        <>
                          {endTime && <span className="text-white/10">·</span>}
                          <span className="text-[10px] text-white/30 truncate">
                            📍 {event.location}
                          </span>
                        </>
                      )}
                    </div>
                    {event.attendees && event.attendees.length > 0 && (
                      <p className="text-[10px] text-white/20 mt-1 truncate">
                        {event.attendees.slice(0, 3).join(", ")}
                        {event.attendees.length > 3 && ` +${event.attendees.length - 3}`}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "");
  } catch {
    return dateStr;
  }
}
