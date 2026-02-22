"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("whut_tts_muted") === "true";
    }
    return false;
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Pick a good voice once voices are loaded
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      // Prefer natural-sounding English voices
      const preferred = [
        "Samantha", "Karen", "Daniel", "Google UK English Female",
        "Google UK English Male", "Google US English", "Moira", "Fiona",
        "Alex", "Tessa", "Rishi",
      ];

      for (const name of preferred) {
        const v = voices.find((v) => v.name.includes(name) && v.lang.startsWith("en"));
        if (v) { voiceRef.current = v; return; }
      }

      // Fallback: any English voice
      const en = voices.find((v) => v.lang.startsWith("en"));
      if (en) voiceRef.current = en;
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string) => {
    if (!text || isMuted || typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem("whut_tts_muted", String(next));
      if (next) {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
      }
      return next;
    });
  }, []);

  return { isSpeaking, isMuted, speak, stop, toggleMute };
}

/**
 * Extract only the spoken-friendly text from AI response blocks.
 * Strips visualization data, chart numbers, code, etc.
 */
export function extractSpeakableText(blocks: any[]): string {
  const textParts = blocks
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.content)
    .join(" ");

  if (!textParts) return "";

  // Clean up markdown artifacts
  let clean = textParts
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/\|.*\|/g, "") // table rows
    .replace(/[#*_~`>]/g, "") // markdown chars
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Truncate for speech — keep it concise
  if (clean.length > 300) {
    const cutoff = clean.lastIndexOf(".", 280);
    clean = clean.slice(0, cutoff > 100 ? cutoff + 1 : 280) + ".";
  }

  return clean;
}
