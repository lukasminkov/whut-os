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

// Extract initials from email sender name
function getInitials(name: string): string {
  const clean = name.replace(/<.*>/, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

// Consistent color from name
function avatarColor(name: string): string {
  const colors = [
    "from-cyan-500/80 to-blue-600/80",
    "from-violet-500/80 to-purple-600/80",
    "from-emerald-500/80 to-teal-600/80",
    "from-amber-500/80 to-orange-600/80",
    "from-rose-500/80 to-pink-600/80",
    "from-indigo-500/80 to-blue-700/80",
    "from-lime-500/80 to-green-600/80",
    "from-fuchsia-500/80 to-purple-700/80",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function EmailList({ data, title }: EmailListProps) {
  const emails: Email[] = Array.isArray(data) ? data : data?.emails ?? [];

  return (
    <div className="space-y-2">
      {title && (
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/25 mb-3 pl-1">{title}</div>
      )}
      {emails.length === 0 ? (
        <p className="text-sm text-white/30 py-8 text-center">No emails to display</p>
      ) : (
        <div className="space-y-1.5">
          {emails.map((email, i) => (
            <motion.div
              key={email.id ?? i}
              className="group flex items-start gap-3.5 px-4 py-3.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-default"
              style={{
                background: email.unread
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              whileHover={{
                background: "rgba(255, 255, 255, 0.07)",
                transition: { duration: 0.15 },
              }}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(email.from)} flex items-center justify-center mt-0.5`}
              >
                <span className="text-[11px] font-semibold text-white/90 leading-none">
                  {getInitials(email.from)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`text-[13px] truncate ${
                      email.unread ? "font-semibold text-white" : "font-medium text-white/60"
                    }`}
                  >
                    {email.from.replace(/<.*>/, "").trim()}
                  </span>
                  <span className="text-[10px] text-white/25 shrink-0 tabular-nums">
                    {formatDate(email.date)}
                  </span>
                </div>
                <p
                  className={`text-[13px] truncate mt-0.5 ${
                    email.unread ? "text-white/75" : "text-white/40"
                  }`}
                >
                  {email.subject}
                </p>
                <p className="text-[11px] text-white/20 truncate mt-1 leading-relaxed">
                  {email.snippet}
                </p>
              </div>

              {/* Unread indicator */}
              {email.unread && (
                <div className="shrink-0 mt-2">
                  <span className="block w-2 h-2 rounded-full bg-[#00d4aa] shadow-[0_0_8px_rgba(0,212,170,0.4)]" />
                </div>
              )}
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
