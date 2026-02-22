"use client";

import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Card } from "@/lib/card-types";

// Card content components
import StatCard from "./cards/StatCard";
import ChartCard from "./cards/ChartCard";
import EmailListCard from "./cards/EmailListCard";
import EmailComposeCard from "./cards/EmailComposeCard";
import EmailDetailCard from "./cards/EmailDetailCard";
import CalendarCard from "./cards/CalendarCard";
import ResearchCard from "./cards/ResearchCard";
import ContentCard from "./cards/ContentCard";
import FileListCard from "./cards/FileListCard";
import MarkdownCard from "./cards/MarkdownCard";
import ActionCard from "./cards/ActionCard";

function CardContent({ card }: { card: Card }) {
  switch (card.type) {
    case "stat": return <StatCard data={card.data} />;
    case "chart": return <ChartCard data={card.data} />;
    case "email-list": return <EmailListCard data={card.data} />;
    case "email-compose": return <EmailComposeCard data={card.data} />;
    case "email-detail": return <EmailDetailCard data={card.data} />;
    case "calendar": return <CalendarCard data={card.data} />;
    case "research": return <ResearchCard data={card.data} />;
    case "content": return <ContentCard data={card.data} />;
    case "file-list": return <FileListCard data={card.data} />;
    case "markdown": return <MarkdownCard data={card.data} />;
    case "action": return <ActionCard data={card.data} />;
    default: return <div className="text-xs text-white/30">Unknown card type</div>;
  }
}

/** Map card size to grid column span */
function sizeToSpan(size: string, totalCards: number): string {
  if (totalCards === 1) return "col-span-full";
  switch (size) {
    case "full": return "col-span-full";
    case "large": return "md:col-span-2";
    case "small": return "col-span-1";
    default: return "col-span-1"; // medium
  }
}

function SingleCard({
  card,
  onClose,
  onMinimize,
  index,
  totalCards,
}: {
  card: Card;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  index: number;
  totalCards: number;
}) {
  const span = sizeToSpan(card.size, totalCards);

  return (
    <motion.div
      className={`${span} min-w-0`}
      layout
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{
        type: "spring",
        damping: 24,
        stiffness: 220,
        delay: index * 0.08,
      }}
    >
      <div
        className={`rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col ${
          card.minimized ? "" : "max-h-[70vh]"
        }`}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 select-none shrink-0 border-b border-white/[0.04]">
          <div className="flex gap-1.5">
            <button
              onClick={() => onClose(card.id)}
              className="w-3 h-3 rounded-full bg-white/10 hover:bg-rose-500/60 transition-colors"
            />
            <button
              onClick={() => onMinimize(card.id)}
              className="w-3 h-3 rounded-full bg-white/10 hover:bg-amber-500/60 transition-colors"
            />
          </div>
          <span className="text-[11px] text-white/40 uppercase tracking-[0.15em] truncate flex-1 ml-2">
            {card.title || card.type}
          </span>
        </div>

        {/* Content */}
        {!card.minimized && (
          <div className="px-4 pb-4 pt-2 overflow-y-auto flex-1">
            <CardContent card={card} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface CardRendererProps {
  cards: Card[];
  onClose?: () => void;
}

export default function CardRenderer({ cards, onClose }: CardRendererProps) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(new Set());

  const handleClose = useCallback((id: string) => {
    setHiddenIds(prev => new Set(prev).add(id));
  }, []);

  const handleMinimize = useCallback((id: string) => {
    setMinimizedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleCards = cards
    .filter(c => !hiddenIds.has(c.id))
    .map(c => ({ ...c, minimized: minimizedIds.has(c.id) }))
    .sort((a, b) => a.priority - b.priority);

  // Determine grid columns based on card count
  const gridCols = visibleCards.length === 1
    ? "grid-cols-1"
    : visibleCards.length === 2
    ? "grid-cols-1 md:grid-cols-2"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="relative z-30 w-full h-full overflow-y-auto px-6 py-6">
      {/* Close all */}
      {onClose && visibleCards.length > 0 && (
        <motion.div
          className="flex justify-end mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/60 transition-colors uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            <span>✕</span>
            <span>Close all</span>
          </button>
        </motion.div>
      )}

      {/* Card grid */}
      <div className={`grid ${gridCols} gap-4 max-w-5xl mx-auto`}>
        <AnimatePresence mode="popLayout">
          {visibleCards.map((card, i) => (
            <SingleCard
              key={card.id}
              card={card}
              index={i}
              totalCards={visibleCards.length}
              onClose={handleClose}
              onMinimize={handleMinimize}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
