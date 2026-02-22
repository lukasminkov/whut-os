"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type VoiceState = "idle" | "listening" | "processing" | "error";

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  autoSubmit?: boolean;
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
  const { onTranscript, onFinalTranscript, autoSubmit = true } = options;
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stateRef = useRef<VoiceState>("idle");

  // Keep stateRef in sync
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

  const startListening = useCallback(() => {
    setError(null);
    setTranscript("");
    setInterimTranscript("");

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
      setTranscript(final);
      setInterimTranscript(interim);
      if (final) {
        onTranscript?.(final + interim);
      } else {
        onTranscript?.(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setError("Microphone access denied");
      } else if (event.error === "no-speech") {
        // Silence — just stop gracefully
        return;
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setState("error");
    };

    recognition.onend = () => {
      if (stateRef.current === "listening") {
        // Ended naturally (silence) — finalize
        setState("processing");
        const finalText = transcript || interimTranscript;
        // Small delay then call final callback
        setTimeout(() => {
          setState("idle");
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("Failed to start speech recognition");
      setState("error");
    }
  }, [onTranscript, transcript, interimTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      setState("processing");
      recognitionRef.current.stop();

      // Get the current transcript values and call final callback
      setTimeout(() => {
        setTranscript((prev) => {
          setInterimTranscript((interim) => {
            const finalText = (prev + " " + interim).trim();
            if (finalText && autoSubmit) {
              onFinalTranscript?.(finalText);
            }
            return "";
          });
          return prev;
        });
        setState("idle");
      }, 200);
    }
  }, [autoSubmit, onFinalTranscript]);

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
