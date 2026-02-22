"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

/* Stacked area chart SVG */
function AreaChart({ visible }: { visible: boolean }) {
  const shopify = [65,70,68,72,80,85,78,82,90,88,92,95,87,83,89,94,100,105,98,102,108,112,105,110,115,108,112,118,120,115];
  const amazon =  [40,42,38,45,48,50,46,44,52,55,50,48,53,56,52,49,55,58,54,56,60,62,58,55,60,63,58,62,65,60];
  const tiktok =  [20,22,25,28,30,32,28,26,30,35,32,30,34,38,35,32,36,40,38,35,38,42,40,38,42,45,42,40,44,42];

  const w = 480;
  const h = 180;
  const max = 130;
  const pts = 30;

  const toPath = (data: number[], baseline: number[] | null) => {
    const forward = data.map((v, i) => {
      const x = 40 + (i / (pts - 1)) * (w - 50);
      const y = h - 20 - ((v + (baseline ? baseline[i] : 0)) / max) * (h - 30);
      return `${x},${y}`;
    });
    const back = baseline
      ? [...baseline].reverse().map((v, i) => {
          const x = 40 + ((pts - 1 - i) / (pts - 1)) * (w - 50);
          const y = h - 20 - (v / max) * (h - 30);
          return `${x},${y}`;
        })
      : [`${w - 10},${h - 20}`, `40,${h - 20}`];
    return `M ${forward.join(" L ")} L ${back.join(" L ")} Z`;
  };

  const linePath = (data: number[], baseline: number[] | null) => {
    return data.map((v, i) => {
      const x = 40 + (i / (pts - 1)) * (w - 50);
      const y = h - 20 - ((v + (baseline ? baseline[i] : 0)) / max) * (h - 30);
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    }).join(" ");
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(pct => (
        <line key={pct} x1="40" y1={(h - 20) * (1 - pct)} x2={w - 10} y2={(h - 20) * (1 - pct)} stroke="white" strokeOpacity="0.04" />
      ))}

      {/* Y axis labels */}
      {[0, 3000, 6000, 9000, 12000].map((v, i) => (
        <text key={v} x="35" y={h - 20 - (i / 4) * (h - 30) + 3} fill="white" fillOpacity="0.2" fontSize="7" textAnchor="end">{v > 0 ? `${v / 1000}K` : "0"}</text>
      ))}

      {/* X axis labels */}
      {[1, 5, 10, 15, 20, 25, 30].map(d => (
        <text key={d} x={40 + ((d - 1) / 29) * (w - 50)} y={h - 4} fill="white" fillOpacity="0.2" fontSize="7" textAnchor="middle">{d}</text>
      ))}

      {visible && (
        <>
          <motion.path d={toPath(tiktok, null)} fill="url(#tg)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
          <motion.path d={toPath(amazon, tiktok)} fill="url(#ag)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.2 }} />
          <motion.path d={toPath(shopify, amazon.map((v, i) => v + tiktok[i]))} fill="url(#sg)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.4 }} />
          <motion.path d={linePath(tiktok, null)} fill="none" stroke="#00d4aa" strokeWidth="1.5" strokeOpacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5 }} />
          <motion.path d={linePath(amazon, tiktok)} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.2 }} />
          <motion.path d={linePath(shopify, amazon.map((v, i) => v + tiktok[i]))} fill="none" stroke="#00d4aa" strokeWidth="1.5" strokeOpacity="0.8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.4 }} />
        </>
      )}
    </svg>
  );
}

/* Typing animation hook */
function useTypingAnimation(text: string, startDelay: number, enabled: boolean) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let i = 0;
    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, 40);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(startTimeout);
  }, [text, startDelay, enabled]);

  return { displayed, done };
}

