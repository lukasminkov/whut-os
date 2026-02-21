"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import AIOrb from "@/components/AIOrb";
import { DashboardPreview, RevenueChart, MarginWaterfall, MessageQueue, TrendLine, KPIRow } from "@/components/MockVisualizations";

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
  "Calendar", "Dropbox"
];

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 0.5]);
  const orbOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="landing-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 backdrop-blur-md bg-[#06060f]/60 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-white">WHUT</span>
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 mt-0.5">OS</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#product" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition">Product</a>
          <a href="#how" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition">How It Works</a>
          <Link
            href="/login"
            className="glass-button px-5 py-2 text-xs uppercase tracking-[0.25em]"
          >
            Access System
          </Link>
        </div>
      </nav>

      {/* Hero */}
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
            Stop typing.
            <br />
            <span className="bg-gradient-to-r from-[#00d4aa] via-[#00d4aa] to-[#6366f1] bg-clip-text text-transparent">
              Start talking.
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="max-w-2xl text-base text-white/50 sm:text-lg leading-relaxed"
          >
            One voice-first command center that replaces every tab, spreadsheet, 
            and dashboard. Ask anything. See everything. Act instantly.
          </motion.p>

          <motion.div variants={item} className="flex items-center gap-4 mt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:shadow-[0_0_40px_rgba(0,212,170,0.5)] hover:scale-[1.02]"
            >
              Request Access →
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
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

      {/* Product — The Dashboard */}
      <section id="product" className="relative z-10 px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">The Product</p>
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-4">
            Everything. One screen.
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            Real-time data from every source — auto-visualized, prioritized, and actionable. 
            No configuration. No manual refresh. It just knows.
          </p>
        </motion.div>

        <DashboardPreview />
      </section>

      {/* How it works — Voice-driven with live visualizations */}
      <section id="how" className="relative z-10 px-6 py-32 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">How It Works</p>
          <h2 className="text-3xl font-light text-white sm:text-5xl">
            You speak. It responds.
          </h2>
        </motion.div>

        <div className="mx-auto max-w-5xl space-y-24">
          {/* Step 1: Morning briefing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20">
                <div className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" />
                <span className="text-[11px] text-[#00d4aa]/80">Proactive Briefing</span>
              </div>
              <h3 className="text-2xl font-light text-white">
                &ldquo;Good morning. Here&apos;s what matters.&rdquo;
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                WHUT OS wakes up before you do. It scans your email, Slack, 
                analytics, and calendar — then delivers a prioritized briefing. 
                No opening apps. No catching up.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-6 space-y-4"
            >
              <MessageQueue />
              <div className="pt-2 border-t border-white/[0.06]">
                <KPIRow />
              </div>
            </motion.div>
          </div>

          {/* Step 2: Ask about revenue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-6 space-y-4 md:order-1"
            >
              <RevenueChart />
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs uppercase tracking-widest text-white/30">7-Day Trend</span>
                  <span className="text-[10px] text-[#00d4aa]">↑ 23% vs prior week</span>
                </div>
                <TrendLine />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="space-y-4 md:order-0"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-[11px] text-white/50">🎙 Voice Command</span>
              </div>
              <h3 className="text-2xl font-light text-white italic">
                &ldquo;How did we do yesterday?&rdquo;
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Instantly pulls live data across every connected channel. 
                Auto-selects the right visualization based on data shape and context. 
                Revenue by platform, trend lines, anomaly detection — all in under a second.
              </p>
            </motion.div>
          </div>

          {/* Step 3: Profit breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-[11px] text-white/50">🎙 Voice Command</span>
              </div>
              <h3 className="text-2xl font-light text-white italic">
                &ldquo;What&apos;s my actual profit?&rdquo;
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Aggregates COGS, shipping, ad spend, platform commissions. 
                Renders a margin waterfall. Flags cost anomalies automatically. 
                No spreadsheet. No manual reconciliation.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-6"
            >
              <MarginWaterfall />
            </motion.div>
          </div>

          {/* Step 4: Take action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-6 space-y-3 md:order-1"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <span className="text-xs text-white/50">Draft — Awaiting Confirmation</span>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
                <div className="text-[11px] text-white/30">To: chen@associates.law</div>
                <div className="text-[11px] text-white/30">Re: Trademark Filing — Class 9</div>
                <div className="text-[12px] text-white/50 leading-relaxed">
                  Dear Mr. Chen,<br /><br />
                  Thank you for the update on the Class 9 filing. We&apos;d like to proceed 
                  with the international extension as discussed. Please prepare the Madrid 
                  Protocol application at your earliest convenience...
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <motion.div
                  className="px-4 py-2 rounded-lg bg-[#00d4aa]/20 border border-[#00d4aa]/30 text-[11px] text-[#00d4aa] cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  ✓ Confirm & Send
                </motion.div>
                <div className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/40">
                  Edit Draft
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="space-y-4 md:order-0"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                <span className="text-[11px] text-white/50">🎙 Voice Command</span>
              </div>
              <h3 className="text-2xl font-light text-white italic">
                &ldquo;Reply to the lawyer about the trademark.&rdquo;
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Reads the full email thread. Understands context. Drafts a response. 
                Shows you a preview. Nothing sends until you explicitly confirm. 
                Every action is auditable, reversible, human-in-the-loop.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Thesis */}
      <section className="relative z-10 px-6 py-32 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-6">The Thesis</p>
          <h2 className="text-2xl font-light text-white sm:text-4xl leading-snug mb-8">
            Humans developed complex speech over 50,000 years — yet we still control 
            everything through <span className="text-white/40">keyboards, mice, and fragmented UIs</span>.
          </h2>
          <p className="text-white/50 text-base leading-relaxed max-w-2xl mx-auto">
            The result is that people spend disproportionate time on administration 
            rather than strategy and growth. WHUT OS eliminates this friction entirely — 
            shifting from GUI-driven manual control to intent-driven, conversational control 
            augmented by intelligent visualization.
          </p>
        </motion.div>
      </section>

      {/* Connectors */}
      <section className="relative z-10 px-6 py-24 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">Connectors</p>
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-4">
            Plugs into everything.
          </h2>
          <p className="text-white/40 mb-12 max-w-lg mx-auto text-sm">
            Live webhooks. Intelligent polling. Rate-limit handling. Schema evolution tolerance. 
            One unified data model across all sources.
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

      {/* CTA */}
      <section className="relative z-10 px-6 py-32 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-4">
            The defining interface of
            <br />
            <span className="bg-gradient-to-r from-[#00d4aa] to-[#6366f1] bg-clip-text text-transparent">
              the next decade.
            </span>
          </h2>
          <p className="text-white/40 mb-10 max-w-lg mx-auto text-sm">
            No typing required. No spreadsheets. No tab explosion. 
            Just speak — and everything responds.
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
