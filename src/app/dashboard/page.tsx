"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { AnimatePresence, motion } from "framer-motion";
import type { Card } from "@/lib/card-types";
import { layoutCards } from "@/lib/layout-engine";
import CardRenderer from "@/components/CardRenderer";
import AIOrb from "@/components/AIOrb";
import type { OrbState } from "@/components/AIOrb";
import ModeToggle, { type AppMode } from "@/components/ModeToggle";
import { useTTS, extractSpeakableText } from "@/hooks/useTTS";
import { trackUsage, estimateTokens } from "@/lib/usage";
import { createClient } from "@/lib/supabase";

const MAX_HISTORY = 40;
let msgIdCounter = 0;
function nextMsgId() { return `msg-${++msgIdCounter}-${Date.now()}`; }

export default function DashboardPage() {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("whut_app_mode") as AppMode) || "chat";
    }
    return "chat";
  });
  const [speechActive, setSpeechActive] = useState(false);

  // ── User Profile & Onboarding ──
  const [userProfile, setUserProfile] = useState<{
    name?: string; company?: string; role?: string; timezone?: string;
    onboardingStep?: string; onboardingComplete?: boolean;
  }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("whut_user_profile");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { onboardingStep: "welcome" };
  });

  useEffect(() => {
    localStorage.setItem("whut_user_profile", JSON.stringify(userProfile));
  }, [userProfile]);

  // Auto-trigger onboarding
  const onboardingTriggered = useRef(false);
  useEffect(() => {
    if (!userProfile.onboardingComplete && !onboardingTriggered.current) {
      onboardingTriggered.current = true;
      const timer = setTimeout(() => sendToAI("Hello"), 1500);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Conversation Persistence ──
  useEffect(() => {
    async function initConversation() {
      try {
        // Try to resume active conversation
        const res = await fetch('/api/conversations?active=true');
        const data = await res.json();
        if (data.conversation) {
          setConversationId(data.conversation.id);
          // Load history from DB
          const msgRes = await fetch(`/api/conversations/${data.conversation.id}/messages?limit=20`);
          const msgData = await msgRes.json();
          if (msgData.messages?.length) {
            setChatHistory(msgData.messages.map((m: any) => ({ role: m.role, content: m.content })));
          }
        } else {
          // Create new conversation
          const createRes = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          const createData = await createRes.json();
          if (createData.conversation) setConversationId(createData.conversation.id);
        }
      } catch {
        // Supabase not configured — use client-side only
      }
    }
    initConversation();
  }, []);

  const tts = useTTS();
  const speechLoopRef = useRef(false);

  const toggleMode = useCallback(() => {
    setAppMode(prev => {
      const next = prev === "chat" ? "speech" : "chat";
      localStorage.setItem("whut_app_mode", next);
      if (next === "chat") {
        tts.stop();
        speechLoopRef.current = false;
        setSpeechActive(false);
      }
      return next;
    });
  }, [tts]);

  // Cmd+M shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "m" && (e.metaKey || e.altKey)) { e.preventDefault(); toggleMode(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleMode]);

  // ── Core AI call with SSE streaming ──
  const sendToAI = useCallback(async (trimmed: string) => {
    if (!trimmed) return;
    setInput("");
    setThinking(true);
    setStatusText(null);
    // Don't clear cards — keep visible while thinking

    try {
      const connectedIntegrations: string[] = [];
      try {
        const gt = JSON.parse(localStorage.getItem("whut_google_tokens") || "{}");
        if (gt.access_token) connectedIntegrations.push("gmail", "calendar", "drive");
      } catch {}
      try { if (localStorage.getItem("tiktok_access_token")) connectedIntegrations.push("tiktok"); } catch {}

      const googleTokens = (() => {
        try { return JSON.parse(localStorage.getItem("whut_google_tokens") || "{}"); }
        catch { return {}; }
      })();

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: chatHistory,
          googleAccessToken: googleTokens.access_token || null,
          googleRefreshToken: googleTokens.refresh_token || null,
          userProfile,
          conversationId,
          context: {
            integrations: connectedIntegrations,
            screen: { width: window.innerWidth, height: window.innerHeight },
            time: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      const newCards: Card[] = [];
      let spokenText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "status") {
              setStatusText(event.text);
            } else if (event.type === "card") {
              const card = event.card as Card;
              // Ensure required fields
              if (!card.position) card.position = { x: 50, y: 50 };
              if (!card.size) card.size = "medium";
              if (!card.interactive) card.interactive = false;
              newCards.push(card);
              // Layout and display progressively
              setCards(layoutCards([...newCards]));
              setThinking(false); // Show cards as they arrive
              setStatusText(null);
            } else if (event.type === "done") {
              spokenText = event.text || "";
            } else if (event.type === "error") {
              console.error("AI error:", event.error);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      setThinking(false);
      setStatusText(null);

      // TTS
      if (spokenText) {
        tts.speak(spokenText, () => {
          if (speechLoopRef.current) voice.startListening();
        });
      } else if (speechLoopRef.current) {
        voice.startListening();
      }

      // Onboarding progression
      if (!userProfile.onboardingComplete) {
        const step = userProfile.onboardingStep || "welcome";
        if (step === "welcome") {
          setUserProfile(prev => ({ ...prev, onboardingStep: "name" }));
        } else if (step === "name") {
          const name = trimmed.replace(/^(my name is|i'm|i am|call me|it's|hey i'm)\s*/i, "").trim();
          if (name) setUserProfile(prev => ({ ...prev, name, onboardingStep: "role" }));
        } else if (step === "role") {
          const atMatch = trimmed.match(/(?:at|for|from)\s+(.+?)(?:\s+as\s+|\s*,\s*|\s*$)/i);
          const roleMatch = trimmed.match(/(?:i'm a|i am a|i'm the|i am the|i work as)\s+(.+?)(?:\s+at\s+|\s*$)/i);
          const company = atMatch?.[1]?.trim() || "";
          const role = roleMatch?.[1]?.trim() || trimmed;
          setUserProfile(prev => ({ ...prev, company: company || prev.company, role: role || prev.role, onboardingStep: "integrations" }));
        } else if (step === "integrations") {
          setUserProfile(prev => ({
            ...prev, onboardingComplete: true, onboardingStep: "complete",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }));
        }
      }

      // Update chat history
      setChatHistory(prev => {
        const updated = [...prev, { role: "user", content: trimmed }, { role: "assistant", content: spokenText || "Showed visual cards." }];
        return updated.slice(-MAX_HISTORY);
      });

    } catch (error: any) {
      console.error("AI error:", error);
      setThinking(false);
      setStatusText(null);
      if (speechLoopRef.current) voice.startListening();
    }
  }, [chatHistory, userProfile, tts]);

  const handleSubmit = () => { const t = input.trim(); if (t) sendToAI(t); };

  // ── Voice ──
  const inputRef = useRef<HTMLInputElement>(null);
  const handleVoiceFinal = useCallback((text: string) => {
    setInput("");
    tts.stop();
    sendToAI(text);
  }, [sendToAI, tts]);

  const voice = useVoiceInput({
    onTranscript: (text) => setInput(text),
    onFinalTranscript: handleVoiceFinal,
    autoSubmit: true,
    silenceTimeout: 1500,
  });

  const startSpeechMode = useCallback(() => {
    speechLoopRef.current = true;
    setSpeechActive(true);
    voice.startListening();
  }, [voice]);

  const stopSpeechMode = useCallback(() => {
    speechLoopRef.current = false;
    setSpeechActive(false);
    tts.stop();
    voice.stopListening();
  }, [voice, tts]);

  // Barge-in
  useEffect(() => {
    if (voice.state === "listening" && tts.isSpeaking) tts.stop();
  }, [voice.state, tts.isSpeaking, tts]);

  // Push-to-talk (chat mode)
  useEffect(() => {
    if (appMode !== "chat") return;
    const isInputFocused = () => ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "");
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isInputFocused()) {
        e.preventDefault();
        if (voice.state !== "listening") voice.startListening();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isInputFocused()) {
        e.preventDefault();
        if (voice.state === "listening") voice.stopListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [appMode, voice.state, voice.startListening, voice.stopListening]);

  // Orb state
  const orbState: OrbState = cards.length > 0
    ? "scene-active"
    : tts.isSpeaking ? "speaking"
    : thinking ? "thinking"
    : voice.state === "listening" ? "listening"
    : "idle";

  const closeCards = () => setCards([]);

  return (
    <div className="h-full w-full overflow-hidden relative">
      <AIOrb state={orbState} />

      {/* Status indicator while AI is working */}
      <AnimatePresence>
        {statusText && (
          <motion.div
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-[#00d4aa]"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className="text-xs text-white/50">{statusText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thinking indicator (no status text yet) */}
      <AnimatePresence>
        {thinking && !statusText && (
          <motion.div
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-white/40"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="text-[11px] text-white/30">Thinking...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card display */}
      <AnimatePresence>
        {cards.length > 0 && (
          <CardRenderer cards={cards} onClose={closeCards} onAddCard={(card) => setCards(prev => [...prev, card])} />
        )}
      </AnimatePresence>

      {/* Voice listening overlay */}
      <AnimatePresence>
        {voice.state === "listening" && (
          <motion.div
            className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="flex items-center gap-[2px] h-6">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[2px] rounded-full bg-[#00d4aa]"
                  animate={{ height: [3, 6 + Math.random() * 14, 3], opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 0.3 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.03 }}
                />
              ))}
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Listening...</span>
            {input && (
              <motion.p className="text-xs text-white/50 max-w-[280px] text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {input}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice error */}
      <AnimatePresence>
        {voice.state === "error" && voice.error && (
          <motion.div
            className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-50 glass-card-bright px-4 py-2 text-xs text-red-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {voice.error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT MODE input */}
      <AnimatePresence>
        {appMode === "chat" && (
          <motion.div
            className="absolute bottom-4 md:bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <ModeToggle mode={appMode} onToggle={toggleMode} />
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ask WHUT OS..."
              className="glass-input flex-1 px-3 md:px-4 py-2.5 md:py-3 text-sm outline-none placeholder:text-white/40"
            />
            <button onClick={handleSubmit} className="glass-button px-4 md:px-5 py-2.5 md:py-3 text-xs uppercase tracking-[0.2em]">→</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SPEECH MODE controls */}
      <AnimatePresence>
        {appMode === "speech" && (
          <motion.div
            className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <ModeToggle mode={appMode} onToggle={toggleMode} />
            {!speechActive ? (
              <button
                onClick={startSpeechMode}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-all text-sm text-white/70 hover:text-white"
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
                onClick={stopSpeechMode}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all text-sm text-red-400"
              >
                <motion.div className="w-3 h-3 rounded-full bg-red-500" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                Stop
              </button>
            )}
            <button
              onClick={tts.toggleMute}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white/70"
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
    </div>
  );
}
