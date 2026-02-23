"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Circle, X } from "lucide-react";
import type { ListData, ListItem } from "@/lib/scene-v4-types";

function proxyImage(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("data:")) return src;
  if (src.startsWith("http")) return `/api/image-proxy?url=${encodeURIComponent(src)}`;
  return src;
}

function ExpandedItemView({ item, onClose }: { item: ListItem; onClose: () => void }) {
  const d = item.detail!;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden"
    >
      {d.image && (
        <div className="relative w-full h-[200px] rounded-xl overflow-hidden mb-4">
          <img src={proxyImage(d.image)!} alt={item.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <h3 className="text-lg font-semibold text-white/90 mb-1">{item.title}</h3>
      {item.subtitle && <p className="text-sm text-white/50 mb-3">{item.subtitle}</p>}

      {d.description && <p className="text-sm text-white/60 leading-relaxed mb-4">{d.description}</p>}

      <div className="flex flex-wrap gap-2 mb-3">
        {d.address && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] text-white/50">
            {d.address}
          </span>
        )}
        {d.rating && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] text-white/50">
            {d.rating}
          </span>
        )}
        {d.price && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] text-white/50">
            {d.price}
          </span>
        )}
        {d.tags?.map(tag => (
          <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-[#00d4aa]/10 text-[#00d4aa]/70 border border-[#00d4aa]/20">
            {tag}
          </span>
        ))}
      </div>

      {d.url && (
        <a href={d.url} target="_blank" rel="noopener noreferrer"
          className="text-[11px] text-[#00d4aa]/50 hover:text-[#00d4aa]/80 transition">
          View source →
        </a>
      )}

      {!d.image && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="mt-3 text-[11px] text-white/30 hover:text-white/60 transition cursor-pointer"
        >
          ← Back to list
        </button>
      )}
    </motion.div>
  );
}

function ListItemRow({ item, index, isCollapsed, onSelect }: { item: ListItem; index: number; isCollapsed: boolean; onSelect: (item: ListItem) => void }) {
  return (
    <motion.button
      className="w-full flex items-start gap-3 px-3 py-3 text-left border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] active:scale-[0.98] transition-all duration-150 cursor-pointer"
      initial={{ opacity: 0, x: -4 }}
      animate={{
        opacity: isCollapsed ? 0.5 : 1,
        x: 0,
        scale: isCollapsed ? 0.97 : 1,
      }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      onClick={() => onSelect(item)}
      whileHover={{ x: 2 }}
    >
      {item.image && (
        <img
          src={proxyImage(item.image)!}
          alt={item.title}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {item.unread && (
        <Circle size={6} className="mt-2 flex-shrink-0 fill-[#00d4aa] text-[#00d4aa]" />
      )}
      {!item.unread && !item.image && <div className="w-[6px] flex-shrink-0" />}

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
        {item.detail && (
          <span className="text-[11px] text-white/20">›</span>
        )}
      </div>
    </motion.button>
  );
}

interface ListPrimitiveProps {
  data: ListData;
  elementId?: string;
  onItemSelect?: (item: ListItem) => void;
  onExpandChange?: (expanded: boolean, itemTitle?: string) => void;
}

export default function ListPrimitive({ data, elementId, onItemSelect, onExpandChange }: ListPrimitiveProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const handleSelect = (item: ListItem) => {
    if (item.detail) {
      const newExpanded = expandedItemId === item.id ? null : item.id;
      setExpandedItemId(newExpanded);
      onExpandChange?.(newExpanded !== null, newExpanded ? item.title : undefined);
    }
    onItemSelect?.(item);
  };

  const handleClose = () => {
    setExpandedItemId(null);
    onExpandChange?.(false);
  };

  const expandedItem = expandedItemId ? data.items.find(i => i.id === expandedItemId) : null;

  return (
    <div className="space-y-0 max-h-[50vh] overflow-y-auto scrollbar-thin">
      <AnimatePresence mode="popLayout">
        {expandedItem ? (
          <ExpandedItemView key="expanded" item={expandedItem} onClose={handleClose} />
        ) : (
          data.items.map((item, i) => (
            <ListItemRow
              key={item.id}
              item={item}
              index={i}
              isCollapsed={false}
              onSelect={handleSelect}
            />
          ))
        )}
      </AnimatePresence>
      {!expandedItem && data.items.length === 0 && (
        <p className="text-[11px] text-white/25 text-center py-6">No items</p>
      )}
    </div>
  );
}
