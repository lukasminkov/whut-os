"use client";

import { motion } from "framer-motion";

interface Email {
  id?: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread?: boolean;
}

interface EmailListProps {
  data: { emails?: Email[] } | Email[];
  title?: string;
}

export default function EmailList({ data, title }: EmailListProps) {
  const emails: Email[] = Array.isArray(data) ? data : data?.emails ?? [];

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
      {emails.length === 0 ? (
        <p className="text-sm text-white/30">No emails to display</p>
      ) : (
        <div className="space-y-1">
          {emails.map((email, i) => (
            <motion.div
              key={email.id ?? i}
              className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-default group"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              {/* Unread dot */}
              <div className="mt-1.5 shrink-0">
                {email.unread ? (
                  <span className="block w-2 h-2 rounded-full bg-[#00d4aa] shadow-[0_0_6px_rgba(0,212,170,0.5)]" />
                ) : (
                  <span className="block w-2 h-2 rounded-full bg-white/[0.08]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-sm truncate ${
                      email.unread ? "font-semibold text-white" : "font-medium text-white/70"
                    }`}
                  >
                    {email.from}
                  </span>
                  <span className="text-[10px] text-white/30 shrink-0 tabular-nums">
                    {formatDate(email.date)}
                  </span>
                </div>
                <p
                  className={`text-sm truncate mt-0.5 ${
                    email.unread ? "text-white/80" : "text-white/50"
                  }`}
                >
                  {email.subject}
                </p>
                <p className="text-xs text-white/30 truncate mt-0.5 leading-relaxed">
                  {email.snippet}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return "now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    if (diff < 604_800_000) return d.toLocaleDateString(undefined, { weekday: "short" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
