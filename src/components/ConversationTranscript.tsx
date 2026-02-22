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
      className="fixed z-40 pointer-events-none select-none"
      style={{
        bottom: 80,
        right: 24,
        maxWidth: 350,
        maxHeight: 260,
        overflow: "hidden",
      }}
    >
      <AnimatePresence initial={false}>
        {visible.map((msg, idx) => {
          const isOldest = idx === 0 && visible.length >= maxVisible;
          const baseOpacity = isOldest ? 0.3 : idx === 0 && visible.length > 2 ? 0.5 : 1;

          const truncatedText =
            msg.role === "assistant" && msg.text.length > 100
              ? msg.text.slice(0, 100) + "..."
              : msg.text;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: baseOpacity, y: 0 }}
              exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{ marginBottom: msg.role === "user" ? 8 : 12 }}
            >
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  fontWeight: 400,
                  color:
                    msg.role === "user"
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(0,212,170,0.75)",
                  margin: 0,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginRight: 6,
                    color:
                      msg.role === "user"
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,212,170,0.5)",
                  }}
                >
                  {msg.role === "user" ? "You" : "WHUT"}
                </span>
                {truncatedText}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
