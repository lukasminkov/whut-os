"use client";

import { useEffect, useState, useRef, useSyncExternalStore, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
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

function PrimitiveContent({ element, onListExpandChange, onListItemAction }: { element: SceneElement; onListExpandChange?: (expanded: boolean, itemTitle?: string) => void; onListItemAction?: (item: any) => void }) {
  switch (element.type) {
    case "metric":       return <MetricPrimitive data={element.data} />;
    case "list":         return <ListPrimitive data={element.data} elementId={element.id} onExpandChange={onListExpandChange} onItemAction={onListItemAction} />;
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

// ── Z-index counter for bring-to-front ──────────────────
let globalZCounter = 1;
function bringToFront() { return ++globalZCounter; }

// ── Scene Element with Focus & Drag ─────────────────────

function SceneElementView({
  element, index, layout, isMobile, focusedId, onItemAction,
}: {
  element: SceneElement; index: number; layout: Scene["layout"]; isMobile: boolean; focusedId: string | null; onItemAction?: (item: any, element: SceneElement) => void;
}) {
  const state = SceneManager.getState();
  const isMinimized = state.minimizedIds.has(element.id);
  const visibleElements = SceneManager.getVisibleElements();
  const gridProps = getElementGridProps(element, index, visibleElements.length, layout, isMobile, focusedId);

  const offsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const [zIndex, setZIndex] = useState(0);

  const expanded = SceneManager.getExpandedItem();
  const isExpanded = expanded?.elementId === element.id;

  const isFocused = focusedId === element.id;
  const hasFocus = focusedId !== null;
  const isDimmed = hasFocus && !isFocused;

  const [expandedTitle, setExpandedTitle] = useState<string | undefined>();

  const handleListExpandChange = (exp: boolean, itemTitle?: string) => {
    if (exp) {
      SceneManager.expandListItem(element.id, "");
      setExpandedTitle(itemTitle);
    } else {
      SceneManager.collapseListItem();
      setExpandedTitle(undefined);
    }
  };

  // Override grid props when list-expanded
  let finalGridProps = gridProps;
  if (isExpanded) {
    finalGridProps = { ...gridProps, gridColumn: "1 / -1", minHeight: "400px" };
  }

  const handleBringToFront = () => {
    setZIndex(bringToFront());
  };

  const handleFocus = () => {
    if (visibleElements.length <= 1) return; // No point focusing single panel
    SceneManager.focusElement(element.id);
  };

  return (
    <motion.div
      ref={elementRef}
      layout // Framer Motion layout animation for smooth reflow
      layoutId={element.id}
      style={{
        ...finalGridProps,
        zIndex: isFocused ? 10 : zIndex || undefined,
        position: "relative",
        pointerEvents: "auto",
        minWidth: 0,
        minHeight: 0,
      }}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isDimmed ? 0.97 : 1,
      }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.4, 0, 0.2, 1],
        layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
      }}
      onPointerDown={handleBringToFront}
    >
      <GlassPanel
        title={expandedTitle || element.title}
        priority={isFocused ? 1 : isExpanded ? 1 : element.priority}
        minimized={isMinimized}
        focused={isFocused}
        dimmed={isDimmed}
        onFocus={handleFocus}
        onDismiss={() => SceneManager.dismissElement(element.id)}
        onMinimize={() => SceneManager.minimizeElement(element.id)}
        isDragging={draggingRef.current}
        onDragStart={(e) => {
          draggingRef.current = true;
          setZIndex(bringToFront());
          const startX = e.clientX;
          const startY = e.clientY;
          const startOx = offsetRef.current.x;
          const startOy = offsetRef.current.y;

          const onMove = (ev: PointerEvent) => {
            offsetRef.current = {
              x: startOx + (ev.clientX - startX),
              y: startOy + (ev.clientY - startY),
            };
            if (elementRef.current) {
              elementRef.current.style.left = `${offsetRef.current.x}px`;
              elementRef.current.style.top = `${offsetRef.current.y}px`;
            }
          };
          const onUp = () => {
            draggingRef.current = false;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
      >
        <PrimitiveContent element={element} onListExpandChange={handleListExpandChange} onListItemAction={onItemAction ? (item: any) => onItemAction(item, element) : undefined} />
      </GlassPanel>
    </motion.div>
  );
}

// ── Main SceneRenderer V4 ───────────────────────────────

interface SceneRendererV4Props {
  scene: Scene;
  onClose?: () => void;
  onItemAction?: (item: any, element: SceneElement) => void;
}

export default function SceneRendererV4({ scene, onClose, onItemAction }: SceneRendererV4Props) {
  const sceneState = useSyncExternalStore(
    SceneManager.subscribe, SceneManager.getState, SceneManager.getState,
  );
  const _dismissCount = sceneState.dismissedIds.size;
  const _minimizeCount = sceneState.minimizedIds.size;

  const [isMobile, setIsMobile] = useState(false);
  const prevSceneId = useRef(scene.id);
  const gridRef = useRef<HTMLDivElement>(null);

  const focusedId = SceneManager.getFocusedId();

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
      // Clear focus when scene changes
      SceneManager.unfocusElement();
    } else {
      SceneManager.applyScene(scene, false);
    }
  }, [scene]);

  // Click outside any panel to unfocus
  useEffect(() => {
    if (!focusedId) return;
    const handler = (e: MouseEvent) => {
      // If click is on the grid background (not on a panel), unfocus
      if (gridRef.current && e.target === gridRef.current) {
        SceneManager.unfocusElement();
      }
    };
    // Also Escape to unfocus
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") SceneManager.unfocusElement();
    };
    window.addEventListener("click", handler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [focusedId]);

  const visibleElements = SceneManager.getVisibleElements();
  const solved = solveLayout(visibleElements, scene.layout, isMobile, focusedId);
  const maxWidth = getContentMaxWidth(scene.layout);

  if (visibleElements.length === 0) return null;

  return (
    <div className="relative z-30 w-full h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <motion.div
        className="relative z-10 flex items-center justify-between px-4 md:px-8 pt-5 pb-3 shrink-0"
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

      {/* Content grid — centered, auto-sizing */}
      <div className="relative z-10 px-4 md:px-8 pb-24 flex-1 min-h-0 flex items-start justify-center">
        <motion.div
          ref={gridRef}
          className="mx-auto w-full h-full"
          layout
          style={{
            maxWidth,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : solved.columns,
            gridTemplateRows: isMobile ? "auto" : solved.rows,
            gap: isMobile ? "12px" : "16px",
            maxHeight: isMobile ? "none" : "calc(100vh - 160px)",
            alignContent: "start",
          }}
          transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
        >
          <AnimatePresence mode="popLayout">
            {visibleElements.map((el, i) => (
              <SceneElementView
                key={el.id}
                element={el}
                index={i}
                layout={scene.layout}
                isMobile={isMobile}
                focusedId={focusedId}
                onItemAction={onItemAction}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
