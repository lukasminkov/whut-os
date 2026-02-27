"use client";

import { Star } from "lucide-react";
import type { ComparisonTableData } from "@/lib/scene-v4-types";

function proxyImg(src: string | undefined) {
  if (!src) return undefined;
  if (src.startsWith("data:") || src.startsWith("/")) return src;
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

function isBest(value: string | number, allValues: (string | number)[], metric: string): boolean {
  const nums = allValues.map(v => typeof v === "number" ? v : parseFloat(String(v))).filter(n => !isNaN(n));
  if (nums.length === 0) return false;
  const numVal = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(numVal)) return false;
  // For price-like metrics, lower is better; otherwise higher is better
  const lowerBetter = /price|cost/i.test(metric);
  return lowerBetter ? numVal === Math.min(...nums) : numVal === Math.max(...nums);
}

export default function ComparisonTablePrimitive({ data }: { data: ComparisonTableData }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white/[0.04] backdrop-blur-xl border border-white/[0.06]">
      {data.title && (
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white/70">{data.title}</h3>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header with entity names + images */}
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="p-3 text-left text-xs text-white/30 font-normal w-[120px] min-w-[120px]" />
              {data.columns.map((col) => (
                <th key={col.name} className="p-3 text-center min-w-[140px]">
                  {col.image && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden mx-auto mb-2 bg-white/[0.03]">
                      <img
                        src={proxyImg(col.image)!}
                        alt={col.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                  <span className="text-white/80 font-medium text-xs">{col.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((metric, ri) => {
              const allValues = data.columns.map(c => c.values[metric]);
              return (
                <tr key={metric} className={ri % 2 === 0 ? "bg-white/[0.01]" : ""}>
                  <td className="p-3 text-xs text-white/40 font-medium">{metric}</td>
                  {data.columns.map((col) => {
                    const val = col.values[metric];
                    const best = data.highlightBest && isBest(val, allValues, metric);
                    // Render stars for rating-like values
                    const numVal = typeof val === "number" ? val : parseFloat(String(val));
                    const isRating = /rating|score|stars/i.test(metric) && !isNaN(numVal) && numVal <= 5;
                    return (
                      <td key={col.name} className="p-3 text-center">
                        {isRating ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star size={12} className={`${best ? "text-[#00d4aa] fill-[#00d4aa]" : "text-white/40 fill-white/20"}`} />
                            <span className={`text-xs ${best ? "text-[#00d4aa] font-semibold" : "text-white/60"}`}>
                              {numVal.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className={`text-xs ${best ? "text-[#00d4aa] font-semibold" : "text-white/60"}`}>
                            {val ?? "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
