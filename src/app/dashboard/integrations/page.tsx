"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ExternalLink,
  ArrowRight,
  LogOut,
} from "lucide-react";

type IntegrationStatus = "connected" | "available" | "coming_soon";

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

const ShopifyLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
    <path d="M15.34 3.04c-.07 0-.13.05-.14.12-.01.06-.3 1.82-.3 1.82s-.58-.17-.63-.18c-.36-.1-.72-.16-1.07-.16-.92 0-1.38.58-1.54 1.12-.12.38-.06.9.16 1.48.2.5.52.86.52.86s-.27.07-.56.28c-.29.2-.5.52-.5.98 0 .78.62 1.3 1.45 1.3.39 0 .72-.1.93-.2l-.08.46s-.56.17-1.26.17c-1.34 0-2.21-.88-2.21-2.16 0-.86.38-1.63 1.04-2.17.66-.55 1.56-.84 2.54-.84.56 0 1.06.1 1.44.28l.18-1.1s.01-.04.03-.06zM13.3 8.32c-.32 0-.58-.24-.58-.54 0-.3.26-.55.58-.55.32 0 .58.25.58.55 0 .3-.26.54-.58.54z" fill="currentColor" className="text-[#95BF47]"/>
    <path d="M17.05 5.25s-.42-.02-.74.04c-.33.06-.72.2-1.06.5-.34.3-.52.72-.52 1.18 0 .66.42 1.06.42 1.06s-.04.02-.1.06c-.06.04-.16.12-.16.28 0 .18.1.3.3.44l.46.3c.34.24.5.44.5.78 0 .62-.48 1.1-1.34 1.1-.7 0-1.14-.32-1.14-.32l.22-.68s.42.26.9.26c.34 0 .56-.16.56-.4 0-.18-.14-.32-.42-.52l-.44-.3c-.3-.22-.48-.48-.48-.84 0-.68.52-1.36 1.42-1.36.48 0 .78.12.78.12l-.16.5z" fill="currentColor" className="text-[#5E8E3E]"/>
    <path d="M16.9 3.27c-.03-.16-.17-.25-.3-.26-.12-.01-2.54-.06-2.54-.06s-1.68-1.64-1.86-1.82c-.18-.18-.53-.13-.67-.08-.02 0-.34.1-.88.28C10.24.48 9.58 0 8.7 0 6.9 0 5.97 2.24 5.68 3.37c-.77.24-1.32.41-1.39.43-.43.14-.45.15-.5.55C3.73 4.76 2.5 15.45 2.5 15.45l10.72 1.86L17.16 16s-3.84-12.56-3.86-12.65c0 0 3.6-.08 3.6-.08z" fill="currentColor" className="text-[#95BF47]"/>
  </svg>
);

const AmazonLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705a.66.66 0 01-.753.077c-1.06-.876-1.248-1.284-1.829-2.12-1.748 1.784-2.986 2.318-5.252 2.318-2.68 0-4.764-1.654-4.764-4.966 0-2.586 1.402-4.346 3.398-5.207 1.73-.761 4.147-.897 5.993-1.105v-.414c0-.761.059-1.662-.389-2.319-.39-.591-1.137-.835-1.797-.835-1.222 0-2.312.627-2.578 1.926-.054.289-.267.574-.559.588l-3.134-.338c-.263-.059-.556-.27-.48-.67C5.704 1.469 8.79.001 11.574.001c1.4 0 3.228.373 4.332 1.434 1.4 1.309 1.267 3.056 1.267 4.956v4.486c0 1.348.558 1.94 1.084 2.668.185.26.226.572-.012.765-.594.498-1.652 1.427-2.234 1.946l-.867-.461z" className="text-white/80"/>
    <path d="M21.708 18.168C19.162 20.108 15.42 21.15 12.2 21.15c-4.564 0-8.675-1.688-11.782-4.498-.244-.22-.026-.52.268-.35C4.008 18.59 8.06 19.788 12.268 19.788c2.75 0 5.772-.57 8.555-1.748.42-.179.772.276.385.584v-.456zm1.098-1.252c-.333-.428-2.208-.202-3.048-.102-.256.03-.295-.192-.064-.352 1.493-1.048 3.942-.746 4.228-.395.287.354-.076 2.806-1.476 3.978-.215.18-.42.084-.325-.154.315-.786 1.022-2.548.685-2.975z" className="text-[#FF9900]"/>
  </svg>
);

const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.3 0 .59.04.86.12V9.01a6.27 6.27 0 00-.86-.06 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z" className="text-white/80"/>
  </svg>
);

const SlackLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" className="text-[#E01E5A]"/>
    <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" className="text-[#36C5F0]"/>
    <path d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.528 2.528 0 01-2.52-2.521V2.522A2.528 2.528 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312z" className="text-[#2EB67D]"/>
    <path d="M15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.528 2.528 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.528 2.528 0 01-2.52-2.523 2.528 2.528 0 012.52-2.52h6.313A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" className="text-[#ECB22E]"/>
  </svg>
);

const DiscordLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#5865F2]" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/>
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

const NotionLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L2.84 2.298c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.933-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM1.936 1.035l13.31-.933c1.636-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.046-1.448-.094-1.962-.747L1.384 19.99c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.345-1.632z" className="text-white/80"/>
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

const CanvaLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6">
    <circle cx="12" cy="12" r="10" fill="#00C4CC"/>
    <path d="M15.5 10.5c-.2-1.5-1.3-2.5-2.8-2.5-2 0-3.2 1.8-3.2 4s1.2 4 3.2 4c1.5 0 2.6-1 2.8-2.5h-1.3c-.2.8-.7 1.3-1.5 1.3-1.2 0-1.8-1.2-1.8-2.8s.6-2.8 1.8-2.8c.8 0 1.3.5 1.5 1.3h1.3z" fill="white"/>
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
  coming_soon: {
    label: "Coming Soon",
    className: "text-white/25",
    dot: "bg-white/10",
  },
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
  slack: "slack_access_token",
  notion: "notion_access_token",
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

    // Slack callback
    if (searchParams.get("slack_connected") === "true") {
      const token = searchParams.get("slack_access_token");
      const teamName = searchParams.get("slack_team_name");
      if (token) {
        localStorage.setItem("slack_access_token", token);
        if (teamName) localStorage.setItem("slack_team_name", teamName);
      }
    }

    // Notion callback
    if (searchParams.get("notion_connected") === "true") {
      const token = searchParams.get("notion_access_token");
      const wsName = searchParams.get("notion_workspace_name");
      if (token) {
        localStorage.setItem("notion_access_token", token);
        if (wsName) localStorage.setItem("notion_workspace_name", wsName);
      }
    }

    // Clean URL after processing
    if (searchParams.get("tiktok_connected") || searchParams.get("slack_connected") || searchParams.get("notion_connected")) {
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

  const filtered = filter === "all"
    ? INTEGRATIONS
    : INTEGRATIONS.filter((i) => i.category === filter);

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

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-white/[0.04] w-fit">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === cat.key
                ? "bg-white/[0.1] text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

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
