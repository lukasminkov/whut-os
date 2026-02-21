"use client";

const INTEGRATIONS = [
  { name: "Shopify", icon: "🛍️" },
  { name: "Amazon", icon: "📦" },
  { name: "TikTok Shop", icon: "🎵" },
  { name: "Slack", icon: "💬" },
  { name: "Discord", icon: "👾" },
  { name: "Email", icon: "✉️" },
  { name: "Google Drive", icon: "📁" },
  { name: "Canva", icon: "🎨" },
];

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen px-6 py-10 text-white">
      <div className="mb-6 text-xs uppercase tracking-[0.35em] text-white/50">Integrations</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.name}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-xl shadow-[0_0_40px_rgba(0,212,170,0.05)]"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{integration.icon}</span>
              <div>
                <div className="text-sm font-semibold text-white">{integration.name}</div>
                <div className="text-xs text-emerald-300">Connected ✅</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
