"use client";

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  X,
  Globe,
  Search,
  BookOpen,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import type { BrowserTab } from "./types";
import { screenContextStore } from "@/lib/screen-context";

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

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;

  // Treat as search
  return `https://www.google.com/search?igu=1&q=${encodeURIComponent(trimmed)}`;
}

function proxyUrl(url: string, reader = false): string {
  const params = new URLSearchParams({ url });
  if (reader) params.set("reader", "1");
  return `/api/browser/proxy?${params.toString()}`;
}

interface EmbeddedBrowserProps {
  initialUrl?: string;
}

export default function EmbeddedBrowser({ initialUrl }: EmbeddedBrowserProps) {
  const [tabs, setTabs] = useState<BrowserTab[]>([createTab(initialUrl)]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [urlInput, setUrlInput] = useState(tabs[0].url);
  const [readerMode, setReaderMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([tabs[0].url]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Report browser state to screen context
  useEffect(() => {
    if (activeTab) {
      screenContextStore.setBrowserState({
        url: activeTab.url,
        title: activeTab.title,
      });
    }
    return () => {
      screenContextStore.setBrowserState(null);
    };
  }, [activeTab?.url, activeTab?.title]);

  const navigateTo = useCallback(
    (url: string) => {
      const normalized = normalizeUrl(url);
      setError(null);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, url: normalized, title: new URL(normalized).hostname, loading: true }
            : t
        )
      );
      setUrlInput(normalized);
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), normalized]);
      setHistoryIndex((prev) => prev + 1);
    },
    [activeTabId, historyIndex]
  );

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const url = history[newIdx];
      setHistoryIndex(newIdx);
      setUrlInput(url);
      setError(null);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, url, title: new URL(url).hostname, loading: true }
            : t
        )
      );
    }
  }, [historyIndex, history, activeTabId]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      const url = history[newIdx];
      setHistoryIndex(newIdx);
      setUrlInput(url);
      setError(null);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, url, title: new URL(url).hostname, loading: true }
            : t
        )
      );
    }
  }, [historyIndex, history, activeTabId]);

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
    setError(null);
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
      setError(null);
    },
    [activeTabId]
  );

  const switchTab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) setUrlInput(tab.url);
      setError(null);
    },
    [tabs]
  );

  const refresh = useCallback(() => {
    if (iframeRef.current && activeTab) {
      setError(null);
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, loading: true } : t))
      );
      iframeRef.current.src = proxyUrl(activeTab.url, readerMode);
    }
  }, [activeTab, activeTabId, readerMode]);

  const toggleReader = useCallback(() => {
    setReaderMode((prev) => !prev);
    // Trigger reload with new mode on next render
    if (iframeRef.current && activeTab) {
      iframeRef.current.src = proxyUrl(activeTab.url, !readerMode);
    }
  }, [activeTab, readerMode]);

  const handleIframeError = useCallback(() => {
    setError("This site couldn't be loaded through the proxy.");
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, loading: false } : t))
    );
  }, [activeTabId]);

  const currentProxySrc = activeTab ? proxyUrl(activeTab.url, readerMode) : "";

  return (
    <div className="flex flex-col h-full text-white">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 pt-1 bg-white/5 overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs cursor-pointer max-w-[150px] ${
              tab.id === activeTabId
                ? "bg-black/40 text-white/80"
                : "text-white/40 hover:text-white/60 hover:bg-white/5"
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
        <button
          onClick={goBack}
          disabled={historyIndex <= 0}
          className="p-1 rounded hover:bg-white/10 text-white/30 disabled:opacity-20"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          className="p-1 rounded hover:bg-white/10 text-white/30 disabled:opacity-20"
        >
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
        <button
          onClick={toggleReader}
          title={readerMode ? "Exit reader mode" : "Reader mode"}
          className={`p-1 rounded hover:bg-white/10 ${
            readerMode ? "text-purple-400" : "text-white/30"
          }`}
        >
          <BookOpen size={14} />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 bg-white relative">
        {error && activeTab ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]">
            <div className="text-center space-y-4 max-w-sm px-6">
              <AlertTriangle size={40} className="mx-auto text-yellow-400/60" />
              <p className="text-white/60 text-sm">{error}</p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={activeTab.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs text-white/70 transition-colors"
                >
                  <ExternalLink size={12} />
                  Open in new tab
                </a>
                <button
                  onClick={() => {
                    setReaderMode(true);
                    setError(null);
                    if (iframeRef.current) {
                      iframeRef.current.src = proxyUrl(activeTab.url, true);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-xs text-purple-300 transition-colors"
                >
                  <BookOpen size={12} />
                  Try reader mode
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {activeTab && (
          <iframe
            ref={iframeRef}
            src={currentProxySrc}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => {
              setTabs((prev) =>
                prev.map((t) => (t.id === activeTabId ? { ...t, loading: false } : t))
              );
            }}
            onError={handleIframeError}
            title={activeTab.title}
          />
        )}
      </div>
    </div>
  );
}
