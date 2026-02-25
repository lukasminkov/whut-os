"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ThinkingOverlayProps {
  active: boolean;
  statusText?: string | null;
  /** Called when the "burst" completes after thinking ends */
  onBurstComplete?: () => void;
}

// Typewriter text component
function TypewriterText({ text, speed = 35 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    if (!text) return;

    const timer = setInterval(() => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) clearInterval(timer);
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {displayed.length < (text?.length || 0) && (
        <span className="typewriter-cursor" />
      )}
    </span>
  );
}

export default function ThinkingOverlay({ active, statusText, onBurstComplete }: ThinkingOverlayProps) {
  const [showBurst, setShowBurst] = useState(false);
  const wasActive = useRef(false);

  // Detect transition from active → inactive (completion burst)
  useEffect(() => {
    if (wasActive.current && !active) {
      setShowBurst(true);
      const t = setTimeout(() => {
        setShowBurst(false);
        onBurstComplete?.();
      }, 600);
      return () => clearTimeout(t);
    }
    wasActive.current = active;
  }, [active, onBurstComplete]);

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-25 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            {/* Radial pulse rings */}
            {[0, 0.7, 1.4].map((delay, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 300 + i * 100,
                  height: 300 + i * 100,
                  background: `radial-gradient(circle, rgba(0,212,170,${0.04 - i * 0.01}) 0%, transparent 70%)`,
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay,
                  ease: "easeInOut",
                }}
              />
            ))}

            {/* Outer ring */}
            <motion.div
              className="absolute w-[500px] h-[500px] rounded-full"
              style={{
                border: "1px solid rgba(0,212,170,0.06)",
              }}
              animate={{
                scale: [0.9, 1.1, 0.9],
                opacity: [0.2, 0.5, 0.2],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            {/* Status text */}
            {statusText && (
              <motion.div
                className="absolute"
                style={{ top: "58%" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="font-mono text-[11px] text-white/30 tracking-[0.25em] uppercase">
                  <TypewriterText text={statusText} speed={30} />
                </p>
              </motion.div>
            )}

            {/* Corner brackets */}
            <svg className="absolute w-[400px] h-[400px] opacity-20" viewBox="0 0 400 400">
              <motion.g
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {/* Top-left */}
                <path d="M 20 60 L 20 20 L 60 20" stroke="rgba(0,212,170,1)" strokeWidth="1" fill="none" />
                {/* Top-right */}
                <path d="M 340 20 L 380 20 L 380 60" stroke="rgba(0,212,170,1)" strokeWidth="1" fill="none" />
                {/* Bottom-left */}
                <path d="M 20 340 L 20 380 L 60 380" stroke="rgba(0,212,170,1)" strokeWidth="1" fill="none" />
                {/* Bottom-right */}
                <path d="M 340 380 L 380 380 L 380 340" stroke="rgba(0,212,170,1)" strokeWidth="1" fill="none" />
              </motion.g>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Energy burst on completion */}
      <AnimatePresence>
        {showBurst && (
          <motion.div
            className="fixed inset-0 z-25 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="w-[200px] h-[200px] rounded-full energy-burst"
              style={{
                background: "radial-gradient(circle, rgba(0,212,170,0.3) 0%, rgba(0,212,170,0.05) 40%, transparent 70%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
