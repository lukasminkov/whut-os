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

  // Cleanup on unmount
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

  // Web Speech API fallback
  const speakFallback = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      // Try to pick an English voice
      const voices = window.speechSynthesis.getVoices();
      const en = voices.find((v) => v.lang.startsWith("en"));
      if (en) utterance.voice = en;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!text || isMuted) {
        onEnd?.();
        return;
      }

      // Stop any current playback
      stopAudio();
      window.speechSynthesis?.cancel();
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
            setIsSpeaking(false);
            URL.revokeObjectURL(url);
            audioRef.current = null;
            // Fallback to Web Speech
            speakFallback(text, () => {
              onEndRef.current?.();
              onEndRef.current = null;
            });
          };

          audio.play().catch(() => {
            // Autoplay blocked or error — fallback
            URL.revokeObjectURL(url);
            speakFallback(text, () => {
              onEndRef.current?.();
              onEndRef.current = null;
            });
          });
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          console.warn("ElevenLabs TTS failed, falling back:", err);
          speakFallback(text, () => {
            onEndRef.current?.();
            onEndRef.current = null;
          });
        });
    },
    [isMuted, stopAudio, speakFallback]
  );

  const stop = useCallback(() => {
    stopAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    onEndRef.current = null;
  }, [stopAudio]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem("whut_tts_muted", String(next));
      if (next) {
        stopAudio();
        window.speechSynthesis?.cancel();
      }
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
  // Try v2 scene graph first
  const sceneTexts = scene ? extractSceneText(scene) : [];
  
  // Then v1 blocks
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
