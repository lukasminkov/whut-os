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
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.4, 0.25, 1] } },
};

const features = [
  {
    icon: "⚡",
    title: "AI Intelligence Layer",
    description: "Every interaction is powered by frontier AI models. Ask anything. Get answers instantly.",
  },
  {
    icon: "🔗",
    title: "Unified Integrations",
    description: "TikTok Shop, Email, Notion, Calendars, Shopify — all connected in one neural interface.",
  },
  {
    icon: "📊",
    title: "Real-Time Analytics",
    description: "Live P&L, revenue tracking, creator performance, and campaign ROI across every channel.",
  },
  {
    icon: "🧠",
    title: "Autonomous Operations",
    description: "The OS that thinks ahead. Automated workflows, smart alerts, and predictive insights.",
  },
];

const logos = ["TikTok Shop", "Shopify", "Amazon", "Notion", "Gmail", "Google Calendar"];

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
          <a href="#features" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition">Features</a>
          <a href="#integrations" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition">Integrations</a>
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
        
        {/* Glow effects */}
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
            <span className="text-[11px] uppercase tracking-[0.3em] text-white/60">Now in Private Beta</span>
          </motion.div>

          <motion.h1
            variants={item}
            className="text-5xl font-light leading-[1.1] text-white sm:text-7xl lg:text-8xl"
          >
            The Operating System
            <br />
            <span className="bg-gradient-to-r from-[#00d4aa] via-[#00d4aa] to-[#6366f1] bg-clip-text text-transparent">
              for Brands
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="max-w-xl text-base text-white/50 sm:text-lg"
          >
            AI-powered command center. Connect your entire business — 
            TikTok Shop, email, analytics, operations — into one intelligent interface.
          </motion.p>

          <motion.div variants={item} className="flex items-center gap-4 mt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:shadow-[0_0_40px_rgba(0,212,170,0.5)] hover:scale-[1.02]"
            >
              Access System →
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-3.5 text-sm uppercase tracking-[0.2em] text-white/70 transition hover:border-white/20 hover:text-white"
            >
              Learn More
            </a>
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <motion.div style={{ scale: orbScale, opacity: orbOpacity }}>
              <AIOrb state="idle" size={280} />
            </motion.div>
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

      {/* Features */}
      <section id="features" className="relative z-10 px-6 py-32">
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
              Everything your brand needs.<br />
              <span className="text-white/40">Nothing it doesn't.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="group glass-card p-8 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06]"
              >
                <span className="text-2xl">{feature.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="relative z-10 px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[#00d4aa]/80 mb-4">Integrations</p>
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-6">
            Connect everything.
          </h2>
          <p className="text-white/40 mb-16 max-w-lg mx-auto">
            One brain for your entire business. Every platform, every tool, every data point — unified.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {logos.map((logo, idx) => (
              <motion.div
                key={logo}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="glass-card px-6 py-4 text-sm text-white/60 hover:text-white hover:border-white/15 transition-all"
              >
                {logo}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-3xl font-light text-white sm:text-5xl mb-6">
            Ready to run your brand<br />
            <span className="bg-gradient-to-r from-[#00d4aa] to-[#6366f1] bg-clip-text text-transparent">
              from the future?
            </span>
          </h2>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:shadow-[0_0_40px_rgba(0,212,170,0.5)] hover:scale-[1.02]"
          >
            Access System →
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
          <p className="text-xs text-white/30">© 2026 WHUT.AI LLC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
