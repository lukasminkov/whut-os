"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import VisualizationEngine from "@/components/VisualizationEngine";
import type { VisualizationBlock } from "@/lib/visualization-tools";
import AIOrb from "@/components/AIOrb";
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

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<ViewKey>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [focusedPanel, setFocusedPanel] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiBlocks, setAiBlocks] = useState<VisualizationBlock[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 4200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setFocusedPanel(null);
  }, [activeView]);

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
    if (/email|inbox|messages/.test(normalized)) return "emails";
    if (/finance|profit|expenses|p&l/.test(normalized)) return "finance";
    if (/brief|briefing|morning|summary|overview/.test(normalized)) return "briefing";
    if (/help|commands/.test(normalized)) return "help";
    return null;
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const research = parseResearchTopic(trimmed);
    setInput("");
    setThinking(true);
    setActiveView(null);
    setAiResponse(null);
    setAiBlocks(null);

    const target = research ? null : resolveView(trimmed);
    if (target) {
      setAiLoading(false);
      setTimeout(() => {
        setActiveView(target);
        setThinking(false);
      }, 1000);
      return;
    }

    setAiLoading(true);
    setAiResponse("");
    setAiBlocks(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: chatHistory }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Request failed");
      }
      const result = await response.json();
      setThinking(false);
      
      if (result.blocks && result.blocks.length > 0) {
        // Check if we have any visualization blocks (non-text)
        const hasVisuals = result.blocks.some((b: any) => b.type !== "text");
        if (hasVisuals) {
          setAiBlocks(result.blocks);
          setAiResponse(null);
        } else {
          // Text-only response
          const textContent = result.blocks
            .filter((b: any) => b.type === "text")
            .map((b: any) => b.content)
            .join("\n\n");
          setAiResponse(textContent);
          setAiBlocks(null);
        }
        // Build text summary for chat history
        const textParts = result.blocks
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.content)
          .join("\n\n");
        setChatHistory(prev => [
          ...prev,
          { role: "user", content: trimmed },
          { role: "assistant", content: textParts || "[visualization response]" },
        ]);
      } else {
        setAiResponse("I couldn't generate a response. Please try again.");
      }
    } catch (error: any) {
      setAiResponse(`Error: ${error?.message || "Request failed"}`);
      setThinking(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFocus = (id: string) => {
    setFocusedPanel((prev) => (prev === id ? null : id));
  };

  const orbSize = activeView ? 180 : 300;
  const mobileOrbSize = activeView ? 100 : 160;
  const closeView = () => setActiveView(null);

  return (
    <div
      className="h-full w-full overflow-hidden relative"
      onClick={() => setFocusedPanel(null)}
    >
      {/* Orb */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            y: activeView ? -80 : 0,
            scale: activeView ? 0.7 : 1,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="hidden md:block">
            <AIOrb state={thinking ? "thinking" : "idle"} size={orbSize} />
          </div>
          <div className="md:hidden">
            <AIOrb state={thinking ? "thinking" : "idle"} size={mobileOrbSize} />
          </div>
          <AnimatePresence>
            {!activeView && showGreeting && (
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
        </motion.div>
      </div>

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

        {/* ========== EMAILS ========== */}
        {activeView === "emails" && (
          <motion.div key="emails" className="absolute inset-0">
            <MobileViewContainer onClose={closeView}>
              <MobileCard className="glass-card-bright">
                <HeaderStat label="Unread" value="12 — 3 Urgent" />
              </MobileCard>
              {[
                { sender: "Kora @ Shopify", subject: "Inventory alert", time: "5m", urgent: true },
                { sender: "Campaign Ops", subject: "Creative approvals", time: "32m", urgent: false },
                { sender: "Finance", subject: "Payout schedule", time: "1h", urgent: false },
                { sender: "Logistics", subject: "Fulfillment update", time: "3h", urgent: false },
              ].map((mail) => (
                <MobileCard key={mail.subject}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-white">{mail.sender}</span>
                    <span className="text-xs text-white/50">{mail.time}</span>
                  </div>
                  <div className="mt-1 text-xs text-white/60">{mail.subject}</div>
                  <span className={`mt-2 inline-block h-2 w-2 rounded-full ${mail.urgent ? "bg-rose-400" : "bg-emerald-400"}`} />
                </MobileCard>
              ))}
              <MobileCard className="glass-card-bright">
                <div className="text-xs uppercase tracking-[0.3em] text-white/50">Selected</div>
                <div className="mt-2 text-base font-semibold text-white">Inventory alert</div>
                <div className="mt-1 text-xs text-white/60">From Kora @ Shopify</div>
                <p className="mt-3 text-sm text-white/70">
                  We've detected a spike in demand for Glow Serum Kit. Inventory levels will hit the reorder threshold in 48 hours. Would you like to auto-replenish 1,200 units?
                </p>
              </MobileCard>
            </MobileViewContainer>

            <Panel id="emails-summary" style={{ top: "10%", left: "50%", width: 320, transform: "translateX(-50%)" }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "emails-summary"} isDimmed={!!focusedPanel && focusedPanel !== "emails-summary"}>
              <HeaderStat label="Unread" value="12 — 3 Urgent" />
            </Panel>
            <Panel id="emails-list" style={{ top: "20%", left: "12%", width: 320, height: 360 }} onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "emails-list"} isDimmed={!!focusedPanel && focusedPanel !== "emails-list"}>
              <div className="space-y-3">
                {[
                  { sender: "Kora @ Shopify", subject: "Inventory alert", time: "5m" },
                  { sender: "Campaign Ops", subject: "Creative approvals", time: "32m" },
                  { sender: "Finance", subject: "Payout schedule", time: "1h" },
                  { sender: "Logistics", subject: "Fulfillment update", time: "3h" },
                ].map((mail, idx) => (
                  <div key={mail.subject} className="glass-card p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{mail.sender}</span>
                      <span className="text-xs text-white/50">{mail.time}</span>
                    </div>
                    <div className="mt-1 text-xs text-white/60">{mail.subject}</div>
                    <span className={`mt-2 inline-block h-2 w-2 rounded-full ${idx === 0 ? "bg-rose-400" : "bg-emerald-400"}`} />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel id="emails-selected" style={{ top: "20%", right: "12%", width: 420, height: 360 }} className="glass-card-bright" onClose={closeView} onFocus={handleFocus} isFocused={focusedPanel === "emails-selected"} isDimmed={!!focusedPanel && focusedPanel !== "emails-selected"}>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Selected</div>
              <div className="mt-3 text-lg font-semibold text-white">Inventory alert</div>
              <div className="mt-2 text-xs text-white/60">From Kora @ Shopify</div>
              <p className="mt-4 text-sm text-white/70">
                We've detected a spike in demand for Glow Serum Kit. Inventory levels will hit the reorder threshold in 48 hours. Would you like to auto-replenish 1,200 units?
              </p>
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

        {/* ========== AI RESPONSE (Text only) ========== */}
        {(aiResponse !== null && !aiBlocks) && (
          <motion.div key="ai-response" className="absolute inset-0 z-30">
            {/* Mobile AI response */}
            <div className="md:hidden absolute inset-0 flex items-start justify-center pt-16 pb-24 px-4 overflow-y-auto">
              <motion.div
                className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 relative"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <button
                  onClick={() => { setAiResponse(null); setAiLoading(false); }}
                  className="absolute right-3 top-2 text-[10px] text-white/40 hover:text-white"
                >✕</button>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                  {aiLoading && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00d4aa] animate-pulse" />}
                  {aiLoading && !aiResponse ? "Thinking" : "WHUT OS"}
                </div>
                <div className="mt-3 max-h-[60vh] overflow-y-auto text-sm text-white/70 scrollbar-thin">
                  {aiLoading && !aiResponse ? (
                    <div className="flex items-center gap-2 text-white/40">
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>Synthesizing...</motion.span>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none text-sm text-white/70 prose-headings:text-white prose-a:text-[#00d4aa] prose-strong:text-white/90">
                      <ReactMarkdown>{aiResponse ?? ""}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Desktop AI response */}
            <Panel
              id="ai-response"
              style={{ top: "15%", left: "50%", width: 560, maxWidth: "90vw", height: 440, transform: "translateX(-50%)" }}
              className="bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl"
              onClose={() => { setAiResponse(null); setAiLoading(false); }}
              onFocus={handleFocus}
              isFocused={focusedPanel === "ai-response"}
              isDimmed={!!focusedPanel && focusedPanel !== "ai-response"}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                {aiLoading && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00d4aa] animate-pulse" />}
                {aiLoading && !aiResponse ? "Thinking" : "WHUT OS"}
              </div>
              <div className="mt-4 max-h-[360px] overflow-y-auto pr-2 text-sm text-white/70 scrollbar-thin">
                {aiLoading && !aiResponse ? (
                  <div className="flex items-center gap-2 text-white/40">
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>Synthesizing...</motion.span>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none text-sm text-white/70 prose-headings:text-white prose-a:text-[#00d4aa] prose-strong:text-white/90">
                    <ReactMarkdown>{aiResponse ?? ""}</ReactMarkdown>
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>
        )}

        {/* ========== AI VISUALIZATION RESPONSE ========== */}
        {aiBlocks && (
          <motion.div key="ai-viz" className="absolute inset-0 z-30">
            {/* Mobile */}
            <div className="md:hidden absolute inset-0 pt-4 pb-24 px-4 overflow-y-auto">
              <button
                onClick={() => { setAiBlocks(null); setAiResponse(null); setAiLoading(false); }}
                className="sticky top-0 z-10 mb-3 flex items-center gap-2 text-xs text-white/50 hover:text-white/80"
              >
                ← Back
              </button>
              {aiLoading ? (
                <div className="flex items-center justify-center h-40">
                  <motion.span className="text-white/40 text-sm" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>Materializing...</motion.span>
                </div>
              ) : (
                <VisualizationEngine blocks={aiBlocks} />
              )}
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
                  onClick={() => { setAiBlocks(null); setAiResponse(null); setAiLoading(false); }}
                  className="absolute -top-1 right-0 z-10 text-xs text-white/40 hover:text-white transition px-3 py-1.5 glass-card"
                >
                  ✕ Close
                </button>
                {aiLoading ? (
                  <div className="flex items-center justify-center h-60">
                    <motion.span className="text-white/40 text-sm" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>Materializing...</motion.span>
                  </div>
                ) : (
                  <VisualizationEngine blocks={aiBlocks} />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ========== LOADING STATE ========== */}
        {aiLoading && !aiResponse && !aiBlocks && (
          <motion.div key="ai-loading" className="absolute inset-0 z-30 flex items-center justify-center">
            <motion.div
              className="glass-card-bright px-8 py-6 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center gap-3">
                <span className="inline-block h-2 w-2 rounded-full bg-[#00d4aa] animate-pulse" />
                <motion.span className="text-sm text-white/50" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                  Synthesizing response...
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

      {/* Input bar */}
      <div className="absolute bottom-4 md:bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 items-center gap-2">
        <input
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
      </div>
    </div>
  );
}
