"use client";

import { motion } from "framer-motion";
import type { DetailData } from "@/lib/scene-v4-types";

interface DetailPrimitiveProps {
  data: DetailData;
}

export default function DetailPrimitive({ data }: DetailPrimitiveProps) {
  const { title, subtitle, sections, meta } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base text-white/90 font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>

      {/* Meta */}
      {meta && Object.keys(meta).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(meta).map(([key, val]) => (
            <div key={key} className="text-xs">
              <span className="text-white/30">{key}: </span>
              <span className="text-white/60">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      {sections.map((section, i) => (
        <motion.div
          key={i}
          className="space-y-1.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">{section.label}</p>
          {section.type === "html" ? (
            <iframe
              srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;padding:12px;font-family:system-ui;font-size:13px;color:#e0e0e0;background:#0a0a0a;line-height:1.5}a{color:#00d4aa}img{max-width:100%}</style></head><body>${section.content}</body></html>`}
              className="w-full min-h-[200px] rounded-lg border border-white/[0.06] bg-black/30"
              sandbox="allow-same-origin"
              title={section.label}
            />
          ) : section.type === "code" ? (
            <pre className="text-xs text-white/60 bg-white/[0.03] rounded-lg p-3 overflow-x-auto font-mono">
              {section.content}
            </pre>
          ) : (
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{section.content}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
