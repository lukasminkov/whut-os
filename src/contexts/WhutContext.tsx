"use client";

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import type { SceneNode } from "@/lib/scene-types";

interface WhutContextValue {
  connectedIntegrations: string[];
  screenSize: { width: number; height: number; device: "desktop" | "tablet" | "mobile" };
  currentScene: SceneNode | null;
  setCurrentScene: (scene: SceneNode | null) => void;
}

const WhutContext = createContext<WhutContextValue>({
  connectedIntegrations: [],
  screenSize: { width: 1440, height: 900, device: "desktop" },
  currentScene: null,
  setCurrentScene: () => {},
});

export function WhutProvider({ children }: { children: ReactNode }) {
  const [currentScene, setCurrentScene] = useState<SceneNode | null>(null);
  const [screenSize, setScreenSize] = useState({ width: 1440, height: 900, device: "desktop" as const });

  // Detect connected integrations from localStorage
  const connectedIntegrations = useMemo(() => {
    if (typeof window === "undefined") return [];
    const integrations: string[] = [];
    try {
      const google = localStorage.getItem("whut_google_tokens");
      if (google) {
        const parsed = JSON.parse(google);
        if (parsed.access_token) {
          integrations.push("gmail", "calendar", "drive");
        }
      }
    } catch {}
    try {
      if (localStorage.getItem("whut_tiktok_tokens")) integrations.push("tiktok");
    } catch {}
    try {
      if (localStorage.getItem("whut_shopify_tokens")) integrations.push("shopify");
    } catch {}
    return integrations;
  }, []);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const device = w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
      setScreenSize({ width: w, height: h, device: device as any });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <WhutContext.Provider value={{ connectedIntegrations, screenSize, currentScene, setCurrentScene }}>
      {children}
    </WhutContext.Provider>
  );
}

export function useWhut() {
  return useContext(WhutContext);
}
