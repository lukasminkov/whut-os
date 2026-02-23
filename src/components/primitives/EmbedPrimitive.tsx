"use client";

import type { EmbedData } from "@/lib/scene-v4-types";

interface EmbedPrimitiveProps {
  data: EmbedData;
}

export default function EmbedPrimitive({ data }: EmbedPrimitiveProps) {
  if (data.html) {
    return (
      <iframe
        srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;padding:16px;font-family:system-ui;font-size:14px;color:#e0e0e0;background:#080808;line-height:1.6}a{color:#00d4aa}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{padding:6px 10px;border:1px solid rgba(255,255,255,0.08)}</style></head><body>${data.html}</body></html>`}
        className="w-full min-h-[250px] rounded-lg border border-white/[0.06] bg-black/30"
        sandbox="allow-same-origin"
        title={data.title || "Embedded content"}
      />
    );
  }

  if (data.url) {
    return (
      <iframe
        src={data.url}
        className="w-full min-h-[300px] rounded-lg border border-white/[0.06] bg-black/30"
        sandbox="allow-scripts allow-same-origin"
        title={data.title || "Embedded content"}
      />
    );
  }

  return <p className="text-xs text-white/30">No content to embed</p>;
}
