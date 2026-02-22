"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ExternalLink,
  ArrowRight,
  LogOut,
} from "lucide-react";

type IntegrationStatus = "connected" | "available";

interface Integration {
  name: string;
  key: string; // localStorage key prefix
  description: string;
  category: "commerce" | "communication" | "productivity";
  defaultStatus: IntegrationStatus;
  logo: React.ReactNode;
  authUrl?: string; // OAuth start URL
}

/* ---------- Brand logos as clean SVGs ---------- */

const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.3 0 .59.04.86.12V9.01a6.27 6.27 0 00-.86-.06 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z" className="text-white/80"/>
  </svg>
);

const EmailLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
  </svg>
);

const GoogleDriveLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6">
    <path d="M4.433 22l-1.6-2.77L8.867 8.46h4.8L7.633 19.23z" fill="#0066DA"/>
    <path d="M19.567 22H10.4l2.4-4.154h9.6z" fill="#00AC47"/>
    <path d="M22.4 17.846L16.367 7.077h-4.8L17.6 17.846z" fill="#EA4335"/>
    <path d="M8.867 8.46L6.467 3.538h4.8L16.367 7.077z" fill="#00832D"/>
    <path d="M16.367 7.077l-4.8 8.385L8.867 8.46z" fill="#2684FC"/>
    <path d="M12.8 17.846l-2.4-4.154L16.367 7.077h-4.8z" fill="#FFBA00"/>
  </svg>
);

const GoogleCalendarLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6">
    <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4" opacity="0.9"/>
    <rect x="3" y="4" width="18" height="5" rx="2" fill="#1967D2"/>
    <rect x="7" y="11" width="3" height="3" rx="0.5" fill="white"/>
    <rect x="12" y="11" width="3" height="3" rx="0.5" fill="white"/>
    <rect x="7" y="16" width="3" height="3" rx="0.5" fill="white"/>
    <rect x="12" y="16" width="3" height="3" rx="0.5" fill="white" opacity="0.6"/>
    <rect x="8" y="2" width="2" height="4" rx="1" fill="#1967D2"/>
    <rect x="14" y="2" width="2" height="4" rx="1" fill="#1967D2"/>
  </svg>
);

const INTEGRATIONS: Integration[] = [
  {
    name: "Email (Gmail)",
    key: "google",
    description: "Read and send emails via Gmail",
    category: "communication",
    defaultStatus: "available",
    logo: <EmailLogo />,
    authUrl: "/api/auth/google",
  },
  {
    name: "Google Calendar",
    key: "google",
    description: "Upcoming events and schedule",
    category: "productivity",
    defaultStatus: "available",
    logo: <GoogleCalendarLogo />,
    authUrl: "/api/auth/google",
  },
  {
    name: "Google Drive",
    key: "google",
    description: "Sync documents and spreadsheets",
    category: "productivity",
    defaultStatus: "available",
    logo: <GoogleDriveLogo />,
    authUrl: "/api/auth/google",
  },
  {
    name: "TikTok Shop",
    key: "tiktok",
    description: "Track creator sales and commissions",
    category: "commerce",
    defaultStatus: "available",
    logo: <TikTokLogo />,
    authUrl: "/api/auth/tiktok",
  },
];

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; className: string; dot: string }> = {
  connected: {
    label: "Connected",
    className: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  available: {
    label: "Available",
    className: "text-white/40",
    dot: "bg-white/20",
  },
  // Future statuses can be added here
};

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "commerce", label: "Commerce" },
  { key: "communication", label: "Communication" },
  { key: "productivity", label: "Productivity" },
] as const;

// Keys that indicate a real OAuth connection
const TOKEN_KEYS: Record<string, string> = {
  tiktok: "tiktok_access_token",
  google: "whut_google_tokens",
};

function getConnectionStatus(integration: Integration): IntegrationStatus {
  if (typeof window === "undefined") return integration.defaultStatus;
  const tokenKey = TOKEN_KEYS[integration.key];
  if (tokenKey && localStorage.getItem(tokenKey)) {
    return "connected";
  }
  return integration.defaultStatus;
}

