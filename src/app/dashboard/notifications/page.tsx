"use client";

import { Bell, Check } from "lucide-react";

const NOTIFICATIONS = [
  { id: 1, title: "TikTok Shop sync complete", description: "3,722 orders imported successfully", time: "2 hours ago", read: false },
  { id: 2, title: "Revenue milestone reached", description: "Monthly revenue crossed $50K", time: "1 day ago", read: false },
  { id: 3, title: "New creator application", description: "Sarah Chen applied to the program", time: "2 days ago", read: true },
  { id: 4, title: "Inventory alert", description: "Glow Serum Kit stock below 50 units", time: "3 days ago", read: true },
  { id: 5, title: "Campaign performance update", description: "Summer Drop campaign ROI increased to 3.4x", time: "5 days ago", read: true },
];

export default function NotificationsPage() {
  return (
    <div className="min-h-screen px-8 py-10 text-white max-w-2xl">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-white tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-white/40">
          {NOTIFICATIONS.filter((n) => !n.read).length} unread
        </p>
      </div>

      <div className="space-y-2">
        {NOTIFICATIONS.map((n) => (
          <div
            key={n.id}
            className={`group flex items-start gap-3 rounded-xl border p-4 transition-all duration-200 hover:bg-white/[0.04] ${
              n.read
                ? "border-white/[0.04] bg-transparent"
                : "border-white/[0.08] bg-white/[0.02]"
            }`}
          >
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              n.read ? "bg-white/[0.04]" : "bg-[#00d4aa]/10"
            }`}>
              <Bell className={`h-4 w-4 ${n.read ? "text-white/30" : "text-[#00d4aa]"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${n.read ? "text-white/50" : "text-white"}`}>
                  {n.title}
                </span>
                {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-[#00d4aa]" />}
              </div>
              <p className="text-xs text-white/35 mt-0.5">{n.description}</p>
              <p className="text-[10px] text-white/20 mt-1">{n.time}</p>
            </div>
            {!n.read && (
              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/60">
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
