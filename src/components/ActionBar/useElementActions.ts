"use client";

import { useMemo, useState, useCallback } from "react";
import { resolveActionConfig } from "@/lib/actions/universal-registry";
import type { ActionContext, ActionContextHelpers } from "@/lib/actions/universal-types";
// Side-effect import: registers all configs
import "@/lib/actions/configs";

interface UseElementActionsOptions {
  elementId: string;
  elementType: string;
  data: any;
  title?: string;
  sendToAI?: (message: string) => void;
}

export function useElementActions({
  elementId,
  elementType,
  data,
  title,
  sendToAI,
}: UseElementActionsOptions) {
  const [overlayContent, setOverlayContent] = useState<string | null>(null);

  const config = useMemo(
    () => resolveActionConfig(elementType, data),
    [elementType, data],
  );

  const helpers: ActionContextHelpers = useMemo(() => ({
    sendToAI: (msg: string) => sendToAI?.(msg),
    toast: (msg: string, type?: string) => {
      // Simple toast: dispatch custom event for the app to handle
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("whut-toast", { detail: { message: msg, type } }));
      }
    },
    executeAIAction: async (prompt: string, _inline?: boolean): Promise<string> => {
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }], stream: false }),
        });
        if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
        const json = await res.json();
        return json.content || json.message || JSON.stringify(json);
      } catch (err) {
        return `Error: ${err}`;
      }
    },
    googleFetch: async (url: string, init?: RequestInit) => {
      // Get token from stored tokens
      const tokensRes = await fetch("/api/integrations/tokens");
      const tokens = await tokensRes.json();
      const googleToken = tokens?.google?.access_token;
      return fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${googleToken}`,
        },
      });
    },
    setOverlayContent,
    copyToClipboard: (text: string) => {
      navigator.clipboard?.writeText(text);
    },
  }), [sendToAI]);

  const context: ActionContext | null = useMemo(() => {
    if (!config) return null;
    return {
      visualizationType: config.visualizationType,
      elementId,
      elementType,
      data,
      title,
      helpers,
    };
  }, [config, elementId, elementType, data, title, helpers]);

  const clearOverlay = useCallback(() => setOverlayContent(null), []);

  return {
    config,
    context,
    actions: config?.actions ?? [],
    aiActions: config?.aiActions ?? [],
    voiceCommands: config?.voiceCommands ?? [],
    overlayContent,
    clearOverlay,
    hasActions: config !== null,
  };
}
