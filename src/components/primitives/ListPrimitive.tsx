"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Circle } from "lucide-react";
import type { ListData, ListItem } from "@/lib/scene-v4-types";

function ListItemRow({ item, index, onSelect }: { item: ListItem; index: number; onSelect: (item: ListItem) => void }) {
  return (
    <motion.button
      className="w-full flex items-start gap-3 px-3 py-3 text-left border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] active:scale-[0.98] transition-all duration-150 cursor-pointer"
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      onClick={() => onSelect(item)}
      whileHover={{ x: 2 }}
    >
      {item.unread && (
        <Circle size={6} className="mt-2 flex-shrink-0 fill-[#00d4aa] text-[#00d4aa]" />
      )}
      {!item.unread && <div className="w-[6px] flex-shrink-0" />}

      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${item.unread ? "text-white/90 font-semibold" : "text-white/70"}`}>
          {item.title}
        </p>
        {item.subtitle && (
          <p className="text-xs text-white/40 truncate mt-0.5">{item.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {item.meta && <span className="text-[11px] text-white/25">{item.meta}</span>}
        {item.badge && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20">
            {item.badge}
          </span>
        )}
      </div>
    </motion.button>
  );
}

interface ListPrimitiveProps {
  data: ListData;
  onItemSelect?: (item: ListItem) => void;
}

export default function ListPrimitive({ data, onItemSelect }: ListPrimitiveProps) {
  const handleSelect = (item: ListItem) => {
    onItemSelect?.(item);
  };

  return (
    <div className="space-y-0 max-h-[50vh] overflow-y-auto scrollbar-thin">
      <AnimatePresence>
        {data.items.map((item, i) => (
          <ListItemRow key={item.id} item={item} index={i} onSelect={handleSelect} />
        ))}
      </AnimatePresence>
      {data.items.length === 0 && (
        <p className="text-[11px] text-white/25 text-center py-6">No items</p>
      )}
    </div>
  );
}
