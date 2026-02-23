"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { SearchResultsData } from "@/lib/scene-v4-types";

interface SearchResultsPrimitiveProps {
  data: SearchResultsData;
}

export default function SearchResultsPrimitive({ data }: SearchResultsPrimitiveProps) {
  return (
    <div className="space-y-3">
      {data.results.map((result, i) => (
        <motion.a
          key={i}
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors group/result"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          {result.image && (
            <img
              src={`/api/image-proxy?url=${encodeURIComponent(result.image)}`}
              alt=""
              className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-white/[0.04]"
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h4 className="text-sm text-white/80 group-hover/result:text-[#00d4aa] transition-colors line-clamp-1">
                {result.title}
              </h4>
              <ExternalLink size={12} className="text-white/20 flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{result.snippet}</p>
            <p className="text-[10px] text-[#00d4aa]/50 mt-1 truncate">{new URL(result.url).hostname}</p>
          </div>
        </motion.a>
      ))}
      {data.results.length === 0 && (
        <p className="text-xs text-white/30 text-center py-4">No results found</p>
      )}
    </div>
  );
}
