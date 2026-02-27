"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Reply, ReplyAll, Forward, Archive, Trash2, MailOpen,
  RefreshCw, ImageDown, FileSpreadsheet, Maximize2,
  Pencil, CheckCircle, Video, StickyNote,
  Download, Share2, FolderInput, Type,
  FileDown, History, Printer,
  SmilePlus, MessageSquare, Pin,
  ArrowDownToLine, Bell, ArrowLeftRight,
  ExternalLink, Copy,
  MoreHorizontal, Sparkles, Mic,
} from "lucide-react";
import type { UniversalAction, AIAction, ActionContext } from "@/lib/actions/universal-types";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Reply, ReplyAll, Forward, Archive, Trash2, MailOpen,
  RefreshCw, ImageDown, FileSpreadsheet, Maximize2,
  Pencil, CheckCircle, Video, StickyNote,
  Download, Share2, FolderInput, Type,
  FileDown, History, Printer,
  SmilePlus, MessageSquare, Pin,
  ArrowDownToLine, Bell, ArrowLeftRight,
  ExternalLink, Copy,
};

interface ActionBarProps {
  actions: UniversalAction[];
  aiActions: AIAction[];
  context: ActionContext;
  onVoiceActivate?: () => void;
  voiceActive?: boolean;
  className?: string;
}

export default function ActionBar({
  actions, aiActions, context,
  onVoiceActivate, voiceActive = false, className = "",
}: ActionBarProps) {
  const [showOverflow, setShowOverflow] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const primaryActions = useMemo(
    () => actions.filter((a) => a.primary && !a.hidden?.(context)).slice(0, 3),
    [actions, context],
  );
  const secondaryActions = useMemo(
    () => actions.filter((a) => !a.primary && !a.hidden?.(context)),
    [actions, context],
  );

  const handleAction = useCallback(async (action: UniversalAction) => {
    if (action.destructive && confirmAction !== action.id) {
      setConfirmAction(action.id);
      setTimeout(() => setConfirmAction(null), 3000);
      return;
    }
    setConfirmAction(null);
    setShowOverflow(false);
    try { await action.execute(context); }
    catch (err) { context.helpers.toast?.(`Failed: ${err}`, "error"); }
  }, [context, confirmAction]);

  const handleAIAction = useCallback(async (action: AIAction) => {
    setAiLoading(action.id);
    setShowAI(false);
    try {
      const prompt = action.prompt(context);
      const response = await context.helpers.executeAIAction(prompt, action.inline);
      if (action.inline) context.helpers.setOverlayContent(response);
    } catch (err) {
      context.helpers.toast?.(`AI failed: ${err}`, "error");
    } finally { setAiLoading(null); }
  }, [context]);

  if (actions.length === 0 && aiActions.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg backdrop-blur-xl bg-white/[0.04] border border-white/[0.06]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {primaryActions.map((action) => {
          const Icon = ICONS[action.icon];
          const isConfirming = confirmAction === action.id;
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
                isConfirming ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : action.destructive ? "text-white/50 hover:text-red-400 hover:bg-red-500/10"
                : "text-white/50 hover:text-[#00d4aa] hover:bg-[#00d4aa]/10"
              }`}
              title={isConfirming ? `Confirm ${action.label}?` : action.label}
            >
              {Icon && <Icon size={13} />}
              <span className="hidden sm:inline">{isConfirming ? "Confirm?" : action.label}</span>
            </button>
          );
        })}

        {primaryActions.length > 0 && (aiActions.length > 0 || secondaryActions.length > 0) && (
          <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
        )}

        {aiActions.length > 0 && (
          <button
            onClick={() => { setShowAI(!showAI); setShowOverflow(false); }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
              showAI ? "text-[#00d4aa] bg-[#00d4aa]/10" : "text-white/40 hover:text-[#00d4aa] hover:bg-[#00d4aa]/10"
            } ${aiLoading ? "animate-pulse" : ""}`}
            title="AI Actions"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">AI</span>
          </button>
        )}

        {secondaryActions.length > 0 && (
          <button
            onClick={() => { setShowOverflow(!showOverflow); setShowAI(false); }}
            className={`flex items-center px-1.5 py-1 rounded-md transition-all duration-150 ${
              showOverflow ? "text-white/70 bg-white/[0.06]" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
            }`}
            title="More actions"
          >
            <MoreHorizontal size={14} />
          </button>
        )}

        {onVoiceActivate && (
          <>
            <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
            <button
              onClick={onVoiceActivate}
              className={`flex items-center px-1.5 py-1 rounded-md transition-all duration-150 ${
                voiceActive ? "text-[#00d4aa] bg-[#00d4aa]/15 animate-pulse" : "text-white/30 hover:text-[#00d4aa] hover:bg-[#00d4aa]/10"
              }`}
              title="Voice command"
            >
              <Mic size={13} />
            </button>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {showOverflow && (
          <motion.div
            className="absolute bottom-full left-0 mb-1 min-w-[160px] rounded-lg backdrop-blur-xl bg-black/80 border border-white/[0.08] shadow-xl z-50 py-1"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {secondaryActions.map((action) => {
              const Icon = ICONS[action.icon];
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors duration-100 ${
                    action.destructive ? "text-white/50 hover:text-red-400 hover:bg-red-500/10" : "text-white/50 hover:text-white/90 hover:bg-white/[0.06]"
                  }`}
                >
                  {Icon && <Icon size={13} />}
                  {action.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAI && (
          <motion.div
            className="absolute bottom-full left-0 mb-1 min-w-[180px] rounded-lg backdrop-blur-xl bg-black/80 border border-[#00d4aa]/20 shadow-xl shadow-[#00d4aa]/5 z-50 py-1"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="px-3 py-1 text-[9px] text-[#00d4aa]/60 uppercase tracking-widest font-medium">
              ✨ AI Actions
            </div>
            {aiActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAIAction(action)}
                disabled={aiLoading === action.id}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/50 hover:text-[#00d4aa] hover:bg-[#00d4aa]/10 transition-colors duration-100 disabled:opacity-50"
              >
                <Sparkles size={11} className="text-[#00d4aa]/50" />
                {action.label}
                {aiLoading === action.id && <span className="ml-auto text-[9px] text-[#00d4aa]/50 animate-pulse">thinking...</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
