"use client";

import { AnimatePresence, motion } from "framer-motion";
import AIOrb from "@/components/AIOrb";
import type { OrbState } from "@/components/AIOrb";
import ChatRecap, { type RecapMessage } from "@/components/ChatRecap";
import ThinkingOverlay from "@/components/ThinkingOverlay";
import Workspace from "@/features/window-manager/Workspace";
import type { WindowType } from "@/features/window-manager";

const SUGGESTIONS = [
  "What's my day look like?",
  "Show my emails",
  "Search the web",
];

interface DashboardShellProps {
  orbState: OrbState;
  audioLevel: number;
  thinking: boolean;
  statusText: string | null;
  currentScene: any;
  chatMessages: RecapMessage[];
  showRecap: boolean;
  setShowRecap: (v: boolean) => void;
  sendToAI: (msg: string) => void;
  renderWindow: (type: WindowType, props?: Record<string, unknown>) => React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardShell({
  orbState, audioLevel, thinking, statusText, currentScene,
  chatMessages, showRecap, setShowRecap, sendToAI,
  renderWindow, children,
}: DashboardShellProps) {
  const showQuietState = !currentScene && !thinking;

  return (
    <div className="h-full w-full overflow-hidden relative">
      <AIOrb state={orbState} audioLevel={audioLevel} />

      <Workspace renderWindow={renderWindow} />

      {/* Status indicator */}
      <AnimatePresence>
        {statusText && currentScene && (
          <motion.div
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-md"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          >
            <motion.div className="w-2 h-2 rounded-full bg-[#00d4aa]" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <span className="text-xs text-white/50">{statusText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ThinkingOverlay active={thinking && !currentScene} statusText={statusText} />

      {/* Quiet default state */}
      <AnimatePresence>
        {showQuietState && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <p className="text-lg text-white/30 mt-8">What can I help with?</p>
            <div className="flex flex-wrap justify-center gap-2 mt-6 pointer-events-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s} onClick={() => sendToAI(s)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat sidebar */}
      <ChatRecap messages={chatMessages} visible={showRecap && chatMessages.length > 0} onClose={() => setShowRecap(false)} />

      {/* Chat toggle */}
      <AnimatePresence>
        {!showRecap && chatMessages.length > 0 && (
          <motion.button
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-0 cursor-pointer group"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            onClick={() => setShowRecap(true)} title="Open conversation"
          >
            <div className="relative flex flex-col items-center py-3 px-1.5 rounded-l-lg transition-all group-hover:px-2.5"
              style={{
                background: "rgba(10, 10, 14, 0.7)", backdropFilter: "blur(20px)",
                borderLeft: "1px solid rgba(0, 212, 170, 0.15)",
                borderTop: "1px solid rgba(0, 212, 170, 0.08)",
                borderBottom: "1px solid rgba(0, 212, 170, 0.08)",
              }}
            >
              <div className="w-[2px] h-8 rounded-full bg-gradient-to-b from-[#00d4aa]/60 via-[#00d4aa]/30 to-transparent group-hover:h-10 transition-all" />
              <div className="mt-1.5 text-[8px] font-mono text-[#00d4aa]/40 group-hover:text-[#00d4aa]/70 transition-colors tabular-nums">
                {chatMessages.length}
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
}
