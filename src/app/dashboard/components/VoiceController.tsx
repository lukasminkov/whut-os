"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { AppMode } from "@/components/ModeToggle";
import type { UseTTSReturn } from "@/hooks/useTTS";

export function useVoiceController(opts: {
  appMode: AppMode;
  tts: UseTTSReturn;
  setInput: (v: string) => void;
  sendToAI: (msg: string) => void;
}) {
  const { appMode, tts, setInput, sendToAI } = opts;
  const [speechActive, setSpeechActive] = useState(false);
  const speechLoopRef = useRef(false);

  const handleVoiceFinal = useCallback((text: string) => {
    setInput("");
    tts.stop();
    sendToAI(text);
  }, [sendToAI, tts, setInput]);

  const voice = useVoiceInput({
    onTranscript: (text) => setInput(text),
    onFinalTranscript: handleVoiceFinal,
    autoSubmit: true,
    silenceTimeout: 800,
  });

  const startSpeechMode = useCallback(() => {
    speechLoopRef.current = true;
    setSpeechActive(true);
    voice.startListening();
  }, [voice]);

  const stopSpeechMode = useCallback(() => {
    speechLoopRef.current = false;
    setSpeechActive(false);
    tts.stop();
    voice.stopListening();
  }, [voice, tts]);

  // Stop TTS when listening starts
  useEffect(() => {
    if (voice.state === "listening" && tts.isSpeaking) tts.stop();
  }, [voice.state, tts.isSpeaking, tts]);

  // Push-to-talk (chat mode only)
  useEffect(() => {
    if (appMode !== "chat") return;
    const isInputFocused = () => ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "");
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isInputFocused()) {
        e.preventDefault();
        if (voice.state !== "listening") voice.startListening();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isInputFocused()) {
        e.preventDefault();
        if (voice.state === "listening") voice.stopListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [appMode, voice.state, voice.startListening, voice.stopListening]);

  return {
    voice,
    speechActive,
    speechLoopRef,
    startSpeechMode,
    stopSpeechMode,
  };
}
