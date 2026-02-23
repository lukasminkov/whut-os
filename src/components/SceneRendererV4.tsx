"use client";

import { useEffect, useState, useRef, useSyncExternalStore, useCallback } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
import { DndContext, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import type { Scene, SceneElement } from "@/lib/scene-v4-types";
import { solveLayout, getElementGridProps, getContentMaxWidth } from "@/lib/layout-solver-v4";
import * as SceneManager from "@/lib/scene-manager";
import {
  GlassPanel,
  MetricPrimitive,
  ListPrimitive,
  DetailPrimitive,
  TextPrimitive,
  ChartLinePrimitive,
  ChartBarPrimitive,
  ChartRadialPrimitive,
  ChartRadarPrimitive,
  ChartCandlestickPrimitive,
  ChartGaugePrimitive,
  ImagePrimitive,
  TablePrimitive,
  TimelinePrimitive,
  SearchResultsPrimitive,
  EmbedPrimitive,
} from "./primitives";

// ── Primitive Dispatcher ────────────────────────────────

function PrimitiveContent({ element }: { element: SceneElement }) {
  switch (element.type) {
    case "metric":       return <MetricPrimitive data={element.data} />;
    case "list":         return <ListPrimitive data={element.data} />;
    case "detail":       return <DetailPrimitive data={element.data} />;
    case "text":         return <TextPrimitive data={element.data} />;
    case "chart-line":   return <ChartLinePrimitive data={element.data} />;
    case "chart-bar":    return <ChartBarPrimitive data={element.data} />;
    case "chart-radial": return <ChartRadialPrimitive data={element.data} />;
    case "chart-radar":  return <ChartRadarPrimitive data={element.data} />;
    case "chart-candlestick": return <ChartCandlestickPrimitive data={element.data} />;
    case "chart-gauge":  return <ChartGaugePrimitive data={element.data} />;
    case "image":        return <ImagePrimitive data={element.data} />;
    case "table":        return <TablePrimitive data={element.data} />;
    case "timeline":     return <TimelinePrimitive data={element.data} />;
    case "search-results": return <SearchResultsPrimitive data={element.data} />;
    case "embed":        return <EmbedPrimitive data={element.data} />;
    default:             return <p className="text-xs text-white/30">Unknown: {element.type}</p>;
  }
}

// ── Draggable Element ───────────────────────────────────

function DraggableSceneElement({
  element, index, layout, isMobile, dragOffset,
}: {
  element: SceneElement; index: number; layout: Scene["layout"]; isMobile: boolean;
  dragOffset?: { x: number; y: number };
}) {
  const state = SceneManager.getState();
  const isMinimized = state.minimizedIds.has(element.id);
  const visibleElements = SceneManager.getVisibleElements();
  const gridProps = getElementGridProps(element, index, visibleElements.length, layout, isMobile);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: element.id,
  });

  const tx = (transform?.x ?? 0) + (dragOffset?.x ?? 0);
  const ty = (transform?.y ?? 0) + (dragOffset?.y ?? 0);
  const hasOffset = tx !== 0 || ty !== 0;

  return (
    <motion.div
      ref={setNodeRef}
      layout={!isDragging}
      layoutId={element.id}
      style={{
        ...gridProps,
        transform: hasOffset ? `translate(${tx}px, ${ty}px)` : undefined,
        zIndex: isDragging ? 100 : undefined,
        position: "relative",
      }}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{
        duration: 0.3,
        delay: index * 0.08,
        ease: [0.4, 0, 0.2, 1],
        layout: { type: "spring", damping: 25, stiffness: 200 },
      }}
    >
      <GlassPanel
        title={element.title}
        priority={element.priority}
        minimized={isMinimized}
        onDismiss={() => SceneManager.dismissElement(element.id)}
        onMinimize={() => SceneManager.minimizeElement(element.id)}
        dragHandleRef={setActivatorNodeRef}
        isDragging={isDragging}
      >
        <PrimitiveContent element={element} />
      </GlassPanel>
    </motion.div>
  );
}

// ── Main SceneRenderer V4 ───────────────────────────────

interface SceneRendererV4Props {
  scene: Scene;
  onClose?: () => void;
}

export default function SceneRendererV4({ scene, onClose }: SceneRendererV4Props) {
  const sceneState = useSyncExternalStore(
    SceneManager.subscribe, SceneManager.getState, SceneManager.getState,
  );

  const [isMobile, setIsMobile] = useState(false);
  const prevSceneId = useRef(scene.id);
  const [dragOffsets, setDragOffsets] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (prevSceneId.current !== scene.id) {
      prevSceneId.current = scene.id;
      SceneManager.applyScene(scene);
      setDragOffsets(new Map()); // Reset offsets on new scene
    } else {
      SceneManager.applyScene(scene, false);
    }
  }, [scene]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    setDragOffsets(prev => {
      const next = new Map(prev);
      const existing = next.get(active.id as string) || { x: 0, y: 0 };
      next.set(active.id as string, { x: existing.x + delta.x, y: existing.y + delta.y });
      return next;
    });
  }, []);

  const visibleElements = SceneManager.getVisibleElements();
  const solved = solveLayout(visibleElements, scene.layout, isMobile);
  const maxWidth = getContentMaxWidth(scene.layout);

  if (visibleElements.length === 0) return null;

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="relative z-30 w-full h-full overflow-y-auto">
        {/* Header */}
        <motion.div
          className="relative z-10 flex items-center justify-between px-4 md:px-8 pt-5 pb-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            {SceneManager.canGoBack() && (
              <button onClick={() => SceneManager.goBack()}
                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-[0.15em] px-2 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer">
                <ArrowLeft size={10} /><span>Back</span>
              </button>
            )}
            {scene.intent && (
              <span className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-medium truncate">
                {scene.intent}
              </span>
            )}
          </div>
          {onClose && (
            <button onClick={onClose}
              className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/60 transition-colors uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer">
              <X size={10} /><span>Close all</span>
            </button>
          )}
        </motion.div>

        {/* Content grid */}
        <div className="relative z-10 px-4 md:px-8 pb-24">
          <LayoutGroup>
            <div
              className="mx-auto"
              style={{
                maxWidth,
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : solved.columns,
                gridTemplateRows: isMobile ? "auto" : solved.rows,
                gap: isMobile ? "12px" : "16px",
              }}
            >
              <AnimatePresence mode="popLayout">
                {visibleElements.map((el, i) => (
                  <DraggableSceneElement
                    key={el.id}
                    element={el}
                    index={i}
                    layout={scene.layout}
                    isMobile={isMobile}
                    dragOffset={dragOffsets.get(el.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        </div>
      </div>
    </DndContext>
  );
}
