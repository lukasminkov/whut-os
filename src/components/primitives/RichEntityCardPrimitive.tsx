"use client";

import { useState } from "react";
import { Star, MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RichEntityCardData } from "@/lib/scene-v4-types";

function proxyImg(src: string | undefined) {
  if (!src) return undefined;
  if (src.startsWith("data:") || src.startsWith("/")) return src;
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

function RatingStars({ score, count, source }: { score: number; count?: number; source?: string }) {
  const full = Math.floor(score);
  const half = score - full >= 0.3;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={14}
            className={i < full ? "text-[#00d4aa] fill-[#00d4aa]" : i === full && half ? "text-[#00d4aa] fill-[#00d4aa]/50" : "text-white/20"}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-[#00d4aa]">{score.toFixed(1)}</span>
      {count != null && <span className="text-xs text-white/40">({count.toLocaleString()})</span>}
      {source && <span className="text-[10px] text-white/30">{source}</span>}
    </div>
  );
}

function PriceIndicator({ price }: { price: string }) {
  if (/^\$+$/.test(price)) {
    const level = price.length;
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className={`text-sm font-semibold ${i < level ? "text-amber-300" : "text-white/15"}`}>$</span>
        ))}
      </div>
    );
  }
  return <span className="text-sm text-amber-300 font-medium">{price}</span>;
}

export default function RichEntityCardPrimitive({ data }: { data: RichEntityCardData }) {
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const heroSrc = proxyImg(data.heroImage);

  return (
    <div className="rounded-2xl overflow-hidden bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.12] transition-all group">
      {/* Hero Image */}
      {heroSrc && (
        <div className="relative w-full aspect-video overflow-hidden bg-white/[0.02]">
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-white/[0.04]" />}
          <img
            src={heroSrc}
            alt={data.title}
            className={`w-full h-full object-cover transition-all duration-700 ${imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; setImgLoaded(true); }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {data.price && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
              <PriceIndicator price={data.price} />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-white/90 leading-tight">{data.title}</h3>
          {data.subtitle && (
            <p className="text-sm text-white/50 mt-0.5 flex items-center gap-1">
              {data.location && <MapPin size={12} className="text-white/30" />}
              {data.subtitle}
            </p>
          )}
        </div>

        {/* Rating + Price row */}
        <div className="flex items-center gap-4 flex-wrap">
          {data.rating && <RatingStars score={data.rating.score} count={data.rating.count} source={data.rating.source} />}
          {data.price && !heroSrc && <PriceIndicator price={data.price} />}
        </div>

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag) => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-[#00d4aa]/10 text-[#00d4aa]/80 border border-[#00d4aa]/20">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description / Review snippet */}
        {(data.description || data.reviewSnippet) && (
          <p className="text-sm text-white/50 leading-relaxed line-clamp-2">
            {data.reviewSnippet ? `"${data.reviewSnippet}"` : data.description}
          </p>
        )}

        {/* Expandable highlights */}
        {data.highlights && data.highlights.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition cursor-pointer"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Less" : `${data.highlights.length} highlights`}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-1 overflow-hidden"
                >
                  {data.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-white/40 flex items-start gap-2">
                      <span className="text-[#00d4aa] mt-0.5">•</span> {h}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action buttons */}
        {data.actions && data.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {data.actions.map((action) => (
              <a
                key={action.label}
                href={action.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  action.type === "primary"
                    ? "bg-[#00d4aa]/20 text-[#00d4aa] hover:bg-[#00d4aa]/30 border border-[#00d4aa]/30"
                    : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] border border-white/[0.08]"
                }`}
              >
                {action.label}
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
