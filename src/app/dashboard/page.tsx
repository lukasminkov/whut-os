"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import VisualizationEngine from "@/components/VisualizationEngine";
import type { VisualizationBlock } from "@/lib/visualization-tools";
import SceneRenderer from "@/components/SceneRenderer";
import type { SceneNode } from "@/lib/scene-types";
import AIOrb from "@/components/AIOrb";
import type { OrbState } from "@/components/AIOrb";
import ModeToggle, { type AppMode } from "@/components/ModeToggle";
import { useGoogleData, EmailsList, DriveFilesList, CalendarEventsList } from "@/components/GoogleHUD";
import ContextualLoadingPill, { detectLoadingAction, type LoadingAction } from "@/components/ContextualLoadingPill";
import NotificationOverlay, { emailsToNotifications } from "@/components/NotificationOverlay";
import ConversationTranscript, { type TranscriptMessage } from "@/components/ConversationTranscript";
import { useTTS, extractSpeakableText } from "@/hooks/useTTS";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COMMANDS = [
  "revenue",
  "sales",
  "campaigns",
  "creators",
  "emails",
  "inbox",
  "calendar",
  "drive",
  "finance",
  "profit",
  "briefing",
  "morning",
  "research [topic]",
  "help",
] as const;

type ViewKey =
  | "revenue"
  | "campaigns"
  | "creators"
  | "emails"
  | "calendar"
  | "drive"
  | "finance"
  | "briefing"
  | "help"
  | null;

const revenueData = Array.from({ length: 30 }).map((_, index) => {
  const base = 3200 + Math.sin(index / 3) * 800;
  return {
    day: index + 1,
    shopify: Math.round(base + Math.random() * 900),
    amazon: Math.round(base * 0.8 + Math.random() * 700),
    tiktok: Math.round(base * 0.6 + Math.random() * 500),
  };
});

const financeData = [
  { name: "Operations", value: 38 },
  { name: "Ad Spend", value: 26 },
  { name: "Payroll", value: 18 },
  { name: "Tools", value: 10 },
  { name: "Other", value: 8 },
];

const sparklineData = Array.from({ length: 12 }).map((_, index) => ({
  name: index + 1,
  value: 18 + Math.sin(index / 2) * 6 + Math.random() * 3,
}));

