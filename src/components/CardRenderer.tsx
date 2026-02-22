"use client";

import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Card } from "@/lib/card-types";
import { cardSizeToCss } from "@/lib/layout-engine";

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

function DraggableCard({
  card,
  onClose,
  onMinimize,
  index,
}: {
  card: Card;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  index: number;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const dragHandleRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    // Capture on the handle div, not the target (which could be a child)
    dragHandleRef.current?.setPointerCapture(e.pointerId);
  }, [offset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    });
  }, [dragging]);

  const onPointerUp = useCallback(() => setDragging(false), []);

  const { width, maxHeight } = cardSizeToCss(card.size);

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${card.position.x}%`,
        top: `${card.position.y}%`,
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        width,
        maxHeight,
        zIndex: dragging ? 100 : 10 + index,
      }}
      initial={{ opacity: 0, scale: 0.88, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      transition={{
        type: "spring",
        damping: 22,
        stiffness: 200,
        delay: index * 0.1,
      }}
    >
      <div
        className={`rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col ${
          card.minimized ? "" : "max-h-[inherit]"
        }`}
      >
        {/* Title bar — drag handle */}
        <div
          ref={dragHandleRef}
          className="flex items-center gap-2 px-4 py-2.5 cursor-grab active:cursor-grabbing select-none shrink-0 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="flex gap-1.5">
            <button
              onClick={() => onClose(card.id)}
              className="w-3 h-3 rounded-full bg-white/10 hover:bg-rose-500/60 transition-colors"
              title="Close"
            />
            <button
              onClick={() => onMinimize(card.id)}
              className="w-3 h-3 rounded-full bg-white/10 hover:bg-amber-500/60 transition-colors"
              title="Minimize"
            />
          </div>
          <span className="text-[11px] text-white/40 uppercase tracking-[0.15em] truncate flex-1 ml-2">
            {card.title || card.type}
          </span>
        </div>

        {/* Content */}
        {!card.minimized && (
          <motion.div
            className="px-4 pb-4 overflow-y-auto flex-1"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent card={card} />
          </motion.div>
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
    .map(c => ({ ...c, minimized: minimizedIds.has(c.id) }));

  return (
    <div className="absolute inset-0 z-30">
      {/* Close all button */}
      {onClose && (
        <motion.button
          onClick={onClose}
          className="absolute top-4 right-6 z-50 flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/60 transition-colors uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span>✕</span>
          <span>Close all</span>
        </motion.button>
      )}

      <AnimatePresence>
        {visibleCards.map((card, i) => (
          <DraggableCard
            key={card.id}
            card={card}
            index={i}
            onClose={handleClose}
            onMinimize={handleMinimize}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
