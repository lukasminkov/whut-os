"use client";

import { motion } from "framer-motion";

// Animated bar chart component
export function RevenueChart() {
  const channels = [
    { name: "TikTok Shop", value: 42, color: "#00d4aa" },
    { name: "Shopify", value: 28, color: "#6366f1" },
    { name: "Amazon", value: 18, color: "#f59e0b" },
    { name: "Direct", value: 12, color: "#ec4899" },
  ];

  return (
    <div className="w-full space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-widest text-white/30">Revenue by Channel</span>
        <span className="text-lg font-light text-white">$47,832</span>
      </div>
      <div className="space-y-2">
        {channels.map((ch, i) => (
          <div key={ch.name} className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-white/50">{ch.name}</span>
              <span className="text-white/70">{ch.value}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${ch.value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: ch.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Animated line chart (sparkline style)
export function TrendLine({ color = "#00d4aa", delay = 0 }: { color?: string; delay?: number }) {
  const points = [20, 35, 28, 45, 40, 58, 52, 65, 60, 72, 68, 78];
  const max = Math.max(...points);
  const h = 60;
  const w = 200;
  const pathData = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p / max) * h;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <motion.svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-auto"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={pathData + ` L ${w} ${h} L 0 ${h} Z`}
        fill={`url(#grad-${color.replace("#", "")})`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: delay + 0.3, duration: 0.8 }}
      />
      <motion.path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 1.5, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

// Margin waterfall chart
export function MarginWaterfall() {
  const items = [
    { label: "Revenue", value: 47832, height: 100, color: "#00d4aa", y: 0 },
    { label: "COGS", value: -14350, height: 30, color: "#ef4444", y: 0 },
    { label: "Shipping", value: -4783, height: 10, color: "#ef4444", y: 30 },
    { label: "Ad Spend", value: -9566, height: 20, color: "#ef4444", y: 40 },
    { label: "Commission", value: -2392, height: 5, color: "#f59e0b", y: 60 },
    { label: "Net Profit", value: 16741, height: 35, color: "#00d4aa", y: 65 },
  ];

  return (
    <div className="w-full space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-widest text-white/30">Margin Breakdown</span>
        <span className="text-lg font-light text-[#00d4aa]">35% margin</span>
      </div>
      <div className="flex items-end gap-2 h-28">
        {items.map((item, i) => (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              className="w-full rounded-sm"
              style={{ backgroundColor: item.color }}
              initial={{ height: 0 }}
              whileInView={{ height: `${item.height}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease: "easeOut" }}
            />
            <span className="text-[9px] text-white/40 whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Message priority queue
export function MessageQueue() {
  const messages = [
    { from: "Lawyer — Chen & Associates", subject: "RE: Trademark filing", priority: "high", time: "9:12 AM" },
    { from: "Sarah (Slack)", subject: "Q1 creator contracts ready", priority: "medium", time: "8:45 AM" },
    { from: "TikTok Shop", subject: "New policy update", priority: "low", time: "7:30 AM" },
  ];

  const priorityColor = { high: "#ef4444", medium: "#f59e0b", low: "#00d4aa" };

  return (
    <div className="w-full space-y-3">
      <span className="text-xs uppercase tracking-widest text-white/30">Priority Inbox</span>
      <div className="space-y-2">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2"
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: priorityColor[msg.priority as keyof typeof priorityColor] }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-white/70 truncate">{msg.from}</div>
              <div className="text-[10px] text-white/40 truncate">{msg.subject}</div>
            </div>
            <span className="text-[9px] text-white/30 flex-shrink-0">{msg.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// KPI ticker
export function KPIRow() {
  const kpis = [
    { label: "Orders", value: "312", change: "+18%", up: true },
    { label: "AOV", value: "$153", change: "+4.2%", up: true },
    { label: "Returns", value: "2.1%", change: "-0.3%", up: true },
    { label: "ROAS", value: "4.7x", change: "+0.8x", up: true },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="text-center"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/30">{kpi.label}</div>
          <div className="text-lg font-light text-white">{kpi.value}</div>
          <div className={`text-[10px] ${kpi.up ? "text-[#00d4aa]" : "text-red-400"}`}>{kpi.change}</div>
        </motion.div>
      ))}
    </div>
  );
}

// Full dashboard mock
export function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full max-w-4xl mx-auto"
    >
      {/* Browser chrome */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a1a]/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/10" />
            <div className="w-3 h-3 rounded-full bg-white/10" />
            <div className="w-3 h-3 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-white/[0.04] text-[10px] text-white/30">whut.ai/dashboard</div>
          </div>
        </div>
        
        {/* Dashboard content */}
        <div className="p-6 space-y-6">
          {/* Greeting + voice indicator */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/40 text-sm">Good morning, Luke</div>
              <div className="text-white text-xl font-light">Tuesday, February 22</div>
            </div>
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-2 h-2 rounded-full bg-[#00d4aa]" />
              <span className="text-[11px] text-[#00d4aa]/80">Listening...</span>
            </motion.div>
          </div>

          {/* KPIs */}
          <KPIRow />

          {/* Two column layout */}
          <div className="grid grid-cols-5 gap-6">
            <div className="col-span-3 space-y-6">
              <RevenueChart />
              <div className="pt-2">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs uppercase tracking-widest text-white/30">7-Day Trend</span>
                  <span className="text-[10px] text-[#00d4aa]">↑ 23% vs prior week</span>
                </div>
                <TrendLine />
              </div>
            </div>
            <div className="col-span-2 space-y-6">
              <MarginWaterfall />
              <MessageQueue />
            </div>
          </div>
        </div>
      </div>

      {/* Glow underneath */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[60%] h-40 bg-[#00d4aa]/[0.06] blur-[80px] pointer-events-none" />
    </motion.div>
  );
}
