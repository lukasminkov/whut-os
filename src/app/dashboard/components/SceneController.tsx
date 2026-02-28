"use client";

import { useState, useCallback } from "react";
import type { Scene } from "@/lib/scene-v4-types";
import * as SceneManager from "@/lib/scene-manager";
import { screenContextStore } from "@/lib/screen-context";

export function useSceneController() {
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);

  const closeCards = useCallback(() => {
    setCurrentScene(null);
    SceneManager.clearScene();
  }, []);

  const handleItemAction = useCallback((item: any, element: any, sendToAI: (msg: string) => void) => {
    const elementTitle = element?.title?.toLowerCase() || "";
    const itemTitle = item?.title || item?.subtitle || "";

    if (elementTitle.includes("email") || elementTitle.includes("inbox") || elementTitle.includes("mail")) {
      screenContextStore.setActiveEmail({
        id: item.id || "",
        subject: itemTitle,
        from: item.subtitle || item.meta || "",
        snippet: item.description || item.body || "",
        threadId: item.threadId,
        date: item.date || item.meta,
      });
      sendToAI(`Open the email "${itemTitle}" (id: ${item.id})`);
    } else if (elementTitle.includes("calendar") || elementTitle.includes("schedule")) {
      sendToAI(`Tell me more about "${itemTitle}"`);
    } else {
      sendToAI(`Tell me more about "${itemTitle}"`);
    }
  }, []);

  return {
    currentScene,
    setCurrentScene,
    closeCards,
    handleItemAction,
  };
}
