"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface ComposeData {
  to?: string;
  subject?: string;
  body?: string;
}

export default function EmailComposeCard({ data }: { data: ComposeData }) {
  const [to, setTo] = useState(data?.to || "");
  const [subject, setSubject] = useState(data?.subject || "");
  const [body, setBody] = useState(data?.body || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const dirtyRef = useRef(new Set<string>());

  // Sync non-dirty fields from AI updates
  useEffect(() => {
    if (data?.to && !dirtyRef.current.has("to")) setTo(data.to);
    if (data?.subject && !dirtyRef.current.has("subject")) setSubject(data.subject);
    if (data?.body && !dirtyRef.current.has("body")) setBody(data.body);
  }, [data]);

  const markDirty = (field: string) => dirtyRef.current.add(field);

  const handleSend = useCallback(async () => {
    if (!to || !subject) return;
    setSending(true);
    try {
      const tokens = JSON.parse(localStorage.getItem("whut_google_tokens") || "{}");
      const res = await fetch("/api/google/gmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access_token || ""}`,
        },
        body: JSON.stringify({ to, subject, body }),
      });
      if (res.ok) setSent(true);
    } catch {} finally {
      setSending(false);
    }
  }, [to, subject, body]);

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="text-2xl">✓</div>
        <p className="text-sm text-white/60">Email sent to {to}</p>
      </div>
    );
  }

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/25 outline-none focus:border-[#00d4aa]/40 transition-colors";

  return (
    <div className="space-y-3">
      <input
        className={inputCls}
        placeholder="To"
        value={to}
        onChange={e => { markDirty("to"); setTo(e.target.value); }}
      />
      <input
        className={inputCls}
        placeholder="Subject"
        value={subject}
        onChange={e => { markDirty("subject"); setSubject(e.target.value); }}
      />
      <textarea
        className={`${inputCls} min-h-[120px] resize-none`}
        placeholder="Write your message..."
        value={body}
        onChange={e => { markDirty("body"); setBody(e.target.value); }}
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={handleSend}
          disabled={sending || !to || !subject}
          className="px-4 py-2 rounded-lg bg-[#00d4aa]/20 text-[#00d4aa] text-sm font-medium hover:bg-[#00d4aa]/30 transition-colors disabled:opacity-40"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
