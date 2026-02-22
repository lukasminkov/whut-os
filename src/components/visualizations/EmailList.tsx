"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Email {
  id?: string;
  threadId?: string;
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

function getInitials(name: string): string {
  const clean = name.replace(/<.*>/, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

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

function formatFullDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/);
  return match ? match[1] : from.trim();
}

function extractName(from: string): string {
  return from.replace(/<.*>/, "").replace(/"/g, "").trim();
}

function getTokenHeaders(): Record<string, string> {
  try {
    const tokens = JSON.parse(localStorage.getItem("whut_google_tokens") || "{}");
    const h: Record<string, string> = {};
    if (tokens.access_token) h["x-google-access-token"] = tokens.access_token;
    if (tokens.refresh_token) h["x-google-refresh-token"] = tokens.refresh_token;
    return h;
  } catch {
    return {};
  }
}

function handleTokenRefresh(json: any) {
  if (json.new_access_token) {
    try {
      const tokens = JSON.parse(localStorage.getItem("whut_google_tokens") || "{}");
      tokens.access_token = json.new_access_token;
      if (json.new_expires_at) tokens.expires_at = json.new_expires_at;
      localStorage.setItem("whut_google_tokens", JSON.stringify(tokens));
    } catch {}
  }
}

const spring = { type: "spring" as const, stiffness: 200, damping: 25 };

export default function EmailList({ data, title }: EmailListProps) {
  const allEmails: Email[] = Array.isArray(data) ? data : data?.emails ?? [];
  const [emails, setEmails] = useState<Email[]>(allEmails);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emailBodies, setEmailBodies] = useState<Record<string, { body: string; bodyType: string; to?: string }>>({});
  const [loadingBody, setLoadingBody] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Sync when parent data changes
  useEffect(() => {
    setEmails(Array.isArray(data) ? data : data?.emails ?? []);
  }, [data]);

  // Fetch full body when email selected
  useEffect(() => {
    if (!selectedId || emailBodies[selectedId]) return;
    setLoadingBody(selectedId);
    fetch(`/api/data/gmail/getMessage?id=${selectedId}`, { headers: getTokenHeaders() })
      .then((r) => r.json())
      .then((json) => {
        handleTokenRefresh(json);
        const d = json.data ?? json;
        setEmailBodies((prev) => ({
          ...prev,
          [selectedId]: { body: d.body || d.snippet || "", bodyType: d.bodyType || "text", to: d.to },
        }));
      })
      .catch(() => {})
      .finally(() => setLoadingBody(null));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setReplyingTo(null);
    setReplyBody("");
    setSendSuccess(false);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setReplyingTo(null);
    setReplyBody("");
    setSendSuccess(false);
  }, []);

  const handleArchive = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/data/gmail/archiveEmail?id=${id}`, { headers: getTokenHeaders() });
      const json = await res.json();
      handleTokenRefresh(json);
      setEmails((prev) => prev.filter((e) => e.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {}
    setActionLoading(null);
  }, [selectedId]);

  const handleTrash = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/data/gmail/trashEmail?id=${id}`, { headers: getTokenHeaders() });
      const json = await res.json();
      handleTokenRefresh(json);
      setEmails((prev) => prev.filter((e) => e.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {}
    setActionLoading(null);
  }, [selectedId]);

  const handleSendReply = useCallback(async () => {
    if (!replyingTo || !replyBody.trim()) return;
    const email = emails.find((e) => e.id === replyingTo);
    if (!email) return;
    setSending(true);
    try {
      const tokens = JSON.parse(localStorage.getItem("whut_google_tokens") || "{}");
      const res = await fetch("/api/google/gmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-google-access-token": tokens.access_token || "",
          "x-google-refresh-token": tokens.refresh_token || "",
        },
        body: JSON.stringify({
          to: extractEmail(email.from),
          subject: `Re: ${email.subject}`,
          body: replyBody,
        }),
      });
      const json = await res.json();
      handleTokenRefresh(json);
      if (res.ok) {
        setSendSuccess(true);
        setTimeout(() => {
          setReplyingTo(null);
          setReplyBody("");
          setSendSuccess(false);
        }, 2000);
      }
    } catch {}
    setSending(false);
  }, [replyingTo, replyBody, emails]);

  const selectedEmail = emails.find((e) => e.id === selectedId);

  if (emails.length === 0) {
    return (
      <div className="space-y-2">
        {title && <div className="text-[10px] uppercase tracking-[0.3em] text-white/25 mb-3 pl-1">{title}</div>}
        <p className="text-sm text-white/30 py-8 text-center">No emails to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title && <div className="text-[10px] uppercase tracking-[0.3em] text-white/25 mb-3 pl-1">{title}</div>}

      <div className={`flex gap-3 ${selectedId ? "items-start" : ""}`}>
        {/* Email list / sidebar */}
        <motion.div
          layout
          transition={spring}
          className={selectedId ? "w-[35%] max-w-[260px] shrink-0 hidden md:block" : "w-full"}
        >
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {emails.map((email, i) => (
                <motion.div
                  key={email.id ?? i}
                  layout
                  transition={spring}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, x: -80, transition: { duration: 0.25 } }}
                  onClick={() => email.id && handleSelect(email.id)}
                  className={`group flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    email.id === selectedId
                      ? "border-white/[0.15] bg-white/[0.08]"
                      : "border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                  style={{
                    background:
                      email.id === selectedId
                        ? "rgba(255,255,255,0.08)"
                        : email.unread
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
                  <div
                    className={`shrink-0 ${selectedId ? "w-7 h-7" : "w-9 h-9"} rounded-full bg-gradient-to-br ${avatarColor(email.from)} flex items-center justify-center mt-0.5`}
                  >
                    <span className={`${selectedId ? "text-[9px]" : "text-[11px]"} font-semibold text-white/90 leading-none`}>
                      {getInitials(email.from)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`${selectedId ? "text-[11px]" : "text-[13px]"} truncate ${
                          email.unread ? "font-semibold text-white" : "font-medium text-white/60"
                        }`}
                      >
                        {extractName(email.from)}
                      </span>
                      {!selectedId && (
                        <span className="text-[10px] text-white/25 shrink-0 tabular-nums">
                          {formatDate(email.date)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`${selectedId ? "text-[11px]" : "text-[13px]"} truncate mt-0.5 ${
                        email.unread ? "text-white/75" : "text-white/40"
                      }`}
                    >
                      {email.subject}
                    </p>
                    {!selectedId && (
                      <p className="text-[11px] text-white/20 truncate mt-1 leading-relaxed">
                        {email.snippet}
                      </p>
                    )}
                  </div>

                  {email.unread && !selectedId && (
                    <div className="shrink-0 mt-2">
                      <span className="block w-2 h-2 rounded-full bg-[#00d4aa] shadow-[0_0_8px_rgba(0,212,170,0.4)]" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Mobile back + detail */}
        <AnimatePresence mode="wait">
          {selectedId && selectedEmail && (
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={spring}
              className="flex-1 min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <button
                  onClick={handleClose}
                  className="text-white/40 hover:text-white/70 transition text-xs flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span className="md:hidden">Back</span>
                </button>
                <div className="flex items-center gap-1">
                  {/* Action buttons */}
                  <ActionButton
                    label="Reply"
                    onClick={() => { setReplyingTo(selectedId); setSendSuccess(false); }}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />}
                  />
                  <ActionButton
                    label="Archive"
                    loading={actionLoading === selectedId}
                    onClick={() => handleArchive(selectedId)}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />}
                  />
                  <ActionButton
                    label="Delete"
                    loading={actionLoading === selectedId}
                    onClick={() => handleTrash(selectedId)}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />}
                  />
                </div>
              </div>

              {/* Email detail */}
              <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto" ref={bodyRef}>
                {/* Subject */}
                <h2 className="text-lg font-semibold text-white/90 leading-tight">
                  {selectedEmail.subject}
                </h2>

                {/* Sender info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(selectedEmail.from)} flex items-center justify-center`}
                  >
                    <span className="text-[12px] font-semibold text-white/90">{getInitials(selectedEmail.from)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white/80">{extractName(selectedEmail.from)}</div>
                    <div className="text-[11px] text-white/30">{extractEmail(selectedEmail.from)}</div>
                  </div>
                  <div className="ml-auto text-[11px] text-white/25 shrink-0">{formatFullDate(selectedEmail.date)}</div>
                </div>

                {/* Body */}
                <div className="border-t border-white/[0.06] pt-4">
                  {loadingBody === selectedId ? (
                    <div className="flex items-center gap-2 text-white/30 text-sm py-4">
                      <span className="inline-block h-3.5 w-3.5 border border-white/30 border-t-transparent rounded-full animate-spin" />
                      Loading email...
                    </div>
                  ) : emailBodies[selectedId]?.bodyType === "html" ? (
                    <div
                      className="text-sm text-white/60 leading-relaxed prose prose-invert prose-sm max-w-none [&_*]:!text-white/60 [&_a]:!text-[#00d4aa]/80"
                      dangerouslySetInnerHTML={{ __html: emailBodies[selectedId].body }}
                    />
                  ) : (
                    <pre className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap font-sans">
                      {emailBodies[selectedId]?.body || selectedEmail.snippet}
                    </pre>
                  )}
                </div>

                {/* Reply area */}
                <AnimatePresence>
                  {replyingTo === selectedId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-xl p-4 space-y-3">
                        {sendSuccess ? (
                          <div className="flex items-center gap-2 py-3 justify-center">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-sm text-white/60">Reply sent</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-[11px] text-white/30">
                              <span>To: {extractEmail(selectedEmail.from)}</span>
                              <span className="text-white/15">·</span>
                              <span>Re: {selectedEmail.subject}</span>
                            </div>
                            <textarea
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                              rows={4}
                              autoFocus
                              placeholder="Write your reply..."
                              className="w-full bg-transparent text-sm text-white/70 outline-none resize-none placeholder:text-white/20 leading-relaxed"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setReplyingTo(null); setReplyBody(""); }}
                                className="px-3 py-1.5 text-xs text-white/40 hover:text-white/60 transition"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSendReply}
                                disabled={sending || !replyBody.trim()}
                                className="px-4 py-1.5 text-xs font-medium text-white bg-[#00d4aa]/80 hover:bg-[#00d4aa] disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg flex items-center gap-1.5"
                              >
                                {sending ? (
                                  <>
                                    <span className="inline-block h-3 w-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  "Send Reply"
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile: show full-screen detail when selected */}
        {selectedId && (
          <style>{`
            @media (max-width: 767px) {
              /* Hide sidebar on mobile when detail is open - handled by hidden md:block above */
            }
          `}</style>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  icon,
  loading,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group/btn px-2.5 py-1.5 text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all rounded-lg flex items-center gap-1.5 disabled:opacity-30"
      title={label}
    >
      {loading ? (
        <span className="inline-block h-3.5 w-3.5 border border-white/30 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon}
        </svg>
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
