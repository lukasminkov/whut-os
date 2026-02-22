"use client";

import { motion, AnimatePresence } from "framer-motion";

export interface NotificationItem {
  id: string;
  type: "email" | "notification" | "calendar";
  sender: string;
  senderAvatar?: string;
  subject: string;
  preview: string;
  time: string;
  unread?: boolean;
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "from-violet-500/60 to-indigo-500/60",
    "from-emerald-500/60 to-teal-500/60",
    "from-rose-500/60 to-pink-500/60",
    "from-amber-500/60 to-orange-500/60",
    "from-cyan-500/60 to-blue-500/60",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function NotificationCard({ item, index }: { item: NotificationItem; index: number }) {
  return (
    <motion.div
      className="flex items-start gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] transition cursor-pointer"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ delay: index * 0.08, type: "spring", damping: 22 }}
    >
      {/* Avatar */}
      <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${getAvatarColor(item.sender)} flex items-center justify-center shrink-0`}>
        <span className="text-xs font-semibold text-white">{getInitial(item.sender)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-medium truncate ${item.unread ? "text-white" : "text-white/60"}`}>
            {item.sender}
          </span>
          <span className="text-[10px] text-white/30 shrink-0">{item.time}</span>
        </div>
        <div className={`text-xs truncate mt-0.5 ${item.unread ? "text-white/80" : "text-white/50"}`}>
          {item.subject}
        </div>
        <div className="text-[11px] text-white/30 truncate mt-0.5">{item.preview}</div>
      </div>

      {/* Action icon */}
      {item.type === "email" && (
        <button className="shrink-0 mt-1 text-white/20 hover:text-white/50 transition" title="Quick reply">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>
      )}

      {/* Unread dot */}
      {item.unread && (
        <span className="h-2 w-2 rounded-full bg-[#00d4aa] shrink-0 mt-2" />
      )}
    </motion.div>
  );
}

interface NotificationOverlayProps {
  items: NotificationItem[];
  visible: boolean;
  onClose?: () => void;
}

export default function NotificationOverlay({ items, visible, onClose }: NotificationOverlayProps) {
  const unreadCount = items.filter((i) => i.unread).length;

  return (
    <AnimatePresence>
      {visible && items.length > 0 && (
        <motion.div
          className="absolute z-40 w-[340px] max-h-[420px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-2xl"
          style={{ top: "50%", left: "50%", transform: "translate(calc(-50% + 200px), -50%)" }}
          initial={{ opacity: 0, x: 30, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30, scale: 0.9 }}
          transition={{ type: "spring", damping: 22 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-white/50">Activity</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#00d4aa]/20 text-[#00d4aa] rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {onClose && (
              <button onClick={onClose} className="text-white/30 hover:text-white/60 transition text-xs">✕</button>
            )}
          </div>

          {/* Items */}
          <div className="overflow-y-auto max-h-[360px] p-2 space-y-1 scrollbar-thin">
            {items.map((item, i) => (
              <NotificationCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Convert Gmail email objects to NotificationItems */
export function emailsToNotifications(emails: Array<{
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}>): NotificationItem[] {
  return emails.slice(0, 5).map((e) => ({
    id: e.id,
    type: "email" as const,
    sender: e.from.replace(/<.*>/, "").trim() || e.from,
    subject: e.subject,
    preview: e.snippet,
    time: formatRelativeTime(e.date),
    unread: e.unread,
  }));
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  } catch {
    return "";
  }
}
