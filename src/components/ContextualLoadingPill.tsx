"use client";

import { motion, AnimatePresence } from "framer-motion";

export type LoadingAction =
  | "sending_email"
  | "searching"
  | "analyzing"
  | "connecting"
  | "thinking"
  | null;

const actionConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  sending_email: {
    label: "Sending email...",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  searching: {
    label: "Searching for information...",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  analyzing: {
    label: "Analyzing data...",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  connecting: {
    label: "Connecting to service...",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.636a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
      </svg>
    ),
  },
  thinking: {
    label: "Thinking...",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
};

export function detectLoadingAction(input: string): LoadingAction {
  const lower = input.toLowerCase();
  if (/send.*email|email.*to|compose.*email|write.*email|draft.*email/.test(lower)) return "sending_email";
  if (/search|find|look up|google|research/.test(lower)) return "searching";
  if (/analy|data|chart|metric|stat|report|revenue|sales/.test(lower)) return "analyzing";
  if (/connect|integrate|link|sync/.test(lower)) return "connecting";
  return "thinking";
}

export default function ContextualLoadingPill({ action }: { action: LoadingAction }) {
  return (
    <AnimatePresence>
      {action && actionConfig[action] && (
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <motion.span
            className="text-white/50"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            {actionConfig[action].icon}
          </motion.span>
          <motion.span
            className="text-xs text-white/50 tracking-wide"
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {actionConfig[action].label}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
