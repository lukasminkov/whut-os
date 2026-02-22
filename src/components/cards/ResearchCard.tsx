"use client";
import { motion } from "framer-motion";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  image?: string;
}

export default function ResearchCard({ data }: { data: { results: SearchResult[] } }) {
  const results = data?.results || [];
  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
      {results.map((r, i) => (
        <motion.a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <div className="flex gap-3">
            {r.image && (
              <img
                src={r.image}
                alt=""
                className="w-16 h-16 rounded-md object-cover shrink-0 bg-white/[0.05]"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/80 group-hover:text-[#00d4aa] transition-colors line-clamp-1">
                {r.title}
              </div>
              <div className="text-[11px] text-white/30 truncate mt-0.5">
                {new URL(r.url).hostname}
              </div>
              <div className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed">
                {r.snippet}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}
