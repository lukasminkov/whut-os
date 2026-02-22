"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const supabase = createClient();

  // Check if already authenticated
  useEffect(() => {
    if (!supabase) {
      // Supabase not configured — fall back to localStorage auth
      if (localStorage.getItem("whut-os-auth") === "true") {
        router.replace("/dashboard");
      }
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [supabase, router]);

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError("Authentication not configured");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        scopes: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar.readonly",
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!supabase) {
      // Fallback: hardcoded login
      if (email === "minkovgroup@gmail.com") {
        localStorage.setItem("whut-os-auth", "true");
        router.push("/dashboard");
      } else {
        setError("Access denied.");
      }
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00d4aa]/5 blur-[120px]" />

      <motion.div
        className="relative z-10 w-full max-w-sm mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src="/whut-logo.svg" alt="WHUT OS" className="h-10 opacity-90" />
        </div>

        {magicLinkSent ? (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-medium mb-2">Check your email</h2>
            <p className="text-white/40 text-sm mb-6">
              We sent a sign-in link to <span className="text-white/60">{email}</span>
            </p>
            <button
              onClick={() => { setMagicLinkSent(false); setEmail(""); }}
              className="text-xs text-white/30 hover:text-white/50 transition"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-[#0a0a0a] font-medium text-sm hover:bg-white/90 transition-all disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {loading ? "Redirecting..." : "Sign in with Google"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/20">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Magic link */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/30 outline-none focus:border-white/20 transition"
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/70 text-sm font-medium hover:bg-white/[0.1] hover:text-white transition disabled:opacity-40"
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>

            {/* Error */}
            {error && (
              <motion.p
                className="mt-4 text-center text-xs text-red-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
