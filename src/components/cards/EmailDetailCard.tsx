"use client";

export default function EmailDetailCard({ data }: { data: { id?: string; from?: string; to?: string; subject?: string; date?: string; body?: string } }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-xs text-white/30">From: <span className="text-white/60">{data?.from || "Unknown"}</span></div>
        <div className="text-xs text-white/30">To: <span className="text-white/60">{data?.to || ""}</span></div>
        <div className="text-xs text-white/30">Date: <span className="text-white/60">{data?.date || ""}</span></div>
      </div>
      <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar">
        {data?.body || "No content"}
      </div>
    </div>
  );
}
