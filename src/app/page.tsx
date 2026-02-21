"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import AIOrb from "@/components/AIOrb";

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

const capabilities = [
  {
    icon: "🎙",
    title: "Voice-First",
    description: "Speak naturally. WHUT OS understands intent, pulls data, visualizes answers, and takes action — all from your voice. Typing is the fallback, not the default.",
  },
  {
    icon: "📊",
    title: "Adaptive Intelligence",
    description: "Real-time data from every source, auto-visualized. Revenue waterfalls, margin breakdowns, campaign performance — surfaced when relevant, not when you go looking.",
  },
  {
    icon: "⚡",
    title: "Reason & Act",
    description: "Not a dashboard. A reasoning engine. It analyzes data, proposes optimizations, drafts actions — then waits for your confirmation before executing.",
  },
  {
    icon: "🔒",
    title: "Human-in-the-Loop",
    description: "Every action follows a strict pipeline: draft → preview → explicit confirm → execute. Nothing happens without your say-so. Full audit trail.",
  },
];

const connectors = [
  "Shopify", "Amazon", "TikTok Shop", "Gmail", "Slack", 
  "Discord", "WhatsApp", "Google Drive", "Notion", "Calendar"
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
          <a href="#thesis" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition">Thesis</a>
          <a href="#capabilities" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition">Capabilities</a>
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
          className="relative z-10 flex flex-col items-center gap-8 text-center"
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
            Humans developed complex speech over 50,000 years — yet we still control 
            everything through keyboards, mice, and fragmented UIs across a dozen disconnected apps. 
            WHUT OS replaces all of it with one voice-first, AI-powered command center.
          </motion.p>

          <motion.div variants={item} className="flex items-center gap-4 mt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:shadow-[0_0_40px_rgba(0,212,170,0.5)] hover:scale-[1.02]"
            >
              Access System →
            </Link>
            <a
              href="#thesis"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-white/70 transition hover:border-white/20 hover:text-white"
            >
              Read the Thesis
            </a>
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <motion.div style={{ scale: orbScale, opacity: orbOpacity }}>
              <AIOrb state="idle" size={280} />
            </motion.div>
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

      {/* Thesis */}
      <section id="thesis" className="relative z-10 px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl"
        >
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">The Problem</p>
            <h2 className="text-3xl font-light text-white sm:text-5xl leading-tight">
              Software was built for machines.<br />
              <span className="text-white/40">We&apos;re building it for humans.</span>
            </h2>
          </div>

          <div className="space-y-6 text-white/50 text-base sm:text-lg leading-relaxed">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Today, running anything — a business, a project, your life — means juggling 
              8 to 12 disconnected platforms. Context switching. Manual reconciliation. 
              Copy-pasting between tabs. It&apos;s not just inefficient. It&apos;s <span className="text-white">unnatural</span>.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              The result? People spend their time on <span className="text-white">administration</span> instead 
              of <span className="text-white">thinking</span>. On clicking instead of creating. On finding 
              data instead of using it.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-white/70"
            >
              WHUT OS eliminates this friction entirely. One intelligent interface. 
              Voice-first. Real-time. It connects to everything you use, understands 
              what you need, and acts on your behalf — with your explicit permission 
              at every step.
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* How it works — conversational flow */}
      <section className="relative z-10 px-6 py-32 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl"
        >
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">How It Feels</p>
            <h2 className="text-3xl font-light text-white sm:text-5xl">
              A conversation, not a dashboard.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              { role: "system", text: "Good morning. 7 new emails, 3 Slack messages from clients, 2 returns pending review." },
              { role: "user", text: "\"How did we do yesterday?\"" },
              { role: "system", text: "Pulls live data across all channels. Renders revenue breakdown by platform. Highlights anomalies." },
              { role: "user", text: "\"What's my actual profit after everything?\"" },
              { role: "system", text: "Aggregates COGS, shipping, ad spend, commissions. Visualizes margin waterfall. Flags a 12% shipping cost increase." },
              { role: "user", text: "\"Draft a reply to the lawyer about the trademark issue.\"" },
              { role: "system", text: "Reads email thread. Drafts response. Presents preview. Waits for your explicit confirmation before sending." },
            ].map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-md rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa]/90 italic" 
                    : "bg-white/[0.04] border border-white/[0.06] text-white/60"
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="text-center text-white/30 text-sm mt-8"
          >
            No typing required. No spreadsheets. No tab explosion.
          </motion.p>
        </motion.div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="relative z-10 px-6 py-32 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-6xl"
        >
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">Capabilities</p>
            <h2 className="text-3xl font-light text-white sm:text-5xl">
              Not incremental improvement.<br />
              <span className="text-white/40">A different architecture entirely.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {capabilities.map((cap, idx) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="group glass-card p-8 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06]"
              >
                <span className="text-2xl">{cap.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">{cap.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{cap.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Connectors */}
      <section className="relative z-10 px-6 py-32 border-t border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">Connectors</p>
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-6">
            Plugs into your world.
          </h2>
          <p className="text-white/40 mb-16 max-w-lg mx-auto">
            Live connectors with webhooks where available, intelligent polling fallback, 
            rate-limit handling, and schema evolution tolerance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {connectors.map((name, idx) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
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
          <p className="text-white/40 mb-10 max-w-lg mx-auto">
            We&apos;re re-architecting the primary interface between people and their work — 
            from manual control to intent-driven, conversational control.
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
