"use client";

import { motion } from "framer-motion";

/* Stacked area chart SVG */
function AreaChart() {
  // 30 data points for 3 channels
  const shopify = [65,70,68,72,80,85,78,82,90,88,92,95,87,83,89,94,100,105,98,102,108,112,105,110,115,108,112,118,120,115];
  const amazon =  [40,42,38,45,48,50,46,44,52,55,50,48,53,56,52,49,55,58,54,56,60,62,58,55,60,63,58,62,65,60];
  const tiktok =  [20,22,25,28,30,32,28,26,30,35,32,30,34,38,35,32,36,40,38,35,38,42,40,38,42,45,42,40,44,42];

  const w = 520;
  const h = 200;
  const max = 130;
  const pts = 30;

  const toPath = (data: number[], baseline: number[] | null) => {
    const forward = data.map((v, i) => {
      const x = (i / (pts - 1)) * w;
      const y = h - ((v + (baseline ? baseline[i] : 0)) / max) * h;
      return `${x},${y}`;
    });
    const back = baseline
      ? baseline.map((v, i) => {
          const x = ((pts - 1 - i) / (pts - 1)) * w;
          const y = h - (v / max) * h;
          return `${x},${y}`;
        })
      : [`${w},${h}`, `0,${h}`];
    return `M ${forward.join(" L ")} L ${back.join(" L ")} Z`;
  };

  const linePath = (data: number[], baseline: number[] | null) => {
    return data.map((v, i) => {
      const x = (i / (pts - 1)) * w;
      const y = h - ((v + (baseline ? baseline[i] : 0)) / max) * h;
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    }).join(" ");
  };

  // Y-axis labels
  const yLabels = [0, 3000, 6000, 9000, 12000];

  return (
    <div className="relative">
      {/* Y axis */}
      <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between items-end pr-2">
        {yLabels.reverse().map(v => (
          <span key={v} className="text-[8px] text-white/20">{v.toLocaleString()}</span>
        ))}
      </div>
      <div className="pl-10">
        <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map(pct => (
            <line key={pct} x1="0" y1={h * pct} x2={w} y2={h * pct} stroke="white" strokeOpacity="0.04" />
          ))}

          {/* Glow effect */}
          <defs>
            <linearGradient id="shopifyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="amazonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="tiktokGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.02" />
            </linearGradient>
            <radialGradient id="chartGlow" cx="0.5" cy="0.3" r="0.6">
              <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width={w} height={h} fill="url(#chartGlow)" />

          {/* Stacked areas: tiktok (bottom), amazon (middle), shopify (top) */}
          <motion.path
            d={toPath(tiktok, null)}
            fill="url(#tiktokGrad)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 1 }}
          />
          <motion.path
            d={toPath(amazon, tiktok)}
            fill="url(#amazonGrad)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 1 }}
          />
          <motion.path
            d={toPath(shopify, amazon.map((v, i) => v + tiktok[i]))}
            fill="url(#shopifyGrad)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 1 }}
          />

          {/* Lines on top */}
          <motion.path
            d={linePath(tiktok, null)}
            fill="none" stroke="#00d4aa" strokeWidth="1.5" strokeOpacity="0.5"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 1.5 }}
          />
          <motion.path
            d={linePath(amazon, tiktok)}
            fill="none" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 1.5 }}
          />
          <motion.path
            d={linePath(shopify, amazon.map((v, i) => v + tiktok[i]))}
            fill="none" stroke="#00d4aa" strokeWidth="1.5" strokeOpacity="0.8"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 1.5 }}
          />

          {/* X axis labels */}
          {[1, 5, 10, 15, 20, 25, 30].map(d => (
            <text key={d} x={(d - 1) / 29 * w} y={h + 14} fill="white" fillOpacity="0.2" fontSize="7" textAnchor="middle">
              {d}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function HUDMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative w-full max-w-5xl mx-auto"
    >
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b18] overflow-hidden shadow-2xl shadow-black/60">
        {/* Layout: sidebar + canvas */}
        <div className="flex min-h-[480px]">
          {/* Sidebar */}
          <div className="w-36 border-r border-white/[0.06] flex flex-col justify-between py-5 px-4 flex-shrink-0">
            <div className="space-y-5">
              {/* Logo */}
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#00d4aa]" />
                <span className="text-[11px] font-bold tracking-wide text-white">WHUT OS</span>
              </div>
              {/* Nav items */}
              <div className="space-y-1">
                {[
                  { icon: "🔥", label: "HUD", active: true },
                  { icon: "📄", label: "Docs", active: false },
                  { icon: "🔗", label: "Integrations", active: false },
                ].map(n => (
                  <div
                    key={n.label}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${
                      n.active
                        ? "bg-[#00d4aa]/10 text-[#00d4aa]"
                        : "text-white/40"
                    }`}
                  >
                    <span className="text-xs">{n.icon}</span>
                    {n.label}
                  </div>
                ))}
              </div>
            </div>
            {/* Bottom: settings + user */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-white/30">
                <span>⚙</span> Settings
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00d4aa]/20 flex items-center justify-center">
                  <span className="text-[9px] text-[#00d4aa]">JD</span>
                </div>
                <div>
                  <div className="text-[10px] text-white/70">John Doe</div>
                  <div className="text-[8px] text-white/30">Operator</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Canvas */}
          <div className="flex-1 relative p-5 flex flex-col">
            {/* Floating cards on spatial canvas */}
            <div className="flex-1 relative">
              {/* Total Revenue Card */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="absolute top-0 left-0 w-48 rounded-xl bg-[#111125]/90 border border-white/[0.08] p-4 backdrop-blur-sm shadow-lg"
              >
                <button className="absolute top-2 right-2 text-white/20 text-[10px] hover:text-white/40">×</button>
                <div className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Total Revenue</div>
                <div className="text-2xl font-light text-white">$142,382</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]" />
                  <span className="text-[10px] text-[#00d4aa]">+12.4% vs last month</span>
                </div>
              </motion.div>

              {/* Channel Breakdown Card */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.55, duration: 0.6 }}
                className="absolute top-0 right-0 w-40 rounded-xl bg-[#111125]/90 border border-white/[0.08] p-4 backdrop-blur-sm shadow-lg"
              >
                <button className="absolute top-2 right-2 text-white/20 text-[10px] hover:text-white/40">×</button>
                <div className="space-y-2">
                  {[
                    { name: "Shopify", val: "$68K" },
                    { name: "Amazon", val: "$45K" },
                    { name: "TikTok", val: "$29K" },
                  ].map(ch => (
                    <div key={ch.name} className="flex justify-between items-center">
                      <span className="text-[11px] text-white/50">{ch.name}</span>
                      <span className="text-[11px] text-white font-medium">{ch.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Revenue Chart Card — center, larger */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="absolute top-20 left-0 right-16 rounded-xl bg-[#111125]/90 border border-white/[0.08] p-4 backdrop-blur-sm shadow-lg"
              >
                <button className="absolute top-2 right-2 text-white/20 text-[10px] hover:text-white/40">×</button>
                <div className="text-[9px] uppercase tracking-[0.3em] text-white/30 mb-3">Revenue (Last 30 Days)</div>
                <AreaChart />
              </motion.div>

              {/* Top Product Card — bottom right */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="absolute bottom-0 right-0 w-52 rounded-xl bg-[#111125]/90 border border-white/[0.08] p-4 backdrop-blur-sm shadow-lg"
              >
                <button className="absolute top-2 right-2 text-white/20 text-[10px] hover:text-white/40">×</button>
                <div className="text-[9px] text-white/30 mb-1">Top product</div>
                <div className="text-sm text-white font-medium">Glow Serum Kit</div>
                <div className="text-white/50 text-[11px]">$18.4K this month</div>
              </motion.div>
            </div>

            {/* Input Bar — bottom */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex items-center gap-2 mt-4"
            >
              <div className="flex-1 flex items-center rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5">
                <span className="text-[12px] text-white/25">Ask WHUT OS...</span>
              </div>
              <button className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <span className="text-white/30 text-sm">🎙</span>
              </button>
              <button className="px-4 py-2.5 rounded-xl bg-[#00d4aa]/20 border border-[#00d4aa]/30 text-[10px] uppercase tracking-[0.2em] text-[#00d4aa]/80 font-semibold">
                Send
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Glow underneath */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[60%] h-40 bg-[#00d4aa]/[0.06] blur-[80px] pointer-events-none" />
    </motion.div>
  );
}
