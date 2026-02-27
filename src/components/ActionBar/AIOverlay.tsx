"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Save, Copy } from "lucide-react";

interface AIOverlayProps {
  content: string | null;
  onClose: () => void;
  onSendToChat?: (content: string) => void;
  onSave?: (content: string) => void;
  onCopy?: (content: string) => void;
}

export default function AIOverlay({
  content,
  onClose,
  onSendToChat,
  onSave,
  onCopy,
}: AIOverlayProps) {
  return (
    <AnimatePresence>
      {content && (
        <motion.div
          className="absolute inset-0 z-40 rounded-xl overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 backdrop-blur-md bg-black/60" onClick={onClose} />

          {/* Content */}
          <motion.div
            className="absolute inset-2 flex flex-col rounded-lg border border-[#00d4aa]/20 bg-black/80 backdrop-blur-xl overflow-hidden"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
              <span className="text-[10px] text-[#00d4aa]/70 uppercase tracking-widest font-medium">
                ✨ AI Response
              </span>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-3 py-2 text-[12px] text-white/80 leading-relaxed whitespace-pre-wrap">
              {content}
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/[0.06]">
              {onSendToChat && (
                <button
                  onClick={() => onSendToChat(content)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/40 hover:text-[#00d4aa] hover:bg-[#00d4aa]/10 transition-colors"
                >
                  <Send size={11} />
                  Send to Chat
                </button>
              )}
              {onSave && (
                <button
                  onClick={() => onSave(content)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                >
                  <Save size={11} />
                  Save
                </button>
              )}
              {onCopy && (
                <button
                  onClick={() => onCopy(content)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                >
                  <Copy size={11} />
                  Copy
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
