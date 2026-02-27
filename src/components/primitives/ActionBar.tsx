"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Action } from "@/lib/actions";
import InlineCompose from "./InlineCompose";

interface ActionBarProps {
  actions: Action[];
}

export default function ActionBar({ actions }: ActionBarProps) {
  const [activeCompose, setActiveCompose] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  if (actions.length === 0) return null;

  // Group actions
  const groups = new Map<string, Action[]>();
  for (const action of actions) {
    const group = action.group || "__default";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(action);
  }

  const handleClick = async (action: Action) => {
    if (action.compose) {
      setActiveCompose(activeCompose === action.id ? null : action.id);
      return;
    }
    if (action.execute) {
      setLoadingActions(prev => new Set(prev).add(action.id));
      try {
        await action.execute();
      } catch (err) {
        console.error(`Action ${action.id} failed:`, err);
      } finally {
        setLoadingActions(prev => {
          const next = new Set(prev);
          next.delete(action.id);
          return next;
        });
      }
    }
  };

  const activeAction = actions.find(a => a.id === activeCompose);

  const variantClasses: Record<string, string> = {
    primary: "bg-[#00d4aa]/15 text-[#00d4aa] border-[#00d4aa]/30 hover:bg-[#00d4aa]/25",
    secondary: "bg-white/[0.04] text-white/60 border-white/[0.08] hover:bg-white/[0.08] hover:text-white/80",
    danger: "bg-red-500/10 text-red-400/80 border-red-500/20 hover:bg-red-500/20",
    ghost: "bg-transparent text-white/40 border-white/[0.06] hover:bg-white/[0.04] hover:text-white/60",
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {Array.from(groups.entries()).map(([group, groupActions], gi) => (
          <div key={group} className="contents">
            {gi > 0 && <div className="w-px h-6 bg-white/[0.06] self-center mx-1" />}
            {groupActions.map(action => {
              const isActive = activeCompose === action.id;
              const isLoading = loadingActions.has(action.id);
              return (
                <button
                  key={action.id}
                  onClick={() => handleClick(action)}
                  disabled={action.disabled || isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150
                    disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer
                    ${isActive ? "bg-[#00d4aa]/20 text-[#00d4aa] border-[#00d4aa]/40 ring-1 ring-[#00d4aa]/20" : variantClasses[action.variant || "secondary"]}
                  `}
                >
                  <span className="flex items-center gap-1.5">
                    {isLoading && (
                      <span className="inline-block h-3 w-3 border border-current/40 border-t-transparent rounded-full animate-spin" />
                    )}
                    {action.icon}
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Inline compose panel */}
      <AnimatePresence mode="wait">
        {activeAction?.compose && (
          <motion.div
            key={activeAction.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <InlineCompose
              config={activeAction.compose}
              onClose={() => setActiveCompose(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