const creatorSpotlight = Array.from({ length: 10 }).map((_, index) => ({
  name: index,
  value: 26 + Math.sin(index / 3) * 10 + Math.random() * 4,
}));

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
  onFocus,
  isFocused,
  isDimmed,
}: {
  id: string;
  children: ReactNode;
  style: CSSProperties;
  className?: string;
  onClose?: () => void;
  onFocus?: (id: string) => void;
  isFocused?: boolean;
  isDimmed?: boolean;
}) => (
  <motion.div
    className={`absolute glass-card p-5 hidden md:block ${className}`}
    style={{
      ...style,
      opacity: isDimmed ? 0.7 : 1,
      zIndex: isFocused ? 60 : style?.zIndex,
      boxShadow: isFocused
        ? "0 0 0 1px rgba(255,255,255,0.35), 0 18px 40px rgba(0, 212, 170, 0.18)"
        : undefined,
      cursor: "grab",
    }}
    onClick={(event) => {
      event.stopPropagation();
      onFocus?.(id);
    }}
    {...panelMotion}
    animate={{ ...panelMotion.animate, scale: isFocused ? 1.02 : 1 }}
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

const HeaderStat = ({ label, value }: { label: string; value: string }) => (
  <div className="text-xs uppercase tracking-[0.35em] text-white/50">
    {label}
    <div className="mt-2 text-xl md:text-2xl font-semibold tracking-wide text-white">{value}</div>
  </div>
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

let msgIdCounter = 0;
function nextMsgId() {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<ViewKey>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [focusedPanel, setFocusedPanel] = useState<string | null>(null);
  const [aiBlocks, setAiBlocks] = useState<VisualizationBlock[] | null>(null);
  const [aiScene, setAiScene] = useState<SceneNode | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<{ id: string; from: string; subject: string; snippet: string; date: string; unread: boolean; important: boolean } | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("whut_app_mode") as AppMode) || "chat";
    }
    return "chat";
  });
  const [speechActive, setSpeechActive] = useState(false); // whether speech loop is running
  const tts = useTTS();
  const googleData = useGoogleData();
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

  useEffect(() => {
    setFocusedPanel(null);
  }, [activeView]);

  // Auto-show notification overlay when unread emails load
  useEffect(() => {
    if (googleData.emails.some(e => e.unread) && !activeView && !aiLoading) {
      const timer = setTimeout(() => setShowNotifications(true), 2000);
      const hideTimer = setTimeout(() => setShowNotifications(false), 8000);
      return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }
  }, [googleData.emails.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const resolveView = (text: string): ViewKey => {
    const normalized = text.toLowerCase();
    if (/revenue|sales|earnings/.test(normalized)) return "revenue";
    if (/campaign|ads|adset/.test(normalized)) return "campaigns";
    if (/creator|influencer/.test(normalized)) return "creators";
    if (/email|inbox|messages|gmail/.test(normalized)) return "emails";
    if (/calendar|events|schedule|meetings/.test(normalized)) return "calendar";
    if (/drive|files|documents|docs/.test(normalized)) return "drive";
    if (/finance|profit|expenses|p&l/.test(normalized)) return "finance";
    if (/brief|briefing|morning|summary|overview/.test(normalized)) return "briefing";
    if (/help|commands/.test(normalized)) return "help";
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
    setAiScene(null);

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
    setAiBlocks(null);
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

      // V2 scene graph response — check top-level scene OR scene inside blocks
      const sceneData = result.scene?.layout 
        || result.blocks?.find((b: any) => b.type === "render_scene")?.data?.layout;
      if (sceneData) {
        setAiScene(sceneData);
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
      const summaryText = speakable || (sceneData ? "Here you go." : "Done.");

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

      // Update chat history
      const hasAnyResponse = (result.blocks && result.blocks.length > 0) || result.scene?.layout;
      if (hasAnyResponse) {
        setChatHistory(prev => [
          ...prev,
          { role: "user", content: trimmed },
          { role: "assistant", content: speakable || "[visualization response]" },
        ]);
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
  }, [chatHistory]);

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

  const handleFocus = (id: string) => {
    setFocusedPanel((prev) => (prev === id ? null : id));
  };

  // Compute orb visual state
  const orbState: OrbState = tts.isSpeaking
    ? "speaking"
    : thinking || aiLoading
    ? "thinking"
    : voice.state === "listening"
    ? "listening"
    : "idle";

  const hasContent = activeView || aiBlocks || aiScene;
  const orbSize = hasContent ? 180 : 300;
  const mobileOrbSize = hasContent ? 100 : 160;
  const closeView = () => { setActiveView(null); setAiBlocks(null); setAiScene(null); };

  return (
    <div
      className="h-full w-full overflow-hidden relative"
      onClick={() => setFocusedPanel(null)}
    >
      {/* Orb */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            y: hasContent ? -80 : 0,
            scale: hasContent ? 0.7 : 1,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="hidden md:block">
            <AIOrb state={orbState} size={orbSize} />
          </div>
          <div className="md:hidden">
            <AIOrb state={orbState} size={mobileOrbSize} />
          </div>
          <AnimatePresence>
            {!hasContent && showGreeting && !loadingAction && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 md:mt-6 text-center text-xs md:text-sm tracking-[0.3em] text-white/60"
              >
                {greeting}
              </motion.p>
            )}
          </AnimatePresence>
          {/* Contextual loading pill below orb */}
          <div className="mt-4 flex justify-center">
            <ContextualLoadingPill action={loadingAction} />
          </div>
        </motion.div>
      </div>

      {/* Notification overlay for emails */}
      <NotificationOverlay
        items={emailsToNotifications(googleData.emails)}
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Floating conversation transcript */}
      <ConversationTranscript messages={transcriptMessages} maxVisible={5} />

      <AnimatePresence mode="wait">
        {/* ========== REVENUE ========== */}
        {activeView === "revenue" && (
          <motion.div key="revenue" className="absolute inset-0">
            {/* Mobile */}
            <MobileViewContainer onClose={closeView}>
              <MobileCard className="glass-card-bright">
                <HeaderStat label="Total Revenue" value="$142,382" />
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                  +12.4% vs last month
                </div>
              </MobileCard>
              <MobileCard>
                <div className="space-y-3 text-sm">
                  {[
                    { name: "Shopify", value: "$68K" },
                    { name: "Amazon", value: "$45K" },
                    { name: "TikTok", value: "$29K" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-white/70">{item.name}</span>
                      <span className="font-semibold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </MobileCard>
              <MobileCard className="glass-card-bright">
                <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40">Revenue (Last 30 Days)</div>
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="m-shopify" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="m-amazon" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="m-tiktok" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f472b6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 9 }} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 9 }} width={40} />
                      <Tooltip contentStyle={{ background: "rgba(6,6,15,0.85)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
                      <Area type="monotone" dataKey="shopify" stackId="1" stroke="#00d4aa" fill="url(#m-shopify)" />
                      <Area type="monotone" dataKey="amazon" stackId="1" stroke="#6366f1" fill="url(#m-amazon)" />
                      <Area type="monotone" dataKey="tiktok" stackId="1" stroke="#f472b6" fill="url(#m-tiktok)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </MobileCard>
              <MobileCard>
                <div className="text-sm text-white/70">Top product</div>
                <div className="mt-1 text-base font-semibold text-white">Glow Serum Kit — $18.4K this month</div>
              </MobileCard>
            </MobileViewContainer>

            {/* Desktop panels */}
            <Panel id="revenue-summary" style={{ top: "10%", left: "14%", width: 280 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "revenue-summary"} isDimmed={!!focusedPanel && focusedPanel !== "revenue-summary"}>
              <HeaderStat label="Total Revenue" value="$142,382" />
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                +12.4% vs last month
              </div>
            </Panel>
            <Panel id="revenue-channels" style={{ top: "12%", right: "14%", width: 240 }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "revenue-channels"} isDimmed={!!focusedPanel && focusedPanel !== "revenue-channels"}>
              <div className="space-y-3 text-sm">
                {[{ name: "Shopify", value: "$68K" }, { name: "Amazon", value: "$45K" }, { name: "TikTok", value: "$29K" }].map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-white/70">{item.name}</span>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel id="revenue-chart" style={{ top: "22%", left: "50%", width: 720, height: 360, transform: "translateX(-50%)" }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "revenue-chart"} isDimmed={!!focusedPanel && focusedPanel !== "revenue-chart"}>
              <div className="mb-4 text-xs uppercase tracking-[0.3em] text-white/40">Revenue (Last 30 Days)</div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="shopify" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="amazon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="tiktok" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f472b6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "rgba(6,6,15,0.85)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    <Area type="monotone" dataKey="shopify" stackId="1" stroke="#00d4aa" fill="url(#shopify)" />
                    <Area type="monotone" dataKey="amazon" stackId="1" stroke="#6366f1" fill="url(#amazon)" />
                    <Area type="monotone" dataKey="tiktok" stackId="1" stroke="#f472b6" fill="url(#tiktok)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel id="revenue-top-product" style={{ bottom: "12%", left: "50%", width: 420, transform: "translateX(-50%)" }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "revenue-top-product"} isDimmed={!!focusedPanel && focusedPanel !== "revenue-top-product"}>
              <div className="text-sm text-white/70">Top product</div>
              <div className="mt-2 text-lg font-semibold text-white">Glow Serum Kit — $18.4K this month</div>
            </Panel>
          </motion.div>
        )}

        {/* ========== CAMPAIGNS ========== */}
        {activeView === "campaigns" && (
          <motion.div key="campaigns" className="absolute inset-0">
            <MobileViewContainer onClose={closeView}>
              <MobileCard className="glass-card-bright">
                <HeaderStat label="Active Campaigns" value="5" />
              </MobileCard>
              {[
                { name: "Summer Drop", roi: "3.4x", budget: 82 },
                { name: "Glow Serum", roi: "2.6x", budget: 68 },
                { name: "Creator Boost", roi: "2.1x", budget: 54 },
                { name: "Holiday Tease", roi: "1.8x", budget: 46 },
              ].map((campaign) => (
                <MobileCard key={campaign.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-white">{campaign.name}</span>
                    <span className="text-emerald-300">{campaign.roi}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${campaign.budget}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-white/60">Budget utilized</div>
                </MobileCard>
              ))}
              <MobileCard>
                <div className="text-xs uppercase tracking-[0.3em] text-white/50">Best performer</div>
                <div className="mt-2 text-lg font-semibold text-white">Summer Drop — 3.4x ROI</div>
              </MobileCard>
            </MobileViewContainer>

            <Panel id="campaigns-summary" style={{ top: "10%", left: "50%", width: 280, transform: "translateX(-50%)" }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "campaigns-summary"} isDimmed={!!focusedPanel && focusedPanel !== "campaigns-summary"}>
              <HeaderStat label="Active Campaigns" value="5" />
            </Panel>
            <Panel id="campaigns-grid" style={{ top: "20%", left: "50%", width: 720, height: 360, transform: "translateX(-50%)" }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "campaigns-grid"} isDimmed={!!focusedPanel && focusedPanel !== "campaigns-grid"}>
              <div className="grid h-full grid-cols-2 gap-4">
                {[
                  { name: "Summer Drop", roi: "3.4x", budget: 82 },
                  { name: "Glow Serum", roi: "2.6x", budget: 68 },
                  { name: "Creator Boost", roi: "2.1x", budget: 54 },
                  { name: "Holiday Tease", roi: "1.8x", budget: 46 },
                ].map((campaign) => (
                  <div key={campaign.name} className="glass-card p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{campaign.name}</span>
                      <span className="text-emerald-300">{campaign.roi}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${campaign.budget}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-white/60">Budget utilized</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel id="campaigns-best" style={{ bottom: "14%", left: "12%", width: 320 }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "campaigns-best"} isDimmed={!!focusedPanel && focusedPanel !== "campaigns-best"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Best performer</div>
              <div className="mt-3 text-lg font-semibold text-white">Summer Drop — 3.4x ROI</div>
            </Panel>
          </motion.div>
        )}

        {/* ========== CREATORS ========== */}
        {activeView === "creators" && (
          <motion.div key="creators" className="absolute inset-0">
            <MobileViewContainer onClose={closeView}>
              <MobileCard className="glass-card-bright">
                <HeaderStat label="Total Creators" value="4,073" />
              </MobileCard>
              <div className="grid grid-cols-2 gap-3">
                {["Mila Santos", "Jae Parker", "Kira Vale", "Nico Reed", "Sasha Kim", "Aria Bloom"].map((name, idx) => (
                  <MobileCard key={name}>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400/70 to-indigo-400/70 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{name}</div>
                        <div className="text-[10px] text-white/50">TikTok</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white/60">{(idx + 1) * 12}K engagements</div>
                  </MobileCard>
                ))}
              </div>
              <MobileCard className="glass-card-bright">
                <div className="text-xs uppercase tracking-[0.3em] text-white/50">Top Creator</div>
                <div className="mt-2 text-lg font-semibold text-white">Juno Lee</div>
                <div className="text-xs text-emerald-300">+18% growth</div>
                <div className="w-full h-[120px] mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={creatorSpotlight}>
                      <Line type="monotone" dataKey="value" stroke="#00d4aa" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </MobileCard>
            </MobileViewContainer>

            <Panel id="creators-summary" style={{ top: "10%", left: "50%", width: 300, transform: "translateX(-50%)" }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "creators-summary"} isDimmed={!!focusedPanel && focusedPanel !== "creators-summary"}>
              <HeaderStat label="Total Creators" value="4,073" />
            </Panel>
            <Panel id="creators-grid" style={{ top: "20%", left: "50%", width: 700, height: 360, transform: "translateX(-50%)" }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "creators-grid"} isDimmed={!!focusedPanel && focusedPanel !== "creators-grid"}>
              <div className="grid h-full grid-cols-3 gap-4">
                {["Mila Santos", "Jae Parker", "Kira Vale", "Nico Reed", "Sasha Kim", "Aria Bloom"].map((name, idx) => (
                  <div key={name} className="glass-card flex flex-col justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400/70 to-indigo-400/70" />
                      <div>
                        <div className="text-sm font-semibold text-white">{name}</div>
                        <div className="text-xs text-white/50">TikTok</div>
                      </div>
                    </div>
                    <div className="text-xs text-white/60">{(idx + 1) * 12}K engagements</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel id="creators-top" style={{ top: "24%", right: "12%", width: 240, height: 320 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "creators-top"} isDimmed={!!focusedPanel && focusedPanel !== "creators-top"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Top Creator</div>
              <div className="mt-2 text-lg font-semibold text-white">Juno Lee</div>
              <div className="text-xs text-emerald-300">+18% growth</div>
              <div className="mt-4" style={{ width: 200, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={creatorSpotlight}>
                    <Line type="monotone" dataKey="value" stroke="#00d4aa" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </motion.div>
        )}

        {/* ========== EMAILS (Real Gmail) ========== */}
        {activeView === "emails" && (
          <motion.div key="emails" className="absolute inset-0">
            <MobileViewContainer onClose={closeView}>
              <MobileCard className="glass-card-bright">
                <HeaderStat label="Unread" value={`${googleData.emails.filter(e => e.unread).length} unread`} />
                {!googleData.isConnected && <div className="mt-2 text-xs text-amber-400/80">Connect Google in Integrations to see real emails</div>}
              </MobileCard>
              <MobileCard>
                <EmailsList emails={googleData.emails} onSelect={setSelectedEmail} />
              </MobileCard>
              {selectedEmail && (
                <MobileCard className="glass-card-bright">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/50">Selected</div>
                  <div className="mt-2 text-base font-semibold text-white">{selectedEmail.subject}</div>
                  <div className="mt-1 text-xs text-white/60">From {selectedEmail.from}</div>
                  <p className="mt-3 text-sm text-white/70">{selectedEmail.snippet}</p>
                </MobileCard>
              )}
            </MobileViewContainer>

            <Panel id="emails-summary" style={{ top: "10%", left: "50%", width: 320, transform: "translateX(-50%)" }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "emails-summary"} isDimmed={!!focusedPanel && focusedPanel !== "emails-summary"}>
              <HeaderStat label="Gmail" value={googleData.isConnected ? `${googleData.emails.filter(e => e.unread).length} unread` : "Not connected"} />
              {!googleData.isConnected && <div className="mt-2 text-xs text-amber-400/80">Connect Google in Integrations</div>}
              {googleData.loading.emails && <div className="mt-2 text-xs text-white/30 animate-pulse">Loading...</div>}
            </Panel>
            <Panel id="emails-list" style={{ top: "20%", left: "12%", width: 340, height: 400 }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "emails-list"} isDimmed={!!focusedPanel && focusedPanel !== "emails-list"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Inbox</div>
              <EmailsList emails={googleData.emails} onSelect={setSelectedEmail} />
            </Panel>
            <Panel id="emails-selected" style={{ top: "20%", right: "12%", width: 420, height: 400 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "emails-selected"} isDimmed={!!focusedPanel && focusedPanel !== "emails-selected"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Selected</div>
              {selectedEmail ? (
                <>
                  <div className="mt-3 text-lg font-semibold text-white">{selectedEmail.subject}</div>
                  <div className="mt-2 text-xs text-white/60">From {selectedEmail.from}</div>
                  <p className="mt-4 text-sm text-white/70">{selectedEmail.snippet}</p>
                </>
              ) : (
                <div className="mt-4 text-sm text-white/30">Select an email to preview</div>
              )}
            </Panel>
          </motion.div>
        )}

        {/* ========== CALENDAR (Google Calendar) ========== */}
        {activeView === "calendar" && (
          <motion.div key="calendar" className="absolute inset-0">
            <MobileViewContainer onClose={closeView}>
              <MobileCard className="glass-card-bright">
                <HeaderStat label="Calendar" value={googleData.isConnected ? `${googleData.calendarEvents.length} upcoming` : "Not connected"} />
                {!googleData.isConnected && <div className="mt-2 text-xs text-amber-400/80">Connect Google in Integrations</div>}
              </MobileCard>
              <MobileCard>
                <CalendarEventsList events={googleData.calendarEvents} />
              </MobileCard>
            </MobileViewContainer>

            <Panel id="calendar-header" style={{ top: "10%", left: "50%", width: 360, transform: "translateX(-50%)" }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "calendar-header"} isDimmed={!!focusedPanel && focusedPanel !== "calendar-header"}>
              <HeaderStat label="Google Calendar" value={googleData.isConnected ? `${googleData.calendarEvents.length} upcoming` : "Not connected"} />
              {!googleData.isConnected && <div className="mt-2 text-xs text-amber-400/80">Connect Google in Integrations</div>}
              {googleData.loading.calendar && <div className="mt-2 text-xs text-white/30 animate-pulse">Loading...</div>}
            </Panel>
            <Panel id="calendar-events" style={{ top: "22%", left: "50%", width: 400, height: 420, transform: "translateX(-50%)" }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "calendar-events"} isDimmed={!!focusedPanel && focusedPanel !== "calendar-events"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Upcoming Events</div>
              <CalendarEventsList events={googleData.calendarEvents} />
            </Panel>
          </motion.div>
        )}

        {/* ========== DRIVE (Google Drive) ========== */}
        {activeView === "drive" && (
          <motion.div key="drive" className="absolute inset-0">
            <MobileViewContainer onClose={closeView}>
              <MobileCard className="glass-card-bright">
                <HeaderStat label="Drive" value={googleData.isConnected ? `${googleData.driveFiles.length} recent files` : "Not connected"} />
                {!googleData.isConnected && <div className="mt-2 text-xs text-amber-400/80">Connect Google in Integrations</div>}
              </MobileCard>
              <MobileCard>
                <DriveFilesList files={googleData.driveFiles} />
              </MobileCard>
            </MobileViewContainer>

            <Panel id="drive-header" style={{ top: "10%", left: "50%", width: 360, transform: "translateX(-50%)" }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "drive-header"} isDimmed={!!focusedPanel && focusedPanel !== "drive-header"}>
              <HeaderStat label="Google Drive" value={googleData.isConnected ? `${googleData.driveFiles.length} recent files` : "Not connected"} />
              {!googleData.isConnected && <div className="mt-2 text-xs text-amber-400/80">Connect Google in Integrations</div>}
              {googleData.loading.drive && <div className="mt-2 text-xs text-white/30 animate-pulse">Loading...</div>}
            </Panel>
            <Panel id="drive-files" style={{ top: "22%", left: "50%", width: 420, height: 420, transform: "translateX(-50%)" }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "drive-files"} isDimmed={!!focusedPanel && focusedPanel !== "drive-files"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Recent Files</div>
              <DriveFilesList files={googleData.driveFiles} />
            </Panel>
          </motion.div>
        )}

        {/* ========== FINANCE ========== */}
        {activeView === "finance" && (
          <motion.div key="finance" className="absolute inset-0">
            <MobileViewContainer onClose={closeView}>
              <MobileCard className="glass-card-bright">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Revenue", value: "$142K", color: "text-white" },
                    { label: "Expenses", value: "$94K", color: "text-white" },
                    { label: "Profit", value: "$48K", color: "text-emerald-300" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">{s.label}</div>
                      <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </MobileCard>
              <MobileCard>
                <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Expense Breakdown</div>
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={financeData} dataKey="value" innerRadius={60} outerRadius={90} fill="#00d4aa" stroke="rgba(255,255,255,0.1)">
                        {financeData.map((entry, index) => (
                          <Cell key={`m-slice-${entry.name}`} fill={["#00d4aa", "#6366f1", "#f472b6", "#38bdf8", "#fbbf24"][index]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "rgba(6,6,15,0.85)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </MobileCard>
              <MobileCard className="glass-card-bright">
                <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Monthly P&L</div>
                <div className="space-y-2 text-xs">
                  {["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"].map((month, idx) => (
                    <div key={month} className="flex items-center justify-between text-white/70">
                      <span>{month}</span>
                      <span className="text-white">${42 + idx * 4}K</span>
                      <span className="text-emerald-300">+{8 + idx}%</span>
                    </div>
                  ))}
                </div>
              </MobileCard>
            </MobileViewContainer>

            <Panel id="finance-summary" style={{ top: "22%", left: "12%", width: 240, height: 300 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "finance-summary"} isDimmed={!!focusedPanel && focusedPanel !== "finance-summary"}>
              <div className="space-y-4">
                <div><div className="text-xs uppercase tracking-[0.3em] text-white/50">Revenue</div><div className="text-xl font-semibold text-white">$142K</div></div>
                <div><div className="text-xs uppercase tracking-[0.3em] text-white/50">Expenses</div><div className="text-xl font-semibold text-white">$94K</div></div>
                <div><div className="text-xs uppercase tracking-[0.3em] text-white/50">Profit</div><div className="text-xl font-semibold text-emerald-300">$48K</div></div>
              </div>
            </Panel>
            <Panel id="finance-breakdown" style={{ top: "20%", left: "50%", width: 380, height: 360, transform: "translateX(-50%)" }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "finance-breakdown"} isDimmed={!!focusedPanel && focusedPanel !== "finance-breakdown"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Expense Breakdown</div>
              <div className="mt-4" style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={financeData} dataKey="value" innerRadius={70} outerRadius={110} fill="#00d4aa" stroke="rgba(255,255,255,0.1)">
                      {financeData.map((entry, index) => (
                        <Cell key={`slice-${entry.name}`} fill={["#00d4aa", "#6366f1", "#f472b6", "#38bdf8", "#fbbf24"][index]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "rgba(6,6,15,0.85)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel id="finance-pl" style={{ top: "22%", right: "12%", width: 260, height: 300 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "finance-pl"} isDimmed={!!focusedPanel && focusedPanel !== "finance-pl"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Monthly P&L</div>
              <div className="mt-4 space-y-2 text-xs">
                {["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"].map((month, idx) => (
                  <div key={month} className="flex items-center justify-between text-white/70">
                    <span>{month}</span>
                    <span className="text-white">${42 + idx * 4}K</span>
                    <span className="text-emerald-300">+{8 + idx}%</span>
                  </div>
                ))}
              </div>
            </Panel>
          </motion.div>
        )}

        {/* ========== BRIEFING ========== */}
        {activeView === "briefing" && (
          <motion.div key="briefing" className="absolute inset-0">
            <MobileViewContainer onClose={closeView}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Revenue", value: "$142K" },
                  { label: "Campaigns", value: "5" },
                  { label: "Creators", value: "4,073" },
                  { label: "Messages", value: "12" },
                ].map((s) => (
                  <MobileCard key={s.label} className="glass-card-bright">
                    <HeaderStat label={s.label} value={s.value} />
                  </MobileCard>
                ))}
              </div>
              <MobileCard>
                <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Morning Briefing</div>
                <div className="w-full h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <Line type="monotone" dataKey="value" stroke="#00d4aa" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  <li>• Approve 3 creator contracts waiting in pipeline</li>
                  <li>• Replenish Glow Serum inventory within 48h</li>
                  <li>• Review campaign creative refresh for Summer Drop</li>
                </ul>
              </MobileCard>
            </MobileViewContainer>

            <Panel id="briefing-revenue" style={{ top: "10%", left: "12%", width: 220 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "briefing-revenue"} isDimmed={!!focusedPanel && focusedPanel !== "briefing-revenue"}>
              <HeaderStat label="Revenue" value="$142K" />
            </Panel>
            <Panel id="briefing-campaigns" style={{ top: "10%", right: "12%", width: 220 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "briefing-campaigns"} isDimmed={!!focusedPanel && focusedPanel !== "briefing-campaigns"}>
              <HeaderStat label="Campaigns" value="5" />
            </Panel>
            <Panel id="briefing-creators" style={{ bottom: "14%", left: "12%", width: 220 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "briefing-creators"} isDimmed={!!focusedPanel && focusedPanel !== "briefing-creators"}>
              <HeaderStat label="Creators" value="4,073" />
            </Panel>
            <Panel id="briefing-messages" style={{ bottom: "14%", right: "12%", width: 220 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "briefing-messages"} isDimmed={!!focusedPanel && focusedPanel !== "briefing-messages"}>
              <HeaderStat label="Messages" value="12" />
            </Panel>
            <Panel id="briefing-main" style={{ top: "26%", left: "50%", width: 520, height: 320, transform: "translateX(-50%)" }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "briefing-main"} isDimmed={!!focusedPanel && focusedPanel !== "briefing-main"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Morning Briefing</div>
              <div className="mt-4" style={{ width: "100%", height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="value" stroke="#00d4aa" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>• Approve 3 creator contracts waiting in pipeline</li>
                <li>• Replenish Glow Serum inventory within 48h</li>
                <li>• Review campaign creative refresh for Summer Drop</li>
              </ul>
            </Panel>
          </motion.div>
        )}

        {/* ========== V2 SCENE GRAPH RESPONSE ========== */}
        {aiScene && (
          <motion.div key="ai-scene" className="absolute inset-0 z-30">
            {/* Mobile */}
            <div className="md:hidden absolute inset-0 pt-4 pb-24 px-4 overflow-y-auto">
              <button
                onClick={closeView}
                className="sticky top-0 z-10 mb-3 flex items-center gap-2 text-xs text-white/50 hover:text-white/80"
              >
                ← Back
              </button>
              <SceneRenderer scene={aiScene} />
            </div>
            {/* Desktop */}
            <motion.div
              className="hidden md:block absolute inset-0 overflow-y-auto pt-6 pb-24 px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="max-w-5xl mx-auto relative">
                <button
                  onClick={closeView}
                  className="absolute -top-1 right-0 z-10 text-xs text-white/40 hover:text-white transition px-3 py-1.5 glass-card"
                >
                  ✕ Close
                </button>
                <SceneRenderer scene={aiScene} />
              </div>
            </motion.div>
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

        {/* ========== LOADING STATE ========== */}
        {aiLoading && !aiBlocks && (
          <motion.div key="ai-loading" className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <motion.div
              className="px-6 py-3 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center gap-3">
                <span className="inline-block h-2 w-2 rounded-full bg-[#00d4aa] animate-pulse" />
                <motion.span className="text-sm text-white/40" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
                  Thinking...
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        )}

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

            <Panel id="help-commands" style={{ top: "28%", left: "50%", width: 480, transform: "translateX(-50%)" }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "help-commands"} isDimmed={!!focusedPanel && focusedPanel !== "help-commands"}>
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
