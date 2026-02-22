"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface EmailComposeProps {
  data: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  };
  onSend?: (result: { success: boolean; message: string }) => void;
  onClose?: () => void;
}

function getGoogleTokens() {
  try {
    return JSON.parse(localStorage.getItem("whut_google_tokens") || "{}");
  } catch {
    return {};
  }
}

function isGoogleConnected() {
  const t = getGoogleTokens();
  return !!t.access_token;
}

export default function EmailCompose({ data, onSend, onClose }: EmailComposeProps) {
  const [to, setTo] = useState(data.to);
  const [subject, setSubject] = useState(data.subject);
  const [body, setBody] = useState(data.body);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromEmail, setFromEmail] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(true);

  // Resolve the sender email
  useEffect(() => {
    if (data.from) {
      setFromEmail(data.from);
      setLoadingEmail(false);
      return;
    }

    const tokens = getGoogleTokens();

    // Already cached in tokens
    if (tokens.email) {
      setFromEmail(tokens.email);
      setLoadingEmail(false);
      return;
    }

    // No access token → not connected
    if (!tokens.access_token) {
      setLoadingEmail(false);
      return;
    }

    // Fetch from Google userinfo and cache it
    (async () => {
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (res.ok) {
          const info = await res.json();
          if (info.email) {
            setFromEmail(info.email);
            // Cache it in localStorage for next time
            tokens.email = info.email;
            localStorage.setItem("whut_google_tokens", JSON.stringify(tokens));
          }
        }
      } catch {
        // Silently fail — will show "Unknown" in worst case
      } finally {
        setLoadingEmail(false);
      }
    })();
  }, [data.from]);

  // Not connected state
  if (!isGoogleConnected()) {
    return (
      <motion.div
        className="w-full max-w-lg mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
            <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-white/80">Connect your Gmail to send emails</div>
            <div className="text-xs text-white/40 mt-1">Link your Google account to compose and send emails directly from WHUT OS.</div>
          </div>
          <Link
            href="/dashboard/integrations"
            className="mt-2 px-5 py-2.5 text-xs font-medium text-[#00d4aa] bg-[#00d4aa]/10 hover:bg-[#00d4aa]/20 border border-[#00d4aa]/30 rounded-xl transition-all"
          >
            Go to Integrations →
          </Link>
        </div>
      </motion.div>
    );
  }

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const tokens = getGoogleTokens();
      if (!tokens.access_token) {
        throw new Error("Google not connected. Go to Integrations to connect.");
      }
      const res = await fetch("/api/google/gmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-google-access-token": tokens.access_token,
          "x-google-refresh-token": tokens.refresh_token || "",
        },
        body: JSON.stringify({ to, subject, body }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send");

      // Update tokens if refreshed
      if (result.new_access_token) {
        tokens.access_token = result.new_access_token;
        if (result.new_expires_at) tokens.expires_at = result.new_expires_at;
        localStorage.setItem("whut_google_tokens", JSON.stringify(tokens));
      }

      setSent(true);
      onSend?.({ success: true, message: `Sent to ${to}` });
    } catch (err: any) {
      setError(err.message);
      onSend?.({ success: false, message: err.message });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        className="w-full max-w-lg mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-sm text-white/80 font-medium">Email sent successfully</div>
          <div className="text-xs text-white/40">To: {to}</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-lg mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">New Email</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition text-xs">✕</button>
        )}
      </div>

      {/* Fields */}
      <div className="px-5 py-3 space-y-0">
        {/* From */}
        <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04]">
          <span className="text-xs text-white/30 w-14 shrink-0">From</span>
          {loadingEmail ? (
            <span className="text-sm text-white/30 animate-pulse">Loading...</span>
          ) : (
            <span className="text-sm text-white/50">{fromEmail || "Unknown"}</span>
          )}
        </div>

        {/* To */}
        <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04]">
          <span className="text-xs text-white/30 w-14 shrink-0">To</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/20"
            placeholder="recipient@email.com"
          />
        </div>

        {/* Subject */}
        <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04]">
          <span className="text-xs text-white/30 w-14 shrink-0">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/20"
            placeholder="Subject"
          />
        </div>

        {/* Body */}
        <div className="py-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full bg-transparent text-sm text-white/70 outline-none resize-none placeholder:text-white/20 leading-relaxed"
            placeholder="Write your message..."
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 pb-2">
          <div className="text-xs text-red-400/80 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
        <button
          className="px-4 py-2 text-xs text-white/40 hover:text-white/60 transition rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
          onClick={() => {/* placeholder for schedule */}}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Schedule
          </span>
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !to || !subject}
          className="px-5 py-2 text-xs font-medium text-white bg-[#00d4aa]/80 hover:bg-[#00d4aa] disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg flex items-center gap-2"
        >
          {sending ? (
            <>
              <span className="inline-block h-3 w-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Send now
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
