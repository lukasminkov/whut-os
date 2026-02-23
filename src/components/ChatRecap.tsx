"use client";

import { useEffect, useRef, useState } from "react";
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
  onToggle: () => void;
}

export default function ChatRecap({ messages, visible, onToggle }: ChatRecapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Only show last 20 messages
  const recentMessages = messages.slice(-20);

  if (recentMessages.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed right-4 bottom-20 md:right-6 md:bottom-24 z-50 w-[320px] max-h-[50vh] flex flex-col"
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(0,212,170,0.02)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">
              Conversation
            </span>
            <button
              onClick={onToggle}
              className="text-white/20 hover:text-white/50 transition cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scroll-smooth" style={{ maxHeight: "calc(50vh - 44px)" }}>
            {recentMessages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[10px] font-medium shrink-0 ${
                    msg.role === "user" ? "text-white/40" : "text-[#00d4aa]/60"
                  }`}>
                    {msg.role === "user" ? "you" : "whut"}
                  </span>
                  <span className="text-[9px] text-white/15">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className={`text-xs leading-relaxed ${
                  msg.role === "user" ? "text-white/50" : "text-white/70"
                }`}>
                  {msg.role === "user" ? (
                    <p className="line-clamp-3">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert prose-xs max-w-none prose-p:my-0.5 prose-p:leading-relaxed line-clamp-6 [&_*]:text-xs [&_p]:text-white/70 [&_strong]:text-white/80 [&_code]:text-[#00d4aa]/80 [&_code]:text-[10px]">
                      <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
