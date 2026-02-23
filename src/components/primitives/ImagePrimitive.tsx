"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2 } from "lucide-react";
import type { ImageData } from "@/lib/scene-v4-types";

interface ImagePrimitiveProps {
  data: ImageData;
}

export default function ImagePrimitive({ data }: ImagePrimitiveProps) {
  const [lightbox, setLightbox] = useState(false);
  const src = data.src.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(data.src)}` : data.src;

  return (
    <>
      <div className="space-y-2">
        <div
          className="relative group/img cursor-pointer rounded-lg overflow-hidden bg-white/[0.03]"
          onClick={() => setLightbox(true)}
        >
          <img
            src={src}
            alt={data.alt || ""}
            className="w-full h-auto max-h-[300px] object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center">
            <Maximize2 size={20} className="text-white/0 group-hover/img:text-white/70 transition-colors" />
          </div>
        </div>
        {data.caption && (
          <p className="text-xs text-white/40 text-center">{data.caption}</p>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
              onClick={() => setLightbox(false)}
            >
              <X size={18} />
            </button>
            <motion.img
              src={src}
              alt={data.alt || ""}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
