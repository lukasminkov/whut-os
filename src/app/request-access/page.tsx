"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function RequestAccessPage() {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="app-bg">
      <div className="starfield" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 py-16">
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="glass-panel w-full max-w-md p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex items-center justify-center mx-auto">
                <span className="text-2xl">✓</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-light text-white">You&apos;re on the list.</h1>
                <p className="text-sm text-white/50 leading-relaxed">
                  We&apos;ll be in touch when your access is ready.
                  <br />The future of how you interact with technology starts soon.
                </p>
              </div>
              <Link
                href="/"
                className="inline-block text-[11px] uppercase tracking-[0.2em] text-[#00d4aa]/70 hover:text-[#00d4aa] transition"
              >
                ← Back to home
              </Link>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              onSubmit={handleSubmit}
              className="glass-panel w-full max-w-md space-y-6 p-8"
            >
              <div className="space-y-2 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-xl font-bold tracking-tight text-white">WHUT</span>
                  <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 mt-0.5">OS</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-light text-white">Request Access</h1>
                <p className="text-sm text-white/50">
                  Join the private beta. We&apos;ll reach out when it&apos;s your turn.
                </p>
              </div>

              {status === "error" && errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300"
                >
                  {errorMsg}
                </motion.div>
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={update("name")}
                  className="glass-input w-full px-4 py-3 text-sm outline-none placeholder:text-white/30"
                  required
                />
                <input
                  type="text"
                  placeholder="Company name"
                  value={form.company}
                  onChange={update("company")}
                  className="glass-input w-full px-4 py-3 text-sm outline-none placeholder:text-white/30"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={update("email")}
                  className="glass-input w-full px-4 py-3 text-sm outline-none placeholder:text-white/30"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={update("phone")}
                  className="glass-input w-full px-4 py-3 text-sm outline-none placeholder:text-white/30"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-xl bg-[#00d4aa] px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:shadow-[0_0_30px_rgba(0,212,170,0.6)] disabled:opacity-50"
              >
                {status === "sending" ? "Submitting..." : "Request Access"}
              </button>

              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="text-[11px] text-white/30 hover:text-white/50 transition"
                >
                  ← Back
                </Link>
                <Link
                  href="/login"
                  className="text-[11px] text-white/30 hover:text-white/50 transition"
                >
                  Already have access? Sign in
                </Link>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
