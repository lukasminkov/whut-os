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

// Animated line chart
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
    { label: "Revenue", value: 100, color: "#00d4aa" },
    { label: "COGS", value: 30, color: "#ef4444" },
    { label: "Shipping", value: 10, color: "#ef4444" },
    { label: "Ad Spend", value: 20, color: "#ef4444" },
    { label: "Fees", value: 5, color: "#f59e0b" },
    { label: "Profit", value: 35, color: "#00d4aa" },
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
              whileInView={{ height: `${item.value}%` }}
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

// Donut/ring chart for channel split
export function ChannelDonut() {
  const segments = [
    { pct: 42, color: "#00d4aa", label: "TikTok" },
    { pct: 28, color: "#6366f1", label: "Shopify" },
    { pct: 18, color: "#f59e0b", label: "Amazon" },
    { pct: 12, color: "#ec4899", label: "Direct" },
  ];
  const r = 40;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        {segments.map((seg, i) => {
          const dashLen = (seg.pct / 100) * circ;
          const dashOff = -offset;
          offset += dashLen;
          return (
            <motion.circle
              key={seg.label}
              cx="50" cy="50" r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="8"
              strokeDasharray={`${dashLen} ${circ - dashLen}`}
              strokeDashoffset={dashOff}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
            />
          );
        })}
      </svg>
      <div className="space-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[10px] text-white/50">{seg.label}</span>
            <span className="text-[10px] text-white/70">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Heatmap (days x hours)
export function ActivityHeatmap() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = [
    [2,4,6,8,9,7,5,3,4,6,8,5],
    [3,5,7,9,10,8,6,4,5,7,9,6],
    [1,3,5,7,8,6,4,2,3,5,7,4],
    [4,6,8,10,10,9,7,5,6,8,10,7],
    [2,4,6,8,9,7,5,3,4,6,8,5],
    [1,2,3,4,5,4,3,2,1,2,3,2],
    [1,1,2,3,3,2,2,1,1,1,2,1],
  ];

  return (
    <div className="space-y-2">
      <span className="text-xs uppercase tracking-widest text-white/30">Order Activity</span>
      <div className="space-y-1">
        {days.map((day, di) => (
          <div key={day} className="flex items-center gap-1">
            <span className="text-[9px] text-white/30 w-6">{day}</span>
            <div className="flex gap-0.5">
              {data[di].map((val, hi) => (
                <motion.div
                  key={hi}
                  className="w-3 h-3 rounded-[2px]"
                  style={{ backgroundColor: `rgba(0, 212, 170, ${val / 10})` }}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.02 * (di * 12 + hi), duration: 0.2 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Real-time number counter
export function LiveCounter({ value, prefix = "", suffix = "", label, color = "white" }: {
  value: number; prefix?: string; suffix?: string; label: string; color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">{label}</div>
      <motion.div
        className="text-2xl font-light"
        style={{ color }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {prefix}{value.toLocaleString()}{suffix}
      </motion.div>
    </motion.div>
  );
}

// Inventory status bars
export function InventoryStatus() {
  const products = [
    { name: "Glow Serum 30ml", stock: 847, capacity: 1000, velocity: "+32/day" },
    { name: "Vitamin C Drops", stock: 234, capacity: 1000, velocity: "+18/day" },
    { name: "Night Cream 50ml", stock: 92, capacity: 1000, velocity: "+45/day", alert: true },
  ];

  return (
    <div className="space-y-3">
      <span className="text-xs uppercase tracking-widest text-white/30">Inventory</span>
      {products.map((p, i) => (
        <motion.div
          key={p.name}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.12 }}
          className="space-y-1"
        >
          <div className="flex justify-between items-baseline">
            <span className={`text-[11px] ${p.alert ? "text-[#ef4444]" : "text-white/60"}`}>
              {p.name} {p.alert && "⚠"}
            </span>
            <span className="text-[10px] text-white/30">{p.velocity}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor: p.alert ? "#ef4444" : p.stock / p.capacity > 0.5 ? "#00d4aa" : "#f59e0b",
              }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(p.stock / p.capacity) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.12 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Campaign performance radar-ish display
export function CampaignPerformance() {
  const campaigns = [
    { name: "Summer Launch", roas: 4.7, spend: "$2.4K", revenue: "$11.3K", status: "live" },
    { name: "Creator Push", roas: 6.2, spend: "$890", revenue: "$5.5K", status: "live" },
    { name: "Retargeting", roas: 3.1, spend: "$1.1K", revenue: "$3.4K", status: "paused" },
  ];

  return (
    <div className="space-y-3">
      <span className="text-xs uppercase tracking-widest text-white/30">Campaigns</span>
      {campaigns.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5"
        >
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.status === "live" ? "bg-[#00d4aa] animate-pulse" : "bg-white/20"}`} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-white/70">{c.name}</div>
            <div className="text-[10px] text-white/40">{c.spend} → {c.revenue}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-light text-[#00d4aa]">{c.roas}x</div>
            <div className="text-[9px] text-white/30">ROAS</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
