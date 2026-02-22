"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type VoiceState = "idle" | "listening" | "processing" | "error";

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  autoSubmit?: boolean;
  silenceTimeout?: number; // ms of silence before auto-submitting (default 1500)
}

interface UseVoiceInputReturn {
  state: VoiceState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { onTranscript, onFinalTranscript, autoSubmit = true, silenceTimeout = 1500 } = options;
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stateRef = useRef<VoiceState>("idle");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTextRef = useRef("");
  const lastResultTimeRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const finalize = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const text = accumulatedTextRef.current.trim();
    if (text && autoSubmit) {
      onFinalTranscript?.(text);
    }
    accumulatedTextRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setState("idle");
  }, [autoSubmit, onFinalTranscript]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    accumulatedTextRef.current = "";

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      setState("error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setState("listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const currentText = (final + " " + interim).trim();
      accumulatedTextRef.current = currentText;
      setTranscript(final);
      setInterimTranscript(interim);
      onTranscript?.(currentText);
      lastResultTimeRef.current = Date.now();

      // Reset silence timer on every result
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // If we have final text, start silence timer for auto-submit
      if (final.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          // Auto-stop and submit after silence
          if (recognitionRef.current && stateRef.current === "listening") {
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setState("processing");
            setTimeout(() => finalize(), 100);
          }
        }, silenceTimeout);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setError("Microphone access denied");
        setState("error");
      } else if (event.error === "no-speech") {
        // Silence with no speech at all — stop gracefully
        setState("idle");
        return;
      } else if (event.error === "aborted") {
        // Intentional stop
        return;
      } else {
        setError(`Speech recognition error: ${event.error}`);
        setState("error");
      }
    };

    recognition.onend = () => {
      // If still "listening", speech ended naturally (browser timeout or silence)
      if (stateRef.current === "listening") {
        setState("processing");
        setTimeout(() => finalize(), 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("Failed to start speech recognition");
      setState("error");
    }
  }, [onTranscript, silenceTimeout, finalize]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      setState("processing");
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setTimeout(() => finalize(), 200);
    }
  }, [finalize]);

  const toggleListening = useCallback(() => {
    if (state === "listening") {
      stopListening();
    } else if (state === "idle" || state === "error") {
      startListening();
    }
  }, [state, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    state,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
