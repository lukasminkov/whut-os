"use client";
import { useCallback, useEffect, useState } from "react";

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
}

export function useGoogleAuth() {
  const [tokens, setTokens] = useState<GoogleTokens | null>(null);
  const [loading, setLoading] = useState(true);

  // Load tokens from Supabase DB via API
  const loadTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/tokens?provider=google");
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      const integration = data.integrations?.[0];
      if (integration?.access_token) {
        setTokens({
          access_token: integration.access_token,
          refresh_token: integration.refresh_token || "",
          expires_at: integration.token_expires_at
            ? new Date(integration.token_expires_at).getTime()
            : Date.now() + 3600000,
          scope: (integration.scopes || []).join(" "),
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  // Handle OAuth redirect — tokens come via URL hash, already saved to DB by callback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("google_tokens=")) {
      const encoded = hash.split("google_tokens=")[1];
      try {
        const t = JSON.parse(decodeURIComponent(encoded));
        setTokens(t);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch { /* ignore */ }
    }
  }, []);

  const connect = useCallback(() => {
    window.location.href = "/api/auth/google";
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await fetch("/api/integrations/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      });
    } catch { /* ignore */ }
    setTokens(null);
  }, []);

  const isConnected = !!tokens?.access_token;
  const isExpired = tokens ? tokens.expires_at < Date.now() : false;

  const fetchGoogle = useCallback(async (endpoint: string) => {
    if (!tokens) throw new Error("Not connected");
    const res = await fetch(endpoint, {
      headers: {
        "x-google-access-token": tokens.access_token,
        "x-google-refresh-token": tokens.refresh_token || "",
      },
    });
    const data = await res.json();
    // If API returned refreshed tokens, reload from DB
    if (data.new_access_token) {
      setTokens(prev => prev ? {
        ...prev,
        access_token: data.new_access_token,
        expires_at: data.new_expires_at || Date.now() + 3600000,
      } : prev);
    }
    return data;
  }, [tokens]);

  return { tokens, isConnected, isExpired, loading, connect, disconnect, fetchGoogle };
}
