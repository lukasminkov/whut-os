"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  X,
  Globe,
  Search,
} from "lucide-react";
import type { BrowserTab } from "./types";

let tabCounter = 0;

function createTab(url = "https://www.google.com"): BrowserTab {
  return {
    id: `tab-${++tabCounter}`,
    url,
    title: url === "https://www.google.com" ? "Google" : new URL(url).hostname,
    loading: false,
  };
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "https://www.google.com";

  // If it looks like a URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;

  // Treat as search
  return `https://www.google.com/search?igu=1&q=${encodeURIComponent(trimmed)}`;
}

interface EmbeddedBrowserProps {
  initialUrl?: string;
}

export default function EmbeddedBrowser({ initialUrl }: EmbeddedBrowserProps) {
  const [tabs, setTabs] = useState<BrowserTab[]>([createTab(initialUrl)]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [urlInput, setUrlInput] = useState(tabs[0].url);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const navigateTo = useCallback(
    (url: string) => {
      const normalized = normalizeUrl(url);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, url: normalized, title: new URL(normalized).hostname, loading: true } : t
        )
      );
      setUrlInput(normalized);
    },
    [activeTabId]
  );

  const handleUrlKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        navigateTo(urlInput);
      }
    },
    [urlInput, navigateTo]
  );

  const addTab = useCallback(() => {
    const tab = createTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setUrlInput(tab.url);
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const updated = prev.filter((t) => t.id !== tabId);
        if (updated.length === 0) {
          const newTab = createTab();
          setActiveTabId(newTab.id);
          setUrlInput(newTab.url);
          return [newTab];
        }
        if (activeTabId === tabId) {
          const newActive = updated[0];
          setActiveTabId(newActive.id);
          setUrlInput(newActive.url);
        }
        return updated;
      });
    },
    [activeTabId]
  );

  const switchTab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) setUrlInput(tab.url);
    },
    [tabs]
  );

  const refresh = useCallback(() => {
    if (iframeRef.current && activeTab) {
      iframeRef.current.src = activeTab.url;
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full text-white">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 pt-1 bg-white/5 overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs cursor-pointer max-w-[150px] ${
              tab.id === activeTabId ? "bg-black/40 text-white/80" : "text-white/40 hover:text-white/60 hover:bg-white/5"
            }`}
            onClick={() => switchTab(tab.id)}
          >
            <Globe size={10} className="shrink-0" />
            <span className="truncate">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="p-0.5 rounded hover:bg-white/10 shrink-0"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button onClick={addTab} className="p-1 rounded hover:bg-white/10 text-white/30">
          <Plus size={12} />
        </button>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/5 shrink-0">
        <button onClick={() => window.history.back()} className="p-1 rounded hover:bg-white/10 text-white/30">
          <ArrowLeft size={14} />
        </button>
        <button onClick={() => window.history.forward()} className="p-1 rounded hover:bg-white/10 text-white/30">
          <ArrowRight size={14} />
        </button>
        <button onClick={refresh} className="p-1 rounded hover:bg-white/10 text-white/30">
          <RotateCw size={14} />
        </button>
        <div className="flex items-center flex-1 bg-white/5 rounded-lg px-3 py-1.5 gap-2">
          <Search size={12} className="text-white/20 shrink-0" />
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            onFocus={(e) => e.target.select()}
            placeholder="Search or enter URL..."
            className="bg-transparent text-xs text-white/80 outline-none w-full"
          />
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 bg-white relative">
        {activeTab && (
          <iframe
            ref={iframeRef}
            src={activeTab.url}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => {
              setTabs((prev) =>
                prev.map((t) => (t.id === activeTabId ? { ...t, loading: false } : t))
              );
            }}
            title={activeTab.title}
          />
        )}
      </div>
    </div>
  );
}
