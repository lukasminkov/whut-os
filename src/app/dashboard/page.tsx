"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { AnimatePresence, motion } from "framer-motion";
import VisualizationEngine from "@/components/VisualizationEngine";
import type { VisualizationBlock } from "@/lib/visualization-tools";
import SceneRenderer from "@/components/SceneRenderer";
import type { SceneNode } from "@/lib/scene-types";
import AIOrb from "@/components/AIOrb";
import type { OrbState } from "@/components/AIOrb";
import ModeToggle, { type AppMode } from "@/components/ModeToggle";
import ContextualLoadingPill, { detectLoadingAction, type LoadingAction } from "@/components/ContextualLoadingPill";
import { useTTS, extractSpeakableText } from "@/hooks/useTTS";
import { trackUsage, estimateTokens } from "@/lib/usage";

const COMMANDS = [
  "send email",
  "show emails",
  "calendar",
  "drive",
  "research [topic]",
  "help",
] as const;

type ViewKey = "help" | null;

const panelMotion = {
  initial: { opacity: 0, scale: 0.86, y: 24, rotate: -1.5 },
  animate: { opacity: 1, scale: 1, y: 0, rotate: 0 },
  exit: { opacity: 0, scale: 0.84, y: -18, rotate: 1.5 },
  transition: { type: "spring" as const, damping: 20, stiffness: 200 },
};

/* ---- Mobile card wrapper (scrollable) ---- */
const MobileCard = ({ children, className = "", onClose }: { children: ReactNode; className?: string; onClose?: () => void }) => (
  <motion.div
    className={`glass-card p-4 ${className}`}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
  >
    {onClose && (
      <button
        onClick={onClose}
        className="absolute right-3 top-2 text-[10px] text-white/40 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>
    )}
    {children}
  </motion.div>
);

/* ---- Desktop draggable panel ---- */
const Panel = ({
  id,
  children,
  style,
  className = "",
  onClose,
}: {
  id: string;
  children: ReactNode;
  style: CSSProperties;
  className?: string;
  onClose?: () => void;
}) => (
  <motion.div
    className={`absolute glass-card p-5 hidden md:block ${className}`}
    style={{ ...style, cursor: "grab" }}
    {...panelMotion}
    drag
    dragMomentum={false}
    dragElastic={0 as number}
    whileDrag={{ scale: 1.03, zIndex: 100 }}
  >
    {onClose && (
      <button
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-3 top-2 text-[10px] text-white/40 transition hover:text-white"
        aria-label="Close panel"
      >
        ✕
      </button>
    )}
    {children}
  </motion.div>
);

const RESEARCH_TRIGGERS = [
  "research",
  "search",
  "look up",
  "find out about",
  "find out",
  "what is",
  "tell me about",
];

const parseResearchTopic = (text: string) => {
  const normalized = text.toLowerCase();
  const triggerPattern = new RegExp(
    `(?:${RESEARCH_TRIGGERS.map((trigger) => trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s+(.*)$`,
  );
  const match = normalized.match(triggerPattern);
  if (!match) return null;
  const topic = match[1].trim();
  return topic.length ? topic : null;
};

/* ---- Mobile scroll container for view cards ---- */
const MobileViewContainer = ({ children, onClose }: { children: ReactNode; onClose: () => void }) => (
  <motion.div
    className="md:hidden absolute inset-0 z-30 overflow-y-auto pt-16 pb-24 px-4 space-y-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <button
      onClick={onClose}
      className="sticky top-0 z-10 mb-2 flex items-center gap-2 text-xs text-white/50 hover:text-white/80"
    >
      ← Back
    </button>
    {children}
  </motion.div>
);

