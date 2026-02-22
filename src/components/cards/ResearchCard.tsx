"use client";
import { motion } from "framer-motion";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  image?: string;
}

function getFaviconUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return "";
  }
}

export default function ResearchCard({ data }: { data: { results?: SearchResult[]; query?: string } }) {
  const results = data?.results || [];
  const query = data?.query || "";

  if (results.length === 0) {
    return <div className="text-sm text-white/40">No results found.</div>;
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
      {query && (
        <div className="text-[11px] text-white/30 mb-3">
          Showing results for <span className="text-white/50">"{query}"</span>
        </div>
      )}
      {results.map((r, i) => (
        <motion.a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all group"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="flex gap-3">
            {/* Thumbnail or favicon */}
            <div className="shrink-0">
              {r.image ? (
                <img
                  src={r.image}
                  alt=""
                  className="w-20 h-14 rounded-lg object-cover bg-white/[0.05]"
                  onError={e => {
                    // Fall back to favicon
                    const el = e.target as HTMLImageElement;
                    el.src = getFaviconUrl(r.url);
                    el.className = "w-8 h-8 rounded mt-1";
                  }}
                />
              ) : (
                <img
                  src={getFaviconUrl(r.url)}
                  alt=""
                  className="w-8 h-8 rounded mt-1"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white/80 group-hover:text-[#00d4aa] transition-colors line-clamp-1">
                {r.title}
              </div>
              <div className="text-[10px] text-white/25 truncate mt-0.5">
                {(() => { try { return new URL(r.url).hostname.replace("www.", ""); } catch { return r.url; } })()}
              </div>
              <div className="text-xs text-white/45 mt-1.5 line-clamp-2 leading-relaxed">
                {r.snippet}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}
