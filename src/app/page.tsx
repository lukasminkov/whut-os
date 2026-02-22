"use client";

import Link from "next/link";
import { motion, useScroll, animate } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  RevenueChart, MarginWaterfall, MessageQueue, TrendLine, KPIRow,
  ChannelDonut, ActivityHeatmap, InventoryStatus, CampaignPerformance,
} from "@/components/MockVisualizations";
import HUDMock from "@/components/HUDMock";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

const connectors = [
  "Shopify", "Amazon", "TikTok Shop", "Gmail", "Outlook",
  "Slack", "Discord", "WhatsApp", "Google Drive", "Notion",
  "Calendar", "Dropbox",
];

/* Animated counter */
function Counter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const triggered = useRef(false);

  return (
    <motion.span
      onViewportEnter={() => {
        if (triggered.current) return;
        triggered.current = true;
        animate(0, to, {
          duration: 1.5,
          ease: "easeOut",
          onUpdate: (v) => setVal(Math.round(v)),
        });
      }}
      viewport={{ once: true }}
    >
      {prefix}{val.toLocaleString()}{suffix}
    </motion.span>
  );
}

/* Pulsing voice waveform */
function VoiceWaveform() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full bg-[#00d4aa]"
          animate={{
            height: [4, 8 + Math.random() * 16, 4],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 0.6 + Math.random() * 0.6,
            repeat: Infinity,
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  return (
    <div className="landing-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 backdrop-blur-md bg-[#06060f]/60 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-white">WHUT</span>
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 mt-0.5">OS</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#interface" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition">Interface</a>
          <a href="#vision" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition">Vision</a>
          <Link
            href="/login"
            className="glass-button px-5 py-2 text-xs uppercase tracking-[0.25em]"
          >
            Request Access
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 overflow-hidden">
        <div className="starfield" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#00d4aa]/[0.04] blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-[#6366f1]/[0.06] blur-[100px] pointer-events-none" />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col items-center gap-6 text-center"
        >
          <motion.div variants={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d4aa] animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-white/60">Private Beta · 2026</span>
          </motion.div>

          <motion.h1
            variants={item}
            className="text-5xl font-light leading-[1.1] text-white sm:text-7xl lg:text-8xl"
          >
            See everything.
            <br />
            <span className="bg-gradient-to-r from-[#00d4aa] via-[#00d4aa] to-[#6366f1] bg-clip-text text-transparent">
              Touch nothing.
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="max-w-2xl text-base text-white/50 sm:text-lg leading-relaxed"
          >
            WHUT OS replaces every app, tab, and spreadsheet with a single intelligent surface. 
            Your data — visualized in real time. Your voice — the only input you need. 
            This isn&apos;t a chatbot. It&apos;s a new way to interact with technology.
          </motion.p>

          <motion.div variants={item} className="flex items-center gap-4 mt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:shadow-[0_0_40px_rgba(0,212,170,0.5)] hover:scale-[1.02]"
            >
              Request Access →
            </Link>
          </motion.div>

          <motion.div variants={item} className="mt-4">
            <VoiceWaveform />
            <p className="text-[10px] text-white/20 mt-2 uppercase tracking-widest">Voice-First Interface</p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── The Interface — Full Dashboard ── */}
      <section id="interface" className="relative z-10 px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">The Interface</p>
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-3">
            Information, alive.
          </h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm">
            Every data source you connect becomes a living visualization. 
            No dashboards to build. No reports to pull. It just renders — in real time.
          </p>
        </motion.div>

        <HUDMock />
      </section>

      {/* ── Voice → Visualization Flow ── */}
      <section className="relative z-10 px-6 py-32 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">Interaction Model</p>
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-3">
            Speak → See → Act
          </h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm">
            Voice is the input. Visualization is the output. Actions require your confirmation. 
            The screen reshapes itself in real time based on what you need.
          </p>
        </motion.div>

        <div className="mx-auto max-w-5xl space-y-32">
          {/* 1. The surface reshapes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-[2px] h-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-[2px] rounded-full bg-[#00d4aa]"
                      animate={{ height: [3, 6 + Math.random() * 10, 3] }}
                      transition={{ duration: 0.5 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.06 }}
                    />
                  ))}
                </div>
                <span className="text-white/40 text-sm italic">&ldquo;How did we do yesterday?&rdquo;</span>
              </div>
              <h3 className="text-2xl font-light text-white">
                The surface reshapes instantly
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                No loading screens. No query builders. The visualization engine determines the best way 
                to show your answer — bar charts, trend lines, comparisons — and renders it 
                in real time. The right chart for the right data, every time.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-6 space-y-4"
            >
              <RevenueChart />
              <div className="border-t border-white/[0.06] pt-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs uppercase tracking-widest text-white/30">Trend</span>
                  <span className="text-[10px] text-[#00d4aa]">↑ 23% vs prior period</span>
                </div>
                <TrendLine delay={0.5} />
              </div>
            </motion.div>
          </div>

          {/* 2. Go deeper */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-6 md:order-1 space-y-4"
            >
              <MarginWaterfall />
              <div className="border-t border-white/[0.06] pt-3">
                <InventoryStatus />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="space-y-5 md:order-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-[2px] h-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-[2px] rounded-full bg-[#00d4aa]"
                      animate={{ height: [3, 6 + Math.random() * 10, 3] }}
                      transition={{ duration: 0.5 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.06 }}
                    />
                  ))}
                </div>
                <span className="text-white/40 text-sm italic">&ldquo;Break down my margins.&rdquo;</span>
              </div>
              <h3 className="text-2xl font-light text-white">
                Drill into any dimension
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Each follow-up reshapes the canvas. COGS, shipping, ad spend, commissions — 
                all computed from live data across every connected source. 
                The visualization adapts: waterfall for margins, heatmaps for patterns, 
                alerts for anomalies. It shows you what matters before you know to ask.
              </p>
            </motion.div>
          </div>

          {/* 3. Execute with confidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-[2px] h-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-[2px] rounded-full bg-[#00d4aa]"
                      animate={{ height: [3, 6 + Math.random() * 10, 3] }}
                      transition={{ duration: 0.5 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.06 }}
                    />
                  ))}
                </div>
                <span className="text-white/40 text-sm italic">&ldquo;Pause the retargeting campaign.&rdquo;</span>
              </div>
              <h3 className="text-2xl font-light text-white">
                Act with full context
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                The OS doesn&apos;t just show — it acts. But every action goes through a strict pipeline: 
                preview the change, show you the impact, wait for your explicit confirmation. 
                Nothing happens without your say. Full audit trail, fully reversible.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-6 space-y-3"
            >
              <CampaignPerformance />
              <div className="border-t border-white/[0.06] pt-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                  <span className="text-xs text-white/50">Pending Confirmation</span>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4">
                  <div className="text-[11px] text-white/60 mb-2">Pause &ldquo;Retargeting&rdquo; campaign?</div>
                  <div className="text-[10px] text-white/30 mb-3">
                    Current ROAS: 3.1x · Daily spend: $157 · This will stop all ad delivery immediately.
                  </div>
                  <div className="flex gap-2">
                    <div className="px-4 py-2 rounded-lg bg-[#00d4aa]/20 border border-[#00d4aa]/30 text-[11px] text-[#00d4aa]">
                      ✓ Confirm
                    </div>
                    <div className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/40">
                      Cancel
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── The Thesis ── */}
      <section id="vision" className="relative z-10 px-6 py-32 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-6">The Thesis</p>
          <h2 className="text-2xl font-light text-white sm:text-4xl leading-snug mb-8">
            Humans developed speech over 50,000 years. 
            We developed rich visual perception over millions. 
            <span className="text-white/40"> Yet we still interact with technology through 
            keyboards, mice, and static screens.</span>
          </h2>
          <p className="text-white/50 text-base leading-relaxed max-w-2xl mx-auto mb-6">
            Current software forces unnatural interaction models. People juggle 8–12 disconnected platforms, 
            context-switching constantly, reconciling data manually, clicking through endless menus. 
            The result: time spent on <span className="text-white">administration</span> instead of <span className="text-white">thinking</span>.
          </p>
          <p className="text-white/60 text-base leading-relaxed max-w-2xl mx-auto">
            WHUT OS eliminates this entirely. One surface. Voice in, visualization out. 
            Intent-driven, conversational control — augmented by adaptive, real-time 
            information design that shows you exactly what you need, exactly when you need it.
          </p>
        </motion.div>
      </section>

      {/* ── Connectors ── */}
      <section className="relative z-10 px-6 py-24 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">Data Layer</p>
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-4">
            Every source. One surface.
          </h2>
          <p className="text-white/40 mb-12 max-w-lg mx-auto text-sm">
            Live webhooks. Intelligent polling. Rate-limit handling. Schema evolution.
            All data normalized into a unified model — visualized the moment it arrives.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {connectors.map((name, idx) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="glass-card px-5 py-3 text-sm text-white/60 hover:text-white hover:border-white/15 transition-all"
              >
                {name}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-6 py-32 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-4">
            Not a better app.
            <br />
            <span className="bg-gradient-to-r from-[#00d4aa] to-[#6366f1] bg-clip-text text-transparent">
              A better paradigm.
            </span>
          </h2>
          <p className="text-white/40 mb-10 max-w-lg mx-auto text-sm">
            The defining interface of the next decade. 
            Voice in. Visualization out. No typing. No tabs. No friction.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:shadow-[0_0_40px_rgba(0,212,170,0.5)] hover:scale-[1.02]"
          >
            Request Access →
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] px-6 py-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">WHUT</span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/30">OS</span>
          </div>
          <p className="text-xs text-white/30">© 2026 WHUT.AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
