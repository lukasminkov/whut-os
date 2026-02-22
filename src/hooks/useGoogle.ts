"use client";
import { useCallback, useEffect, useState } from "react";

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
}

const STORAGE_KEY = "whut_google_tokens";

export function useGoogleAuth() {
  const [tokens, setTokens] = useState<GoogleTokens | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setTokens(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  // Check URL hash for tokens from OAuth callback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("google_tokens=")) {
      const encoded = hash.split("google_tokens=")[1];
      try {
        const t = JSON.parse(decodeURIComponent(encoded));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
        setTokens(t);
        // Clean hash
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch { /* ignore */ }
    }
  }, []);

  const connect = useCallback(() => {
    window.location.href = "/api/auth/google";
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTokens(null);
  }, []);

  const isConnected = !!tokens?.access_token;
  const isExpired = tokens ? tokens.expires_at < Date.now() : false;

  // Helper to update tokens if API returns refreshed ones
  const updateTokens = useCallback((data: { new_access_token?: string; new_expires_at?: number }) => {
    if (data.new_access_token && tokens) {
      const updated = { ...tokens, access_token: data.new_access_token, expires_at: data.new_expires_at || Date.now() + 3600000 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTokens(updated);
    }
  }, [tokens]);

  const fetchGoogle = useCallback(async (endpoint: string) => {
    if (!tokens) throw new Error("Not connected");
    const res = await fetch(endpoint, {
      headers: {
        "x-google-access-token": tokens.access_token,
        "x-google-refresh-token": tokens.refresh_token || "",
      },
    });
    const data = await res.json();
    if (data.new_access_token) updateTokens(data);
    return data;
  }, [tokens, updateTokens]);

  return { tokens, isConnected, isExpired, loading, connect, disconnect, fetchGoogle };
}
