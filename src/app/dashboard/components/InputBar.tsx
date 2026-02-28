"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, X } from "lucide-react";
import ModeToggle, { type AppMode } from "@/components/ModeToggle";
import type { UseTTSReturn } from "@/hooks/useTTS";

interface InputBarProps {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  appMode: AppMode;
  onToggleMode: () => void;
  pendingImages: string[];
  setPendingImages: React.Dispatch<React.SetStateAction<string[]>>;
  // Speech mode
  speechActive: boolean;
  onStartSpeech: () => void;
  onStopSpeech: () => void;
  tts: UseTTSReturn;
  // Voice state
  voiceState: string;
  voiceError?: string;
  voiceTranscript: string;
}

export default function InputBar({
  input, setInput, onSubmit, appMode, onToggleMode,
  pendingImages, setPendingImages,
  speechActive, onStartSpeech, onStopSpeech, tts,
  voiceState, voiceError, voiceTranscript,
}: InputBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Voice listening overlay */}
      <AnimatePresence>
        {voiceState === "listening" && (
          <motion.div
            className="absolute bottom-24 md:bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
          >
            <div className="flex items-center gap-[2px] h-6">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i} className="w-[2px] rounded-full bg-[#00d4aa]"
                  animate={{ height: [3, 6 + Math.random() * 14, 3], opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 0.3 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.03 }}
                />
              ))}
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-white/40">Listening...</span>
            {voiceTranscript && (
              <motion.p className="text-xs text-white/50 max-w-[280px] text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {voiceTranscript}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice error */}
      <AnimatePresence>
        {voiceState === "error" && voiceError && (
          <motion.div
            className="absolute bottom-24 md:bottom-24 left-1/2 -translate-x-1/2 z-50 glass-card-bright px-4 py-2 text-xs text-red-400"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
          >
            {voiceError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT MODE input */}
      <AnimatePresence>
        {appMode === "chat" && (
          <motion.div
            className="absolute bottom-6 md:bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 items-center gap-2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <ModeToggle mode={appMode} onToggle={onToggleMode} />
            <div className="flex-1 flex flex-col">
              {pendingImages.length > 0 && (
                <div className="flex gap-1 px-3 pt-2 pb-1">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="relative w-10 h-10 rounded overflow-hidden border border-white/10">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-black/80 rounded-full flex items-center justify-center cursor-pointer"
                      >
                        <X size={10} className="text-white/70" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSubmit(); } }}
                placeholder="Ask WHUT OS..."
                className="glass-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm outline-none placeholder:text-white/40"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-white/30 hover:text-white/60 transition cursor-pointer"
              title="Attach image"
            >
              <ImagePlus size={18} />
            </button>
            <input
              ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                Promise.all(
                  files.map(f => new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(f);
                  }))
                ).then((imgs) => setPendingImages(prev => [...prev, ...imgs]));
                if (e.target) e.target.value = "";
              }}
            />
            <button onClick={onSubmit} className="glass-button px-4 md:px-5 py-2.5 md:py-3 text-xs uppercase tracking-[0.15em] cursor-pointer">→</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SPEECH MODE controls */}
      <AnimatePresence>
        {appMode === "speech" && (
          <motion.div
            className="absolute bottom-6 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <ModeToggle mode={appMode} onToggle={onToggleMode} />
            {!speechActive ? (
              <button
                onClick={onStartSpeech}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-all text-sm text-white/70 hover:text-white cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                Start listening
              </button>
            ) : (
              <button
                onClick={onStopSpeech}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all text-sm text-red-400 cursor-pointer"
              >
                <motion.div className="w-3 h-3 rounded-full bg-red-500" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                Stop
              </button>
            )}
            <button
              onClick={tts.toggleMute}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white/70 cursor-pointer"
              title={tts.isMuted ? "Unmute" : "Mute"}
            >
              {tts.isMuted ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
