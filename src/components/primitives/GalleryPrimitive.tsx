"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GalleryData } from "@/lib/scene-v4-types";

function proxyImg(src: string) {
  if (src.startsWith("data:") || src.startsWith("/")) return src;
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

export default function GalleryPrimitive({ data }: { data: GalleryData }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <>
      <div className="space-y-2">
        {data.title && <h3 className="text-sm font-medium text-white/60 px-1">{data.title}</h3>}
        <div className="relative group">
          {/* Scroll buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>

          {/* Scrollable gallery */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {data.images.map((img, i) => (
              <div
                key={i}
                className="flex-shrink-0 snap-start rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:border-white/[0.15] transition group/img relative"
                style={{ width: data.images.length === 1 ? "100%" : "280px" }}
                onClick={() => setLightboxIdx(i)}
              >
                <div className="relative aspect-video">
                  <img
                    src={proxyImg(img.src)}
                    alt={img.alt || ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).className = "w-full h-full bg-white/[0.03]"; }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition flex items-center justify-center">
                    <Maximize2 size={16} className="text-white/0 group-hover/img:text-white/60 transition" />
                  </div>
                </div>
                {img.caption && (
                  <p className="text-[11px] text-white/40 px-3 py-2 truncate">{img.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightboxIdx(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 z-10"
              onClick={() => setLightboxIdx(null)}
            >
              <X size={18} />
            </button>
            {lightboxIdx > 0 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
              >
                <ChevronLeft size={24} />
              </button>
            )}
            {lightboxIdx < data.images.length - 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
              >
                <ChevronRight size={24} />
              </button>
            )}
            <motion.img
              key={lightboxIdx}
              src={proxyImg(data.images[lightboxIdx].src)}
              alt={data.images[lightboxIdx].alt || ""}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            />
            {data.images[lightboxIdx].caption && (
              <p className="absolute bottom-6 text-sm text-white/60 text-center max-w-lg">
                {data.images[lightboxIdx].caption}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
