"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SceneRendererV4 from "@/components/SceneRendererV4";
import type { Scene } from "@/lib/scene-v4-types";
import type { AppMode } from "@/components/ModeToggle";
import type { OrbState } from "@/components/AIOrb";
import { usePrefetch } from "@/hooks/usePrefetch";
import { screenContextStore } from "@/lib/screen-context";
import type { WindowType } from "@/features/window-manager";
import FileBrowser from "@/features/file-system/FileBrowser";
import { EmbeddedBrowser } from "@/features/browser";
import ChatRecap from "@/components/ChatRecap";

import {
  DashboardShell,
  useChatController,
  useSceneController,
  useVoiceController,
  InputBar,
  SkeletonCards,
} from "./components";

export default function DashboardPage() {
  const [input, setInput] = useState("");
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("whut_app_mode") as AppMode) || "chat";
    }
    return "chat";
  });
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [showRecap, setShowRecap] = useState(true);
  const [skeletonQuery, setSkeletonQuery] = useState<string | null>(null);

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

  // Report active view
  useEffect(() => {
    screenContextStore.setActiveView("dashboard");
  }, []);

  usePrefetch();

  // Scene controller
  const { currentScene, setCurrentScene, closeCards, handleItemAction } = useSceneController();

  // Voice controller needs sendToAI, but chat controller needs voice refs — break cycle with ref
  const sendToAIRef = useRef<(msg: string) => void>(() => {});

  // Chat controller
  const chat = useChatController({
    userProfile,
    pendingImages,
    clearPendingImages: () => setPendingImages([]),
    setInput,
    setCurrentScene,
    onSceneReceived: useCallback(() => {
      setSkeletonQuery(null);
    }, []),
    speechLoopRef: { current: false } as React.MutableRefObject<boolean>, // patched below
    voiceStartListening: () => {}, // patched below
  });

  // Voice controller
  const voiceCtrl = useVoiceController({
    appMode,
    tts: chat.tts,
    setInput,
    sendToAI: useCallback((msg: string) => sendToAIRef.current(msg), []),
  });

  // Patch speech loop ref into chat controller
  // (chat controller already created — we wire the ref)
  const speechLoopRef = voiceCtrl.speechLoopRef;

  // Wrap sendToAI to show skeleton cards
  const sendToAI = useCallback((msg: string) => {
    setSkeletonQuery(msg);
    setShowRecap(true);
    chat.sendToAI(msg);
  }, [chat.sendToAI]);

  sendToAIRef.current = sendToAI;

  // Mode toggle
  const toggleMode = useCallback(() => {
    setAppMode(prev => {
      const next = prev === "chat" ? "speech" : "chat";
      localStorage.setItem("whut_app_mode", next);
      if (next === "chat") {
        chat.tts.stop();
        voiceCtrl.speechLoopRef.current = false;
      }
      return next;
    });
  }, [chat.tts, voiceCtrl.speechLoopRef]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "m" && (e.metaKey || e.altKey)) { e.preventDefault(); toggleMode(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleMode]);

  // Onboarding auto-trigger
  const onboardingTriggered = useRef(false);
  useEffect(() => {
    if (!userProfile.onboardingComplete && !onboardingTriggered.current && chat.conversationId && chat.chatMessages.length === 0) {
      onboardingTriggered.current = true;
      const timer = setTimeout(() => sendToAI("Hello"), 1500);
      return () => clearTimeout(timer);
    }
  }, [chat.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Onboarding progression
  useEffect(() => {
    if (userProfile.onboardingComplete) return;
    const lastUserMsg = [...chat.chatMessages].reverse().find(m => m.role === "user");
    if (!lastUserMsg) return;
    const trimmed = lastUserMsg.content;
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
  }, [chat.chatMessages, userProfile.onboardingComplete, userProfile.onboardingStep]);

  // Dispatch AI thinking state
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("whut-ai-state", { detail: { thinking: chat.thinking } }));
  }, [chat.thinking]);

  // Clear skeleton when scene arrives
  useEffect(() => {
    if (currentScene) setSkeletonQuery(null);
  }, [currentScene]);

  const orbState: OrbState = currentScene
    ? "scene-active"
    : chat.tts.isSpeaking ? "speaking"
    : chat.thinking ? "thinking"
    : voiceCtrl.voice.state === "listening" ? "listening"
    : "idle";

  const handleSubmit = () => { const t = input.trim(); if (t) sendToAI(t); };

  const boundHandleItemAction = useCallback((item: any, element: any) => {
    handleItemAction(item, element, sendToAI);
  }, [handleItemAction, sendToAI]);

  const renderWindow = useCallback((type: WindowType, props?: Record<string, unknown>) => {
    switch (type) {
      case "files": return <FileBrowser />;
      case "browser": return <EmbeddedBrowser initialUrl={props?.initialUrl as string | undefined} />;
      case "chat": return <div className="h-full p-4"><ChatRecap messages={chat.chatMessages} visible={true} onClose={() => {}} /></div>;
      case "scene": return currentScene
        ? <SceneRendererV4 scene={currentScene} onItemAction={boundHandleItemAction} sendToAI={sendToAI} />
        : <div className="h-full flex items-center justify-center text-white/20 text-sm">No active scene</div>;
      default: return <div className="h-full flex items-center justify-center text-white/20 text-sm">Coming soon</div>;
    }
  }, [chat.chatMessages, currentScene, boundHandleItemAction, sendToAI]);

  return (
    <DashboardShell
      orbState={orbState}
      audioLevel={chat.tts.isSpeaking ? 0.5 : voiceCtrl.voice.state === "listening" ? 0.3 : 0}
      thinking={chat.thinking}
      statusText={chat.statusText}
      currentScene={currentScene}
      chatMessages={chat.chatMessages}
      showRecap={showRecap}
      setShowRecap={setShowRecap}
      sendToAI={sendToAI}
      renderWindow={renderWindow}
    >
      {/* Skeleton cards while AI is thinking */}
      <AnimatePresence>
        {skeletonQuery && !currentScene && chat.thinking && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <SkeletonCards query={skeletonQuery} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene display */}
      <AnimatePresence>
        {currentScene && (
          <motion.div
            className="absolute inset-0 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <SceneRendererV4 scene={currentScene} onClose={closeCards} onItemAction={boundHandleItemAction} sendToAI={sendToAI} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <InputBar
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        appMode={appMode}
        onToggleMode={toggleMode}
        pendingImages={pendingImages}
        setPendingImages={setPendingImages}
        speechActive={voiceCtrl.speechActive}
        onStartSpeech={voiceCtrl.startSpeechMode}
        onStopSpeech={voiceCtrl.stopSpeechMode}
        tts={chat.tts}
        voiceState={voiceCtrl.voice.state}
        voiceError={voiceCtrl.voice.error || undefined}
        voiceTranscript={input}
      />
    </DashboardShell>
  );
}