export default function HUDMock() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  
  const query = "Show me this month's revenue breakdown";
  const { displayed: typedText, done: typingDone } = useTypingAnimation(query, 800, isInView);

  // Stagger card appearances after typing finishes
  const cardDelay = typingDone ? 0 : 99;
  const baseDelay = 0.3;

  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8 }}
        className="relative w-full max-w-5xl mx-auto"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b18] overflow-hidden shadow-2xl shadow-black/60">
          <div className="flex" style={{ minHeight: 520 }}>
            {/* ── Sidebar ── */}
            <div className="w-40 border-r border-white/[0.06] flex flex-col justify-between py-6 px-5 flex-shrink-0">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00d4aa]" />
                  <span className="text-xs font-bold tracking-wide text-white">WHUT OS</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { icon: "🔥", label: "HUD", active: true },
                    { icon: "📄", label: "Docs", active: false },
                    { icon: "🔗", label: "Integrations", active: false },
                  ].map(n => (
                    <div
                      key={n.label}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] ${
                        n.active ? "bg-[#00d4aa]/10 text-[#00d4aa] font-medium" : "text-white/40"
                      }`}
                    >
                      <span className="text-sm">{n.icon}</span>
                      {n.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] text-white/30 px-1">
                  <span>⚙</span> Settings
                </div>
                <div className="flex items-center gap-2.5 px-1">
                  <div className="w-7 h-7 rounded-full bg-[#00d4aa]/20 flex items-center justify-center">
                    <span className="text-[10px] text-[#00d4aa] font-medium">JD</span>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/70">John Doe</div>
                    <div className="text-[9px] text-white/30">Operator</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Main Canvas ── */}
            <div className="flex-1 flex flex-col p-6">
              {/* Card grid area */}
              <div className="flex-1 grid grid-cols-3 gap-4 auto-rows-min content-start">
                
                {/* Row 1: Total Revenue (spans 2) + Channel Breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={typingDone ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: baseDelay }}
                  className="col-span-2 rounded-xl bg-[#111125]/90 border border-white/[0.08] p-5 backdrop-blur-sm relative"
                >
                  <button className="absolute top-3 right-3 text-white/15 text-[10px] hover:text-white/30 transition">×</button>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-white/25 mb-2">Total Revenue</div>
                  <div className="text-3xl font-light text-white mb-1">$142,382</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]" />
                    <span className="text-[11px] text-[#00d4aa]">+12.4% vs last month</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={typingDone ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: baseDelay + 0.15 }}
                  className="rounded-xl bg-[#111125]/90 border border-white/[0.08] p-5 backdrop-blur-sm relative"
                >
                  <button className="absolute top-3 right-3 text-white/15 text-[10px] hover:text-white/30 transition">×</button>
                  <div className="space-y-3">
                    {[
                      { name: "Shopify", val: "$68K" },
                      { name: "Amazon", val: "$45K" },
                      { name: "TikTok", val: "$29K" },
                    ].map(ch => (
                      <div key={ch.name} className="flex justify-between items-center">
                        <span className="text-[12px] text-white/50">{ch.name}</span>
                        <span className="text-[13px] text-white font-medium">{ch.val}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Row 2: Chart (spans 2) + Top Product */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={typingDone ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ duration: 0.6, delay: baseDelay + 0.35 }}
                  className="col-span-2 rounded-xl bg-[#111125]/90 border border-white/[0.08] p-5 backdrop-blur-sm relative"
                >
                  <button className="absolute top-3 right-3 text-white/15 text-[10px] hover:text-white/30 transition z-10">×</button>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-white/25 mb-3">Revenue (Last 30 Days)</div>
                  <AreaChart visible={typingDone} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={typingDone ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: baseDelay + 0.5 }}
                  className="rounded-xl bg-[#111125]/90 border border-white/[0.08] p-5 backdrop-blur-sm relative flex flex-col justify-center"
                >
                  <button className="absolute top-3 right-3 text-white/15 text-[10px] hover:text-white/30 transition">×</button>
                  <div className="text-[10px] text-white/30 mb-1">Top product</div>
                  <div className="text-[15px] text-white font-medium mb-0.5">Glow Serum Kit</div>
                  <div className="text-white/50 text-[12px]">$18.4K this month</div>
                </motion.div>
              </div>

              {/* ── Input Bar ── */}
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/[0.04]">
                <div className="flex-1 flex items-center rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 min-h-[44px]">
                  {typedText ? (
                    <span className="text-[13px] text-white/70">{typedText}
                      {!typingDone && (
                        <motion.span
                          className="inline-block w-[2px] h-4 bg-[#00d4aa] ml-0.5 align-middle"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      )}
                    </span>
                  ) : (
                    <span className="text-[13px] text-white/20">Ask WHUT OS...</span>
                  )}
                </div>
                <button className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <span className="text-white/30 text-base">🎙</span>
                </button>
                <motion.button
                  className="px-5 py-3 rounded-xl text-[11px] uppercase tracking-[0.2em] font-semibold flex-shrink-0"
                  animate={typingDone
                    ? { backgroundColor: "rgba(0,212,170,0.25)", borderColor: "rgba(0,212,170,0.4)", color: "rgba(0,212,170,0.9)" }
                    : { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" }
                  }
                  style={{ border: "1px solid" }}
                  transition={{ duration: 0.3 }}
                >
                  Send
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Glow underneath */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[60%] h-40 bg-[#00d4aa]/[0.06] blur-[80px] pointer-events-none" />
      </motion.div>
    </div>
  );
}
