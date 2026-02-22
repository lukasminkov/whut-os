"use client";
import { motion } from "framer-motion";

interface Email {
  id: string;
  from: string;
  subject: string;
  snippet?: string;
  date: string;
  unread?: boolean;
}

export default function EmailListCard({ data }: { data: { emails: Email[] } }) {
  const emails = data?.emails || [];
  
  const formatFrom = (from: string) => {
    const match = from.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : from.split("@")[0];
  };

  const formatDate = (d: string) => {
    try {
      const date = new Date(d);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch { return d; }
  };

  return (
    <div className="space-y-0.5 max-h-[350px] overflow-y-auto custom-scrollbar">
      {emails.length === 0 && (
        <p className="text-xs text-white/30 text-center py-4">No emails found</p>
      )}
      {emails.map((email, i) => (
        <motion.div
          key={email.id || i}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer group"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          {email.unread && (
            <div className="w-2 h-2 rounded-full bg-[#00d4aa] mt-1.5 shrink-0" />
          )}
          {!email.unread && <div className="w-2 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm truncate ${email.unread ? "font-semibold text-white/90" : "text-white/70"}`}>
                {formatFrom(email.from)}
              </span>
              <span className="text-[10px] text-white/25 shrink-0">{formatDate(email.date)}</span>
            </div>
            <div className={`text-xs truncate mt-0.5 ${email.unread ? "text-white/70" : "text-white/40"}`}>
              {email.subject}
            </div>
            {email.snippet && (
              <div className="text-[11px] text-white/25 truncate mt-0.5">{email.snippet}</div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