export default function IntegrationsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const searchParams = useSearchParams();

  // Process OAuth callback tokens from URL params
  const processCallbackTokens = useCallback(() => {
    if (typeof window === "undefined") return;

    // TikTok callback
    if (searchParams.get("tiktok_connected") === "true") {
      const token = searchParams.get("tiktok_access_token");
      const refresh = searchParams.get("tiktok_refresh_token");
      const expires = searchParams.get("tiktok_expires_at");
      if (token) {
        localStorage.setItem("tiktok_access_token", token);
        if (refresh) localStorage.setItem("tiktok_refresh_token", refresh);
        if (expires) localStorage.setItem("tiktok_expires_at", expires);
      }
    }

    // Clean URL after processing
    if (searchParams.get("tiktok_connected")) {
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
  }, [searchParams]);

  // Process Google OAuth tokens from URL hash
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("google_tokens=")) {
      const encoded = hash.split("google_tokens=")[1];
      try {
        const tokens = JSON.parse(decodeURIComponent(encoded));
        localStorage.setItem("whut_google_tokens", JSON.stringify(tokens));
        window.history.replaceState({}, "", "/dashboard/integrations");
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    processCallbackTokens();
    // Build status map
    const map: Record<string, IntegrationStatus> = {};
    for (const i of INTEGRATIONS) {
      map[i.key] = getConnectionStatus(i);
    }
    setStatuses(map);
  }, [processCallbackTokens]);

  const handleConnect = (integration: Integration) => {
    if (integration.authUrl) {
      window.location.href = integration.authUrl;
    }
  };

  const handleDisconnect = (integration: Integration) => {
    const tokenKey = TOKEN_KEYS[integration.key];
    if (!tokenKey) return;

    // Clear all stored data for this integration
    const prefix = integration.key;
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith(`${prefix}_`));
    keysToRemove.forEach(k => localStorage.removeItem(k));

    setStatuses(prev => ({ ...prev, [integration.key]: integration.defaultStatus }));
  };

  const getStatus = (integration: Integration): IntegrationStatus => {
    return statuses[integration.key] || integration.defaultStatus;
  };

  const filtered = INTEGRATIONS;

  const connectedCount = INTEGRATIONS.filter((i) => getStatus(i) === "connected").length;

  return (
    <div className="min-h-screen px-8 py-10 text-white max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-white tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-white/40">
          {connectedCount} of {INTEGRATIONS.length} connected
        </p>
      </div>

      {/* Category filters removed — only 4 integrations */}

      {/* Error display */}
      {searchParams.get("error") && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Connection failed: {searchParams.get("error")}
          {searchParams.get("msg") && ` — ${searchParams.get("msg")}`}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((integration) => {
          const currentStatus = getStatus(integration);
          const status = STATUS_CONFIG[currentStatus];
          const isOAuthConnected = TOKEN_KEYS[integration.key] && currentStatus === "connected";

          return (
            <div
              key={integration.name}
              className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.1]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05]">
                    {integration.logo}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{integration.name}</div>
                    <div className="text-xs text-white/35 mt-0.5">{integration.description}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  <span className={`text-xs ${status.className}`}>{status.label}</span>
                </div>

                {currentStatus === "connected" && isOAuthConnected ? (
                  <button
                    onClick={() => handleDisconnect(integration)}
                    className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    Disconnect
                    <LogOut className="h-3 w-3" />
                  </button>
                ) : currentStatus === "connected" ? (
                  <button className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                    Configure
                    <ExternalLink className="h-3 w-3" />
                  </button>
                ) : currentStatus === "available" && integration.authUrl ? (
                  <button
                    onClick={() => handleConnect(integration)}
                    className="flex items-center gap-1 rounded-md bg-white/[0.06] px-2.5 py-1 text-xs text-white/60 hover:bg-white/[0.1] hover:text-white transition-all"
                  >
                    Connect
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ) : currentStatus === "available" ? (
                  <button className="flex items-center gap-1 rounded-md bg-white/[0.06] px-2.5 py-1 text-xs text-white/60 hover:bg-white/[0.1] hover:text-white transition-all">
                    Connect
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
