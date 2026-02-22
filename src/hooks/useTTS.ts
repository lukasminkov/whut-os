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
  const onEndRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      const preferred = [
        "Samantha", "Karen", "Daniel", "Google UK English Female",
        "Google UK English Male", "Google US English", "Moira", "Fiona",
        "Alex", "Tessa", "Rishi",
      ];

      for (const name of preferred) {
        const v = voices.find((v) => v.name.includes(name) && v.lang.startsWith("en"));
        if (v) { voiceRef.current = v; return; }
      }

      const en = voices.find((v) => v.lang.startsWith("en"));
      if (en) voiceRef.current = en;
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!text || isMuted || typeof window === "undefined" || !window.speechSynthesis) {
      // If muted, still fire onEnd so the speech loop continues
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    onEndRef.current = onEnd || null;

    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEndRef.current?.();
      onEndRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onEndRef.current?.();
      onEndRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    onEndRef.current = null;
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

export function extractSpeakableText(blocks: any[]): string {
  const textParts = blocks
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.content)
    .join(" ");

  if (!textParts) return "";

  let clean = textParts
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\|.*\|/g, "")
    .replace(/[#*_~`>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (clean.length > 300) {
    const cutoff = clean.lastIndexOf(".", 280);
    clean = clean.slice(0, cutoff > 100 ? cutoff + 1 : 280) + ".";
  }

  return clean;
}