/** Generate a descriptive summary of what a scene shows (for chat history context) */
function describeScene(scene: SceneNode): string {
  const parts: string[] = [];
  function walk(node: SceneNode) {
    if (node.type === "email-compose") {
      const to = node.data?.to || "someone";
      const subject = node.data?.subject || "an email";
      parts.push(`I showed an email compose card to ${to} about "${subject}"`);
    } else if (node.type === "email-list") {
      parts.push("I showed your email inbox");
    } else if (node.type === "calendar-events") {
      parts.push("I showed your upcoming calendar events");
    } else if (node.type === "file-list") {
      parts.push("I showed your recent Drive files");
    } else if (node.type === "stat-cards") {
      const titles = (node.data?.stats || []).map((s: any) => s.title || s.label).filter(Boolean);
      parts.push(`I showed stats: ${titles.join(", ") || "overview cards"}`);
    } else if (node.type === "chart") {
      parts.push(`I showed a ${node.data?.chartType || ""} chart${node.title ? ` of ${node.title}` : ""}`);
    } else if (node.type === "card-grid") {
      const count = node.data?.cards?.length || 0;
      parts.push(`I showed ${count} cards${node.title ? ` for ${node.title}` : ""}`);
    } else if (node.type === "table") {
      parts.push(`I showed a table${node.title ? ` of ${node.title}` : ""}`);
    } else if (node.type === "text-block" || node.type === "markdown") {
      const text = node.data?.text || node.data?.content || "";
      if (text.length > 0) parts.push(text.slice(0, 200));
    } else if (node.type === "commerce-summary") {
      parts.push("I showed a commerce summary");
    } else if (node.type === "comparison") {
      parts.push("I showed a comparison view");
    } else if (node.type === "timeline") {
      parts.push("I showed a timeline");
    }
    if (node.children) node.children.forEach(walk);
  }
  walk(scene);
  return parts.join(". ") || "I showed a visualization.";
}

const MAX_HISTORY = 40; // 20 turns = 40 messages (user + assistant)

let msgIdCounter = 0;
// Smart scene merge: reuse same-type components so React doesn't remount them
function mergeScenes(prev: SceneNode, next: SceneNode): SceneNode {
  // If root layout types differ, just replace
  if (prev.type !== next.type) return next;

  // Build a map of prev children by type for matching
  const prevChildren = prev.children || [];
  const nextChildren = next.children || [];

  if (prevChildren.length === 0 || nextChildren.length === 0) return next;

  // Index prev children by type (first occurrence)
  const prevByType = new Map<string, SceneNode>();
  for (const child of prevChildren) {
    if (!prevByType.has(child.type)) {
      prevByType.set(child.type, child);
    }
  }

  // For each next child, if same type exists in prev, keep prev's id so React reuses the node
  const merged = nextChildren.map(child => {
    const prevChild = prevByType.get(child.type);
    if (prevChild) {
      // Keep same id to preserve React key identity, merge new data
      return { ...child, id: prevChild.id || child.id };
    }
    return child;
  });

  return { ...next, children: merged };
}

