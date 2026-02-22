"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { CardGridData } from "@/lib/visualization-tools";

function UnsplashImage({ query, alt }: { query: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const src = `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}`;

  return (
    <div className="relative w-full h-40 overflow-hidden rounded-t-xl bg-white/5">
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
      )}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs">
          No image
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`text-xs ${i <= Math.round(rating) ? "text-amber-400" : "text-white/20"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function CardGrid({ data }: { data: CardGridData }) {
  return (
    <div className="w-full">
      <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">
        {data.title}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.cards.map((card, i) => (
          <motion.div
            key={i}
            className="glass-card overflow-hidden group hover:border-white/20 transition-colors"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
          >
            <UnsplashImage query={card.imageQuery} alt={card.title} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{card.title}</h3>
                {card.rating && <Stars rating={card.rating} />}
              </div>
              {card.subtitle && (
                <div className="text-xs text-[#00d4aa] mt-1">{card.subtitle}</div>
              )}
              <p className="text-xs text-white/60 mt-2 line-clamp-3">
                {card.description}
              </p>
              {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {card.tags.map((tag, j) => (
                    <span
                      key={j}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
