"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { Check, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? null);
        setDisplayName(user.user_metadata?.display_name ?? user.user_metadata?.name ?? user.user_metadata?.full_name ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const saveName = useCallback(async () => {
    if (!dirty) return;
    const supabase = createClient();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });
    setSaving(false);
    if (!error) {
      setDirty(false);
      setSaved(true);
      // Also update localStorage profile for sidebar
      try {
        const stored = localStorage.getItem("whut_user_profile");
        const profile = stored ? JSON.parse(stored) : {};
        profile.name = displayName;
        localStorage.setItem("whut_user_profile", JSON.stringify(profile));
      } catch { /* ignore */ }
      setTimeout(() => setSaved(false), 2000);
    }
  }, [dirty, displayName]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-lg space-y-6 p-6">
        <div className="text-xs uppercase tracking-[0.35em] text-white/50">Settings</div>

        {/* Account */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-medium text-white/70 mb-4">Account</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-white/30">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {/* Display Name — editable */}
              <div className="space-y-1.5">
                <label className="text-white/40 text-xs">Display Name</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); setDirty(true); setSaved(false); }}
                    onBlur={saveName}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                    placeholder="Your name"
                    className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/90 placeholder-white/20 outline-none focus:border-[#00d4aa]/50 transition-colors"
                  />
                  {saving && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
                  {saved && <Check className="h-4 w-4 text-[#00d4aa]" />}
                </div>
              </div>
              {/* Email — read-only */}
              <div className="space-y-1.5">
                <label className="text-white/40 text-xs">Email</label>
                <div className="rounded-lg bg-white/5 border border-white/[0.06] px-3 py-2 text-sm text-white/60">
                  {email ?? "Not signed in"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications — coming soon */}
        <div className="rounded-2xl p-6 opacity-50" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/70">Notifications</h3>
            <span className="text-[10px] uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded-full">Coming soon</span>
          </div>
          <div className="space-y-3 text-sm">
            {["Email alerts", "Campaign updates", "Creator activity", "Revenue reports"].map((item) => (
              <div key={item} className="flex justify-between items-center">
                <span className="text-white/30">{item}</span>
                <div className="w-10 h-5 rounded-full bg-white/10 relative cursor-not-allowed">
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white/20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
