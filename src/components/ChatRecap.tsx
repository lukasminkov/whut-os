"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

export interface RecapMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface ChatRecapProps {
  messages: RecapMessage[];
  visible: boolean;
  onClose: () => void;
  onToggle?: () => void; // kept for backward compat (window-manager usage)
}

export default function ChatRecap({ messages, visible, onClose, onToggle }: ChatRecapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const recentMessages = messages.slice(-30);

  if (recentMessages.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar panel — slides in from right */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-[61] w-[360px] max-w-[85vw] flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{
              background: "rgba(10, 10, 14, 0.85)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              borderLeft: "1px solid rgba(0, 212, 170, 0.1)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.5), -2px 0 20px rgba(0,212,170,0.03)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#00d4aa] shadow-[0_0_8px_rgba(0,212,170,0.4)]" />
                <span className="text-xs uppercase tracking-[0.2em] text-white/50 font-medium">
                  Conversation
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-all cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}
            >
              {recentMessages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[10px] font-medium shrink-0 uppercase tracking-wider ${
                      msg.role === "user" ? "text-white/35" : "text-[#00d4aa]/70"
                    }`}>
                      {msg.role === "user" ? "you" : "whut"}
                    </span>
                    <span className="text-[9px] text-white/15 tabular-nums">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.streaming && (
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]/60"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <div className={`text-[13px] leading-relaxed ${
                    msg.role === "user" ? "text-white/50" : "text-white/75"
                  }`}>
                    {msg.role === "user" ? (
                      <p>{msg.content}</p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed [&_p]:text-white/75 [&_strong]:text-white/85 [&_code]:text-[#00d4aa]/80 [&_code]:text-xs [&_code]:bg-white/[0.04] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
                        <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#00d4aa]/20 to-transparent" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
