"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Card } from "@/lib/card-types";

interface Email {
  id: string;
  from: string;
  subject: string;
  snippet?: string;
  date: string;
  unread?: boolean;
}

function getGoogleTokens() {
  try { return JSON.parse(localStorage.getItem("whut_google_tokens") || "{}"); }
  catch { return {}; }
}

export default function EmailListCard({
  data,
  onAddCard,
}: {
  data: { emails: Email[] };
  onAddCard?: (card: Card) => void;
}) {
  const emails = data?.emails || [];
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  const handleClick = async (email: Email) => {
    if (!onAddCard) return;
    setLoadingId(email.id);

    // Try to fetch full email body
    let body = email.snippet || "";
    try {
      const tokens = getGoogleTokens();
      if (tokens.access_token && email.id) {
        const res = await fetch(
          `/api/data/gmail/getMessage?id=${email.id}`,
          {
            headers: {
              "x-google-access-token": tokens.access_token,
              "x-google-refresh-token": tokens.refresh_token || "",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          body = data.data?.body || data.body || body;
        }
      }
    } catch {}

    setLoadingId(null);

    onAddCard({
      id: `email-detail-${email.id}`,
      type: "email-detail",
      title: email.subject,
      priority: 1,
      size: "large",
      interactive: true,
      position: { x: 50, y: 40 },
      data: {
        id: email.id,
        from: email.from,
        to: "me",
        subject: email.subject,
        date: email.date,
        body,
      },
    });
  };

  return (
    <div className="space-y-0.5 max-h-[400px] overflow-y-auto custom-scrollbar">
      {emails.length === 0 && (
        <p className="text-xs text-white/30 text-center py-4">No emails found</p>
      )}
      {emails.map((email, i) => (
        <motion.div
          key={email.id || i}
          onClick={() => handleClick(email)}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer group"
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
              {loadingId === email.id && (
                <span className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin shrink-0" />
              )}
            </div>
            <div className={`text-xs truncate mt-0.5 ${email.unread ? "text-white/70" : "text-white/40"}`}>
              {email.subject}
            </div>
            {email.snippet && (
              <div className="text-[11px] text-white/25 truncate mt-0.5">{email.snippet}</div>
            )}
          </div>
          <svg className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
