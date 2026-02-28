"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTTS } from "@/hooks/useTTS";
import { cacheScene, getCachedScene, isRepeatRequest, getLastScene } from "@/lib/scene-cache";
import { serializeScreenContext, hasScreenContext, screenContextStore } from "@/lib/screen-context";
import type { Scene } from "@/lib/scene-v4-types";
import type { RecapMessage } from "@/components/ChatRecap";
import { useWindowManager } from "@/features/window-manager";

export interface ChatState {
  chatMessages: RecapMessage[];
  conversationId: string | null;
  thinking: boolean;
  statusText: string | null;
}

export function useChatController(opts: {
  userProfile: Record<string, any>;
  pendingImages: string[];
  clearPendingImages: () => void;
  setInput: (v: string) => void;
  setCurrentScene: React.Dispatch<React.SetStateAction<Scene | null>>;
  onSceneReceived: (scene: Scene, query: string, spokenText: string) => void;
  speechLoopRef: React.MutableRefObject<boolean>;
  voiceStartListening: () => void;
}) {
  const {
    userProfile, pendingImages, clearPendingImages, setInput,
    setCurrentScene, onSceneReceived, speechLoopRef, voiceStartListening,
  } = opts;

  const [chatMessages, setChatMessages] = useState<RecapMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const lastSceneRef = useRef<Scene | null>(null);
  const tts = useTTS();
  const { openWindow } = useWindowManager();

  // Initialize conversation
  useEffect(() => {
    async function initConversation() {
      try {
        const res = await fetch('/api/conversations?active=true');
        const data = await res.json();
        if (data.conversation) {
          setConversationId(data.conversation.id);
          const msgRes = await fetch(`/api/conversations/${data.conversation.id}/messages?limit=50`);
          const msgData = await msgRes.json();
          if (msgData.messages?.length) {
            setChatMessages(msgData.messages.map((m: any) => ({
              id: m.id, role: m.role, content: m.content || "",
              timestamp: new Date(m.created_at),
            })));
            const lastWithScene = [...(msgData.messages || [])].reverse().find((m: any) => m.scene_data);
            if (lastWithScene?.scene_data) setCurrentScene(lastWithScene.scene_data);
          }
        } else {
          const createRes = await fetch('/api/conversations', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
          });
          const createData = await createRes.json();
          if (createData.conversation) setConversationId(createData.conversation.id);
        }
      } catch (e) {
        console.error("Failed to init conversation:", e);
      }
    }
    initConversation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startNewConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const data = await res.json();
      if (data.conversation) {
        setConversationId(data.conversation.id);
        setChatMessages([]);
        setCurrentScene(null);
        window.dispatchEvent(new CustomEvent('whut-conversation-changed'));
      }
    } catch {}
  }, [setCurrentScene]);

  const loadConversation = useCallback(async (id: string) => {
    try {
      setConversationId(id);
      setCurrentScene(null);
      const msgRes = await fetch(`/api/conversations/${id}/messages?limit=50`);
      const msgData = await msgRes.json();
      const msgs = (msgData.messages || []).map((m: any) => ({
        id: m.id, role: m.role, content: m.content || "",
        timestamp: new Date(m.created_at),
      }));
      setChatMessages(msgs);
      const lastWithScene = [...(msgData.messages || [])].reverse().find((m: any) => m.scene_data);
      if (lastWithScene?.scene_data) setCurrentScene(lastWithScene.scene_data);
    } catch {}
  }, [setCurrentScene]);

  // Expose for sidebar
  useEffect(() => {
    (window as any).__whut_loadConversation = loadConversation;
    (window as any).__whut_newConversation = startNewConversation;
    return () => { delete (window as any).__whut_loadConversation; delete (window as any).__whut_newConversation; };
  }, [loadConversation, startNewConversation]);

  const sendToAI = useCallback(async (trimmed: string) => {
    if (!trimmed) return;
    if (sendingRef.current) return;
    sendingRef.current = true;

    const repeat = isRepeatRequest(trimmed);
    const cachedResult = repeat ? getLastScene() : getCachedScene(trimmed);
    if (cachedResult) {
      setCurrentScene(cachedResult.scene);
      if (cachedResult.spokenText) tts.speak(cachedResult.spokenText);
      setChatMessages(prev => [...prev,
        { id: `user-${Date.now()}`, role: "user" as const, content: trimmed, timestamp: new Date() },
        { id: `assistant-${Date.now()}`, role: "assistant" as const, content: cachedResult.spokenText || "Here you go.", timestamp: new Date() },
      ]);
      sendingRef.current = false;
      return;
    }

    setInput("");
    const imagesToSend = [...pendingImages];
    clearPendingImages();
    setThinking(true);
    setStatusText(null);

    const userMsgId = `user-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: userMsgId, role: "user", content: trimmed, timestamp: new Date() }]);

    const assistantMsgId = `assistant-${Date.now()}`;
    let assistantAdded = false;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          images: imagesToSend.length > 0 ? imagesToSend : undefined,
          conversationId,
          userProfile,
          context: {
            screen: { width: window.innerWidth, height: window.innerHeight },
            time: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenContext: serializeScreenContext(screenContextStore.getState()),
            hasScreenContext: hasScreenContext(screenContextStore.getState()),
          },
        }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let streamingText = "";
      let spokenText = "";
      let receivedScene = false;
      let preambleSpoken = false;
      let preambleSpeakTimer: ReturnType<typeof setTimeout> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "text_delta") {
              streamingText += event.text;
              setThinking(false);

              if (!assistantAdded) {
                assistantAdded = true;
                setChatMessages(prev => [...prev, {
                  id: assistantMsgId, role: "assistant", content: streamingText,
                  timestamp: new Date(), streaming: true,
                }]);
              } else {
                setChatMessages(prev => prev.map(m =>
                  m.id === assistantMsgId ? { ...m, content: streamingText } : m
                ));
              }

              if (!preambleSpoken && !receivedScene) {
                if (preambleSpeakTimer) clearTimeout(preambleSpeakTimer);
                preambleSpeakTimer = setTimeout(() => {
                  if (!preambleSpoken && streamingText.trim()) {
                    preambleSpoken = true;
                    tts.speak(streamingText.trim());
                  }
                }, 300);
              }
            } else if (event.type === "scene_start") {
              // Progressive streaming: initialize empty scene shell
              const emptyScene: Scene = {
                id: event.sceneId,
                intent: event.intent || "",
                layout: event.layout || "focused",
                elements: [],
                spoken: event.spoken || "",
              };
              setCurrentScene(emptyScene);
              lastSceneRef.current = emptyScene;
              setThinking(false);
              setStatusText(null);
            } else if (event.type === "card_add") {
              // Progressive streaming: add individual card to scene
              receivedScene = true;
              setCurrentScene((prev: Scene | null) => {
                if (!prev || prev.id !== event.sceneId) return prev;
                const el = event.element;
                if (prev.elements.some((e: any) => e.id === el.id)) return prev;
                const updated = { ...prev, elements: [...prev.elements, el] };
                lastSceneRef.current = updated;
                return updated;
              });
            } else if (event.type === "status") {
              setStatusText(event.text);
            } else if (event.type === "scene") {
              receivedScene = true;
              lastSceneRef.current = event.scene;
              setCurrentScene(event.scene);
              setThinking(false);
              setStatusText(null);
              onSceneReceived(event.scene, trimmed, spokenText);
            } else if (event.type === "card") {
              const card = event.card;
              if (card?.type === "content" && card?.data?.content) {
                const textScene: Scene = {
                  id: `text-${Date.now()}`, intent: "", layout: "minimal",
                  elements: [{ id: "response", type: "text", priority: 1, data: { content: card.data.content, typewriter: true } }],
                };
                setCurrentScene(textScene);
                receivedScene = true;
              }
              setThinking(false);
              setStatusText(null);
            } else if (event.type === "done") {
              spokenText = event.text || "";
            } else if (event.type === "os_command") {
              const cmd = event.command;
              if (cmd.os_command === "window_manager") {
                if (cmd.action === "open" && cmd.window_type) {
                  openWindow(cmd.window_type, cmd.title ? { title: cmd.title } : undefined);
                }
              } else if (cmd.os_command === "browser_navigate") {
                const url = cmd.action === "search"
                  ? `https://www.google.com/search?igu=1&q=${encodeURIComponent(cmd.query || "")}`
                  : cmd.url || "https://www.google.com";
                openWindow("browser", { title: "Browser", initialUrl: url });
              } else if (cmd.os_command === "file_manager") {
                if (cmd.action === "list" || cmd.action === "search") {
                  openWindow("files", { title: "Files" });
                }
              }
            } else if (event.type === "error") {
              console.error("AI error:", event.error);
              const errorMsg = `⚠️ Something went wrong: ${typeof event.error === 'string' ? event.error.slice(0, 200) : 'Request failed'}`;
              if (!assistantAdded) {
                assistantAdded = true;
                setChatMessages(prev => [...prev, {
                  id: assistantMsgId, role: "assistant", content: errorMsg, timestamp: new Date(),
                }]);
              } else {
                setChatMessages(prev => prev.map(m =>
                  m.id === assistantMsgId ? { ...m, content: errorMsg, streaming: false } : m
                ));
              }
              setThinking(false);
              setStatusText(null);
            }
          } catch {}
        }
      }

      if (preambleSpeakTimer) clearTimeout(preambleSpeakTimer);
      const finalText = spokenText || streamingText;

      if (!receivedScene && finalText) {
        setCurrentScene({
          id: `text-${Date.now()}`, intent: "", layout: "minimal",
          elements: [{ id: "response", type: "text", priority: 1, data: { content: finalText, typewriter: true } }],
        });
      }

      if (assistantAdded) {
        setChatMessages(prev => prev.map(m =>
          m.id === assistantMsgId ? { ...m, content: finalText, streaming: false } : m
        ));
      } else if (finalText) {
        setChatMessages(prev => [...prev, {
          id: assistantMsgId, role: "assistant", content: finalText, timestamp: new Date(),
        }]);
      }

      setThinking(false);
      setStatusText(null);

      if (receivedScene && lastSceneRef.current) {
        cacheScene(trimmed, lastSceneRef.current, finalText);
      }

      const shouldSpeak = finalText && !(preambleSpoken && finalText.trim() === streamingText.trim());
      if (shouldSpeak) {
        tts.speak(finalText, () => {
          if (speechLoopRef.current) voiceStartListening();
        });
      } else if (speechLoopRef.current) {
        voiceStartListening();
      }

      window.dispatchEvent(new CustomEvent('whut-conversation-changed'));

    } catch (error: any) {
      console.error("AI error:", error);
      const errorMsg = `⚠️ Failed to get response: ${error?.message || 'Network error'}. Please try again.`;
      setChatMessages(prev => [...prev, {
        id: `error-${Date.now()}`, role: "assistant", content: errorMsg, timestamp: new Date(),
      }]);
      setThinking(false);
      setStatusText(null);
      if (speechLoopRef.current) voiceStartListening();
    } finally {
      sendingRef.current = false;
    }
  }, [conversationId, userProfile, tts, pendingImages, clearPendingImages, setInput, setCurrentScene, onSceneReceived, speechLoopRef, voiceStartListening, openWindow]);

  return {
    chatMessages, setChatMessages,
    conversationId,
    thinking, statusText,
    tts,
    sendToAI,
    startNewConversation,
    loadConversation,
  };
}
