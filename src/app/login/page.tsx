"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      if (email === "minkovgroup@gmail.com" && password === "whutaios12345") {
        localStorage.setItem("whut-os-auth", "true");
        router.push("/dashboard");
      } else {
        setError("Invalid credentials. Access denied.");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="app-bg">
      <div className="starfield" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          onSubmit={handleSubmit}
          className="glass-panel w-full max-w-md space-y-6 p-8"
        >
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xl font-bold tracking-tight text-white">WHUT</span>
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 mt-0.5">OS</span>
            </div>
            <h1 className="text-3xl font-light text-white">Sign in</h1>
            <p className="text-sm text-white/50">Access the next generation operating system.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input w-full px-4 py-3 text-sm outline-none placeholder:text-white/30"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full px-4 py-3 text-sm outline-none placeholder:text-white/30"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#00d4aa] px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:shadow-[0_0_30px_rgba(0,212,170,0.6)] disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign in"}
          </button>

          <p className="text-center text-xs text-white/30">
            Private beta. Invitation only.
          </p>
        </motion.form>
      </main>
    </div>
  );
}
