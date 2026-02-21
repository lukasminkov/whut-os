"use client";

export default function SettingsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-lg space-y-6 p-6">
        <div className="text-xs uppercase tracking-[0.35em] text-white/50">Settings</div>
        
        {/* Account */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-medium text-white/70 mb-4">Account</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Name</span>
              <span className="text-white/80">John Doe</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Email</span>
              <span className="text-white/80">john@brand.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Plan</span>
              <span className="text-[#00d4aa]">Enterprise</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-medium text-white/70 mb-4">Notifications</h3>
          <div className="space-y-3 text-sm">
            {["Email alerts", "Campaign updates", "Creator activity", "Revenue reports"].map((item) => (
              <div key={item} className="flex justify-between items-center">
                <span className="text-white/50">{item}</span>
                <div className="w-10 h-5 rounded-full bg-[#00d4aa]/30 relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-[#00d4aa]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
