"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2 } from "lucide-react";
import type { ImageData } from "@/lib/scene-v4-types";

function resolveSource(src: string) {
  if (!src) return "";
  if (src.startsWith("data:")) return src; // base64
  if (src.startsWith("http")) return `/api/image-proxy?url=${encodeURIComponent(src)}`;
  return src; // relative/local
}

export default function ImagePrimitive({ data }: { data: ImageData }) {
  const [lightbox, setLightbox] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const src = resolveSource(data.src);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -y * 8, ry: x * 8 });
  }, []);

  const handleMouseLeave = useCallback(() => setTilt({ rx: 0, ry: 0 }), []);

  return (
    <>
      <div className="space-y-2">
        <motion.div
          ref={cardRef}
          className="relative group/img cursor-pointer rounded-lg overflow-hidden bg-white/[0.03]"
          onClick={() => setLightbox(true)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            perspective: 600,
            transformStyle: "preserve-3d",
          }}
          animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Blur-up placeholder */}
          {!loaded && (
            <div className="w-full h-[200px] animate-pulse bg-white/[0.04] backdrop-blur-sm" />
          )}
          <img
            src={src}
            alt={data.alt || ""}
            className={`w-full h-auto max-h-[300px] object-cover transition-all duration-500 ${
              loaded ? "opacity-100 blur-0" : "opacity-0 blur-md"
            }`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center">
            <Maximize2 size={20} className="text-white/0 group-hover/img:text-white/70 transition-colors" />
          </div>
        </motion.div>
        {data.caption && <p className="text-xs text-white/40 text-center">{data.caption}</p>}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
          >
            <button className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
              onClick={() => setLightbox(false)}>
              <X size={18} />
            </button>
            <motion.img src={src} alt={data.alt || ""}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
