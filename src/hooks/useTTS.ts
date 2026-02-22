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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopAudio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!text || isMuted) {
        onEnd?.();
        return;
      }

      stopAudio();
      onEndRef.current = onEnd || null;

      const controller = new AbortController();
      abortRef.current = controller;

      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`TTS API ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (controller.signal.aborted) return;

          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onplay = () => setIsSpeaking(true);
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(url);
            audioRef.current = null;
            onEndRef.current?.();
            onEndRef.current = null;
          };
          audio.onerror = () => {
            console.warn("ElevenLabs audio playback error — skipping speech");
            setIsSpeaking(false);
            URL.revokeObjectURL(url);
            audioRef.current = null;
            onEndRef.current?.();
            onEndRef.current = null;
          };

          audio.play().catch((err) => {
            console.warn("Audio autoplay blocked — skipping speech:", err);
            URL.revokeObjectURL(url);
            onEndRef.current?.();
            onEndRef.current = null;
          });
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          console.warn("ElevenLabs TTS failed — skipping speech:", err);
          onEndRef.current?.();
          onEndRef.current = null;
        });
    },
    [isMuted, stopAudio]
  );

  const stop = useCallback(() => {
    stopAudio();
    onEndRef.current = null;
  }, [stopAudio]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem("whut_tts_muted", String(next));
      if (next) stopAudio();
      return next;
    });
  }, [stopAudio]);

  return { isSpeaking, isMuted, speak, stop, toggleMute };
}

// Recursively extract text from v2 scene graph nodes
function extractSceneText(node: any): string[] {
  if (!node) return [];
  const texts: string[] = [];
  if (node.type === "text-block" || node.type === "markdown") {
    const content = node.data?.content || node.content || "";
    if (content) texts.push(content);
  }
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      texts.push(...extractSceneText(child));
    }
  }
  return texts;
}

export function extractSpeakableText(blocks: any[], scene?: any): string {
  const sceneTexts = scene ? extractSceneText(scene) : [];
  const blockTexts = (blocks || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.content);
  
  const textParts = [...sceneTexts, ...blockTexts].join(" ");
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