function nextMsgId() {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<ViewKey>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [aiBlocks, setAiBlocks] = useState<VisualizationBlock[] | null>(null);
  const [aiScene, setAiScene] = useState<SceneNode | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [transcriptMessages, setTranscriptMessages] = useState<{ id: string; role: "user" | "assistant"; text: string; timestamp: number }[]>([]);
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("whut_app_mode") as AppMode) || "chat";
    }
    return "chat";
  });
  const [speechActive, setSpeechActive] = useState(false); // whether speech loop is running

  // ── User Profile & Onboarding ──
  const [userProfile, setUserProfile] = useState<{
    name?: string;
    company?: string;
    role?: string;
    timezone?: string;
    onboardingStep?: string;
    onboardingComplete?: boolean;
  }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("whut_user_profile");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { onboardingStep: "welcome" };
  });

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("whut_user_profile", JSON.stringify(userProfile));
  }, [userProfile]);

  // Auto-trigger onboarding for new users
  const onboardingTriggered = useRef(false);
  useEffect(() => {
    if (!userProfile.onboardingComplete && !onboardingTriggered.current) {
      onboardingTriggered.current = true;
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        sendToAI("Hello");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tts = useTTS();
  const speechLoopRef = useRef(false); // tracks if we should auto-restart listening

  // Mode toggle handler
  const toggleMode = useCallback(() => {
    setAppMode(prev => {
      const next = prev === "chat" ? "speech" : "chat";
      localStorage.setItem("whut_app_mode", next);
      if (next === "chat") {
        // Exiting speech mode: stop everything
        tts.stop();
        speechLoopRef.current = false;
        setSpeechActive(false);
      }
      return next;
    });
  }, [tts]);

  // Cmd+M / Alt+M keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "m" && (e.metaKey || e.altKey)) {
        e.preventDefault();
        toggleMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleMode]);

  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 4200);
    return () => clearTimeout(timer);
  }, []);

  // Notifications are manual-only — user clicks the bell icon to open

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const resolveView = (text: string): ViewKey => {
    const normalized = text.toLowerCase();
    // Only "help" uses old v1 views — everything else goes to AI for v2 scene rendering
    if (/^help$|^commands$/.test(normalized.trim())) return "help";
    return null;
  };

  // Centralized AI call function (used by both text submit and voice)
  const sendToAI = useCallback(async (trimmed: string) => {
    if (!trimmed) return;
    const research = parseResearchTopic(trimmed);
    setInput("");
    setThinking(true);
    setActiveView(null);
    setAiBlocks(null);
    // Don't clear aiScene — keep current scene visible while thinking

    // Add user message to transcript
    setTranscriptMessages(prev => [...prev, {
      id: nextMsgId(),
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
    }]);

    const target = research ? null : resolveView(trimmed);
    if (target) {
      setAiLoading(false);
      setLoadingAction(detectLoadingAction(trimmed));
      setTimeout(() => {
        setActiveView(target);
        setThinking(false);
        setLoadingAction(null);
      }, 1000);
      return;
    }

    setAiLoading(true);
    setLoadingAction(detectLoadingAction(trimmed));

    try {
      // Gather context for AI
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const device = screenW < 768 ? "mobile" : screenW < 1024 ? "tablet" : "desktop";
      const connectedIntegrations: string[] = [];
      try {
        const gt = JSON.parse(localStorage.getItem('whut_google_tokens') || '{}');
        if (gt.access_token) connectedIntegrations.push("gmail", "calendar", "drive");
      } catch {}
      try { if (localStorage.getItem('whut_tiktok_tokens')) connectedIntegrations.push("tiktok"); } catch {}

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: chatHistory,
          googleAccessToken: (() => { try { const t = JSON.parse(localStorage.getItem('whut_google_tokens') || '{}'); return t.access_token || null; } catch { return null; } })(),
          googleRefreshToken: (() => { try { const t = JSON.parse(localStorage.getItem('whut_google_tokens') || '{}'); return t.refresh_token || null; } catch { return null; } })(),
          userProfile,
          context: {
            integrations: connectedIntegrations,
            screen: { width: screenW, height: screenH, device },
          },
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Request failed");
      }
      const result = await response.json();
      setThinking(false);

      // Track usage — use real token counts from API if available, otherwise estimate
      try {
        const inputTokens =
          result.usage?.input_tokens ??
          estimateTokens(
            trimmed +
              chatHistory.map((m: { role: string; content: string }) => m.content).join(" ")
          );
        const outputTokens =
          result.usage?.output_tokens ??
          estimateTokens(JSON.stringify(result.blocks || result.scene || ""));
        const model = result.usage?.model ?? "claude-sonnet-4-20250514";
        trackUsage(model, inputTokens, outputTokens);
      } catch {
        // non-critical — don't break the response flow
      }

      // V2 scene graph response — check top-level scene OR scene inside blocks
      const sceneData = result.scene?.layout 
        || result.blocks?.find((b: any) => b.type === "render_scene")?.data?.layout;
      if (sceneData) {
        // Smart scene merge: if same component types exist, merge data to avoid remount
        setAiScene(prev => {
          if (!prev) return sceneData;
          return mergeScenes(prev, sceneData);
        });
        setAiBlocks(null);
      }

      // Handle v1 blocks (non-scene responses)
      if (result.blocks && result.blocks.length > 0) {
        const hasVisuals = result.blocks.some((b: any) => b.type !== "text");
        if (hasVisuals && !result.scene?.layout) {
          setAiBlocks(result.blocks);
        }
      }

      // Extract text for transcript + TTS (works for both v1 blocks and v2 scenes)
      const speakable = extractSpeakableText(result.blocks || [], sceneData);
      const summaryText = speakable || (sceneData ? describeScene(sceneData) : "Done.");

      // Add assistant message to transcript
      setTranscriptMessages(prev => [...prev, {
        id: nextMsgId(),
        role: "assistant",
        text: summaryText,
        timestamp: Date.now(),
      }]);

      // TTS: speak the response
      if (speakable) {
        tts.speak(speakable, () => {
          if (speechLoopRef.current) {
            voice.startListening();
          }
        });
      } else if (speechLoopRef.current) {
        voice.startListening();
      }

      // ── Onboarding state progression ──
      if (!userProfile.onboardingComplete) {
        const step = userProfile.onboardingStep || "welcome";
        if (step === "welcome") {
          // After welcome, move to name step (user will reply with their name next)
          setUserProfile(prev => ({ ...prev, onboardingStep: "name" }));
        } else if (step === "name") {
          // User just said their name — extract it from the message
          const name = trimmed.replace(/^(my name is|i'm|i am|call me|it's|hey i'm)\s*/i, "").trim();
          if (name) {
            setUserProfile(prev => ({ ...prev, name, onboardingStep: "role" }));
          }
        } else if (step === "role") {
          // User described their role/company
          const text = trimmed.toLowerCase();
          let company = "";
          let role = "";
          // Try to extract company and role from natural language
          const atMatch = trimmed.match(/(?:at|for|from)\s+(.+?)(?:\s+as\s+|\s*,\s*|\s*$)/i);
          if (atMatch) company = atMatch[1].trim();
          const roleMatch = trimmed.match(/(?:i'm a|i am a|i'm the|i am the|i work as)\s+(.+?)(?:\s+at\s+|\s*$)/i);
          if (roleMatch) role = roleMatch[1].trim();
          // Fallback: just save the whole thing as role
          if (!role && !company) role = trimmed;
          setUserProfile(prev => ({ ...prev, company: company || prev.company, role: role || prev.role, onboardingStep: "integrations" }));
        } else if (step === "integrations") {
          // Complete onboarding
          setUserProfile(prev => ({
            ...prev,
            onboardingComplete: true,
            onboardingStep: "complete",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }));
        }
      }

      // Update chat history (sliding window of last 20 turns)
      const hasAnyResponse = (result.blocks && result.blocks.length > 0) || result.scene?.layout;
      if (hasAnyResponse) {
        setChatHistory(prev => {
          const updated = [
            ...prev,
            { role: "user", content: trimmed },
            { role: "assistant", content: summaryText },
          ];
          return updated.slice(-MAX_HISTORY);
        });
      } else {
        setTranscriptMessages(prev => [...prev, {
          id: nextMsgId(),
          role: "assistant",
          text: "I couldn't generate a response. Please try again.",
          timestamp: Date.now(),
        }]);
        // Resume listening in speech mode even on empty response
        if (speechLoopRef.current) voice.startListening();
      }
    } catch (error: any) {
      setTranscriptMessages(prev => [...prev, {
        id: nextMsgId(),
        role: "assistant",
        text: `Error: ${error?.message || "Request failed"}`,
        timestamp: Date.now(),
      }]);
      setThinking(false);
      // Resume listening in speech mode even on error
      if (speechLoopRef.current) voice.startListening();
    } finally {
      setAiLoading(false);
      setLoadingAction(null);
    }
  }, [chatHistory, userProfile]);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendToAI(trimmed);
  };

  // ── Voice Input ──
  const inputRef = useRef<HTMLInputElement>(null);
  const handleVoiceFinal = useCallback((text: string) => {
    setInput("");
    tts.stop(); // Barge-in: stop any ongoing TTS when user submits voice
    sendToAI(text);
  }, [sendToAI, tts]);

  const voice = useVoiceInput({
    onTranscript: (text) => setInput(text),
    onFinalTranscript: handleVoiceFinal,
    autoSubmit: true,
    silenceTimeout: 1500,
  });

  // Start/stop speech loop
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

  // Barge-in: if user starts listening while TTS is speaking, cancel TTS
  useEffect(() => {
    if (voice.state === "listening" && tts.isSpeaking) {
      tts.stop();
    }
  }, [voice.state, tts.isSpeaking, tts]);

  // Push-to-talk: hold spacebar (chat mode only — speech mode uses persistent listening)
  useEffect(() => {
    if (appMode !== "chat") return;
    const isInputFocused = () => document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isInputFocused()) {
        e.preventDefault();
        if (voice.state !== "listening") {
          voice.startListening();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isInputFocused()) {
        e.preventDefault();
        if (voice.state === "listening") {
          voice.stopListening();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [appMode, voice.state, voice.startListening, voice.stopListening]);

  // Compute orb visual state
  const orbState: OrbState = aiScene
    ? "scene-active"
    : tts.isSpeaking
    ? "speaking"
    : thinking || aiLoading
    ? "thinking"
    : voice.state === "listening"
    ? "listening"
    : "idle";

  const hasContent = activeView || aiBlocks || aiScene;
  const closeView = () => { setActiveView(null); setAiBlocks(null); setAiScene(null); };

  return (
    <div className="h-full w-full overflow-hidden relative">
      {/* Orb — full-viewport canvas, handles its own positioning/transitions */}
      <AIOrb state={orbState} />

      {/* Floating conversation transcript */}
      {/* Transcript removed — scene text-block IS the response */}

      <AnimatePresence mode="wait">
        {/* ========== V2 SCENE GRAPH RESPONSE ========== */}
        {aiScene && (
          <motion.div
            key="ai-scene"
            className="absolute inset-0 z-30 flex flex-col items-center overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Spacer to push content below the shrunken orb */}
            <div className="shrink-0 h-[45vh] md:h-[40vh]" />
            <SceneRenderer scene={aiScene} onClose={closeView} />
            <div className="shrink-0 h-24" />
            {/* Thinking state is now indicated by the orb animation — no text overlay */}
          </motion.div>
        )}

        {/* ========== AI VISUALIZATION RESPONSE (V1 fallback) ========== */}
        {aiBlocks && !aiScene && (
          <motion.div key="ai-viz" className="absolute inset-0 z-30">
            {/* Mobile */}
            <div className="md:hidden absolute inset-0 pt-4 pb-24 px-4 overflow-y-auto">
              <button
                onClick={() => { setAiBlocks(null); }}
                className="sticky top-0 z-10 mb-3 flex items-center gap-2 text-xs text-white/50 hover:text-white/80"
              >
                ← Back
              </button>
              <VisualizationEngine blocks={aiBlocks} />
            </div>

            {/* Desktop */}
            <motion.div
              className="hidden md:block absolute inset-0 overflow-y-auto pt-6 pb-24 px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="max-w-4xl mx-auto relative">
                <button
                  onClick={() => { setAiBlocks(null); }}
                  className="absolute -top-1 right-0 z-10 text-xs text-white/40 hover:text-white transition px-3 py-1.5 glass-card"
                >
                  ✕ Close
                </button>
                <VisualizationEngine blocks={aiBlocks} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Loading state is now indicated by the orb's thinking animation */}

        {/* ========== HELP ========== */}
        {activeView === "help" && (
          <motion.div key="help" className="absolute inset-0">
            <MobileViewContainer onClose={closeView}>
              <MobileCard className="glass-card-bright">
                <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Command List</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-white/70">
                  {COMMANDS.map((cmd) => (
                    <div key={cmd} className="rounded-xl border border-white/10 px-3 py-2 text-xs">{cmd}</div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-white/50">
                  Try: &quot;research tiktok shop&quot; or &quot;tell me about ai agents&quot;.
                </div>
              </MobileCard>
            </MobileViewContainer>

            <Panel id="help-commands" style={{ top: "28%", left: "50%", width: 480, transform: "translateX(-50%)" }} className="glass-card-bright" onClose={closeView}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Command List</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/70">
                {COMMANDS.map((cmd) => (
                  <div key={cmd} className="rounded-xl border border-white/10 px-3 py-2">{cmd}</div>
                ))}
              </div>
              <div className="mt-4 text-xs text-white/50">
                Try: &quot;research tiktok shop&quot; or &quot;tell me about ai agents&quot;.
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech mode state label under orb */}
      <AnimatePresence>
        {appMode === "speech" && speechActive && !voice.state.startsWith("listen") && !thinking && (
          <motion.div
            className="absolute top-[calc(50%+80px)] left-1/2 -translate-x-1/2 z-40 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {tts.isSpeaking && (
              <span className="text-[10px] uppercase tracking-[0.3em] text-purple-400/60">Speaking...</span>
            )}
          </motion.div>
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
              <motion.p
                className="text-xs text-white/50 max-w-[280px] text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {input}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice error toast */}
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

      {/* ===== CHAT MODE: Full input bar ===== */}
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
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask WHUT OS..."
              className="glass-input flex-1 px-3 md:px-4 py-2.5 md:py-3 text-sm outline-none placeholder:text-white/40"
            />
            <button onClick={handleSubmit} className="glass-button px-4 md:px-5 py-2.5 md:py-3 text-xs uppercase tracking-[0.2em]">
              →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SPEECH MODE: Orb-centric with minimal controls ===== */}
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
            {/* Main speech button */}
            {!speechActive ? (
              <button
                onClick={startSpeechMode}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-all text-sm text-white/70 hover:text-white"
                title="Start speech mode"
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
                title="Stop speech mode"
              >
                <motion.div
                  className="w-3 h-3 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                Stop
              </button>
            )}
            {/* Mute toggle */}
            <button
              onClick={tts.toggleMute}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white/70"
              title={tts.isMuted ? "Unmute AI voice" : "Mute AI voice"}
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
