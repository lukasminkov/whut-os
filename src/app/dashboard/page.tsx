"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { AnimatePresence, motion } from "framer-motion";
import SceneRendererV4 from "@/components/SceneRendererV4";
import type { Scene } from "@/lib/scene-v4-types";
import * as SceneManager from "@/lib/scene-manager";
import AIOrb from "@/components/AIOrb";
import type { OrbState } from "@/components/AIOrb";
import ModeToggle, { type AppMode } from "@/components/ModeToggle";
import { useTTS } from "@/hooks/useTTS";
import { usePrefetch } from "@/hooks/usePrefetch";
import { ImagePlus, X, MessageSquare } from "lucide-react";
import ChatRecap, { type RecapMessage } from "@/components/ChatRecap";
import { cacheScene, getCachedScene, isRepeatRequest, getLastScene } from "@/lib/scene-cache";
import ThinkingOverlay from "@/components/ThinkingOverlay";
import { useWindowManager } from "@/features/window-manager";

const SUGGESTIONS = [
  "What's my day look like?",
  "Show my emails",
  "Search the web",
];

function SkeletonScene() {
  return (
    <div className="relative z-30 w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 opacity-40">
        <div className="flex gap-3">
          <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [chatMessages, setChatMessages] = useState<RecapMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showRecap, setShowRecap] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("whut_app_mode") as AppMode) || "chat";
    }
    return "chat";
  });
  const [speechActive, setSpeechActive] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User profile
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

  // Initialize conversation
  useEffect(() => {
    async function initConversation() {
      try {
        const res = await fetch('/api/conversations?active=true');
        const data = await res.json();
        if (data.conversation) {
          setConversationId(data.conversation.id);
          const msgRes = await fetch(`/api/conversations/${data.conversation.id}/messages?limit=50`);
          const msgData = await msgRes.json();
          if (msgData.messages?.length) {
            setChatMessages(msgData.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content || "",
              timestamp: new Date(m.created_at),
            })));
            // Restore last scene if any
            const lastWithScene = [...(msgData.messages || [])].reverse().find((m: any) => m.scene_data);
            if (lastWithScene?.scene_data) setCurrentScene(lastWithScene.scene_data);
          }
        } else {
          const createRes = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          });
          const createData = await createRes.json();
          if (createData.conversation) setConversationId(createData.conversation.id);
        }
      } catch (e) {
        console.error("Failed to init conversation:", e);
      }
    }
    initConversation();
  }, []);

  // Auto-trigger onboarding
  const onboardingTriggered = useRef(false);
  useEffect(() => {
    if (!userProfile.onboardingComplete && !onboardingTriggered.current && conversationId && chatMessages.length === 0) {
      onboardingTriggered.current = true;
      const timer = setTimeout(() => sendToAI("Hello"), 1500);
      return () => clearTimeout(timer);
    }
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tts = useTTS();
  usePrefetch();
  const speechLoopRef = useRef(false);
  const lastSceneRef = useRef<any>(null);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "m" && (e.metaKey || e.altKey)) { e.preventDefault(); toggleMode(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleMode]);

  // New conversation
  const startNewConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (data.conversation) {
        setConversationId(data.conversation.id);
        setChatMessages([]);
        setCurrentScene(null);
        window.dispatchEvent(new CustomEvent('whut-conversation-changed'));
      }
    } catch {}
  }, []);

  // Load conversation
  const loadConversation = useCallback(async (id: string) => {
    try {
      setConversationId(id);
      setCurrentScene(null);
      const msgRes = await fetch(`/api/conversations/${id}/messages?limit=50`);
      const msgData = await msgRes.json();
      const msgs = (msgData.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content || "",
        timestamp: new Date(m.created_at),
      }));
      setChatMessages(msgs);
      // Restore last scene
      const lastWithScene = [...(msgData.messages || [])].reverse().find((m: any) => m.scene_data);
      if (lastWithScene?.scene_data) setCurrentScene(lastWithScene.scene_data);
      setShowRecap(true);
    } catch {}
  }, []);

  // Expose for sidebar
  useEffect(() => {
    (window as any).__whut_loadConversation = loadConversation;
    (window as any).__whut_newConversation = startNewConversation;
    return () => { delete (window as any).__whut_loadConversation; delete (window as any).__whut_newConversation; };
  }, [loadConversation, startNewConversation]);

  // Core AI call
  const sendToAI = useCallback(async (trimmed: string) => {
    if (!trimmed) return;

    // Check scene cache for repeat requests or exact matches
    const repeat = isRepeatRequest(trimmed);
    const cachedResult = repeat ? getLastScene() : getCachedScene(trimmed);
    if (cachedResult) {
      setCurrentScene(cachedResult.scene);
      if (cachedResult.spokenText) tts.speak(cachedResult.spokenText);
      setChatMessages(prev => [...prev,
        { id: `user-${Date.now()}`, role: "user" as const, content: trimmed, timestamp: new Date() },
        { id: `assistant-${Date.now()}`, role: "assistant" as const, content: cachedResult.spokenText || "Here you go.", timestamp: new Date() },
      ]);
      return;
    }

    setInput("");
    const imagesToSend = [...pendingImages];
    setPendingImages([]);
    setThinking(true);
    setStatusText(null);

    // Add user message to recap
    const userMsgId = `user-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: userMsgId, role: "user", content: trimmed, timestamp: new Date() }]);
    setShowRecap(true);

    // Streaming assistant message
    const assistantMsgId = `assistant-${Date.now()}`;
    let assistantAdded = false;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          images: imagesToSend.length > 0 ? imagesToSend : undefined,
          conversationId,
          userProfile,
          context: {
            screen: { width: window.innerWidth, height: window.innerHeight },
            time: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let streamingText = "";
      let spokenText = "";
      let receivedScene = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "text_delta") {
              streamingText += event.text;
              // Don't create a scene panel yet — wait for "done" event
              // The AI might follow up with a tool call (search → display)
              // Just update the chat recap for now
              setThinking(false);

              // Update chat recap with streaming text
              if (!assistantAdded) {
                assistantAdded = true;
                setChatMessages(prev => [...prev, {
                  id: assistantMsgId, role: "assistant", content: streamingText,
                  timestamp: new Date(), streaming: true,
                }]);
              } else {
                setChatMessages(prev => prev.map(m =>
                  m.id === assistantMsgId ? { ...m, content: streamingText } : m
                ));
              }
            } else if (event.type === "status") {
              setStatusText(event.text);
            } else if (event.type === "scene") {
              receivedScene = true;
              lastSceneRef.current = event.scene;
              setCurrentScene(event.scene);
              setThinking(false);
              setStatusText(null);
            } else if (event.type === "card") {
              const card = event.card;
              if (card?.type === "content" && card?.data?.content) {
                setCurrentScene({
                  id: `text-${Date.now()}`, intent: "", layout: "minimal",
                  elements: [{ id: "response", type: "text", priority: 1, data: { content: card.data.content, typewriter: true } }],
                });
                receivedScene = true;
              }
              setThinking(false);
              setStatusText(null);
            } else if (event.type === "done") {
              spokenText = event.text || "";
            } else if (event.type === "error") {
              console.error("AI error:", event.error);
            }
          } catch {}
        }
      }

      // Finalize
      const finalText = spokenText || streamingText;

      if (!receivedScene && finalText) {
        setCurrentScene({
          id: `text-${Date.now()}`, intent: "", layout: "minimal",
          elements: [{ id: "response", type: "text", priority: 1, data: { content: finalText, typewriter: true } }],
        });
      }

      // Finalize chat recap message
      if (assistantAdded) {
        setChatMessages(prev => prev.map(m =>
          m.id === assistantMsgId ? { ...m, content: finalText, streaming: false } : m
        ));
      } else if (finalText) {
        setChatMessages(prev => [...prev, {
          id: assistantMsgId, role: "assistant", content: finalText, timestamp: new Date(),
        }]);
      }

      setThinking(false);
      setStatusText(null);

      // Cache scene for "show that again" / repeat requests
      if (receivedScene && lastSceneRef.current) {
        cacheScene(trimmed, lastSceneRef.current, finalText);
      }

      if (finalText) {
        tts.speak(finalText, () => {
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
          setUserProfile(prev => ({ ...prev, company: atMatch?.[1]?.trim() || prev.company, role: roleMatch?.[1]?.trim() || trimmed, onboardingStep: "integrations" }));
        } else if (step === "integrations") {
          setUserProfile(prev => ({
            ...prev, onboardingComplete: true, onboardingStep: "complete",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }));
        }
      }

      window.dispatchEvent(new CustomEvent('whut-conversation-changed'));

    } catch (error: any) {
      console.error("AI error:", error);
      setThinking(false);
      setStatusText(null);
      if (speechLoopRef.current) voice.startListening();
    }
  }, [conversationId, userProfile, tts, pendingImages]);

  const handleSubmit = () => { const t = input.trim(); if (t) sendToAI(t); };

  // Voice
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
    silenceTimeout: 800,
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

  useEffect(() => {
    if (voice.state === "listening" && tts.isSpeaking) tts.stop();
  }, [voice.state, tts.isSpeaking, tts]);

  // Push-to-talk
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

  // Dispatch AI thinking state to ambient background
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("whut-ai-state", { detail: { thinking } }));
  }, [thinking]);

  const orbState: OrbState = currentScene
    ? "scene-active"
    : tts.isSpeaking ? "speaking"
    : thinking ? "thinking"
    : voice.state === "listening" ? "listening"
    : "idle";

  const closeCards = () => {
    setCurrentScene(null);
    SceneManager.clearScene();
  };

  // Handle interactive list item clicks (e.g. clicking an email to drill down)
  const handleItemAction = useCallback((item: any, element: any) => {
    // Build a natural language follow-up based on context
    const elementTitle = element?.title?.toLowerCase() || "";
    const itemTitle = item?.title || item?.subtitle || "";
    
    if (elementTitle.includes("email") || elementTitle.includes("inbox") || elementTitle.includes("mail")) {
      // Email drill-down: ask AI to open the specific email
      sendToAI(`Open the email "${itemTitle}" (id: ${item.id})`);
    } else if (elementTitle.includes("calendar") || elementTitle.includes("schedule")) {
      sendToAI(`Tell me more about "${itemTitle}"`);
    } else {
      sendToAI(`Tell me more about "${itemTitle}"`);
    }
  }, [sendToAI]);

  const showQuietState = !currentScene && !thinking;

  return (
    <div className="h-full w-full overflow-hidden relative">
      <AIOrb state={orbState} audioLevel={tts.isSpeaking ? 0.5 : voice.state === "listening" ? 0.3 : 0} />

      {/* Status indicator */}
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

      {/* Dramatic AI processing overlay */}
      <ThinkingOverlay active={thinking && !currentScene} statusText={statusText} />

      {/* V4 Scene display — full screen, primary */}
      <AnimatePresence>
        {currentScene && (
          <motion.div
            className="absolute inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SceneRendererV4 scene={currentScene} onClose={closeCards} onItemAction={handleItemAction} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiet default state */}
      <AnimatePresence>
        {showQuietState && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mt-24" />
            <p className="text-lg text-white/30">What can I help with?</p>
            <div className="flex flex-wrap gap-2 mt-4 pointer-events-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendToAI(s)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Recap Panel */}
      <ChatRecap
        messages={chatMessages}
        visible={showRecap && chatMessages.length > 0 && currentScene === null}
        onToggle={() => setShowRecap(prev => !prev)}
      />

      {/* Chat recap toggle button (when hidden) */}
      <AnimatePresence>
        {((!showRecap && chatMessages.length > 0) || (currentScene !== null && chatMessages.length > 0)) && (
          <motion.button
            className="fixed right-4 bottom-20 md:right-6 md:bottom-24 z-50 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setShowRecap(true)}
            title="Show conversation"
          >
            <MessageSquare size={16} className="text-white/40" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00d4aa]/80 text-[8px] text-white flex items-center justify-center font-bold">
              {chatMessages.length}
            </span>
          </motion.button>
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
            <span className="text-[10px] uppercase tracking-[0.15em] text-white/40">Listening...</span>
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
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
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
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
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
            <button onClick={handleSubmit} className="glass-button px-4 md:px-5 py-2.5 md:py-3 text-xs uppercase tracking-[0.15em] cursor-pointer">→</button>
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
                onClick={stopSpeechMode}
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
    </div>
  );
}
