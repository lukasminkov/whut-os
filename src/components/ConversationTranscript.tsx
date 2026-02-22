"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface ConversationTranscriptProps {
  messages: TranscriptMessage[];
  maxVisible?: number;
}

export default function ConversationTranscript({
  messages,
  maxVisible = 5,
}: ConversationTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visible = messages.slice(-maxVisible);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (visible.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-20 md:bottom-24 right-4 md:right-8 z-40 max-w-[320px] md:max-w-[380px] pointer-events-none select-none"
      style={{ maxHeight: "200px", overflow: "hidden" }}
    >
      <AnimatePresence initial={false}>
        {visible.map((msg, idx) => {
          const isOldest = idx === 0 && visible.length >= maxVisible;
          const opacity = isOldest ? 0.35 : idx === 0 && visible.length > 2 ? 0.5 : 0.75;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity, y: 0 }}
              exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-1.5"
            >
              <p
                className="text-[13px] leading-[1.4] font-light"
                style={{ color: msg.role === "user" ? "rgba(255,255,255,0.6)" : "rgba(0,212,170,0.7)" }}
              >
                <span className="font-medium" style={{ color: msg.role === "user" ? "rgba(255,255,255,0.5)" : "rgba(0,212,170,0.6)" }}>
                  {msg.role === "user" ? "You" : "WHUT"}:
                </span>{" "}
                {msg.text.length > 120 ? msg.text.slice(0, 120) + "…" : msg.text}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
