"use client";

import { useEffect, useState, useRef, useSyncExternalStore, useCallback } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
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

function PrimitiveContent({ element, onListExpandChange }: { element: SceneElement; onListExpandChange?: (expanded: boolean, itemTitle?: string) => void }) {
  switch (element.type) {
    case "metric":       return <MetricPrimitive data={element.data} />;
    case "list":         return <ListPrimitive data={element.data} elementId={element.id} onExpandChange={onListExpandChange} />;
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

// ── Scene Element with Native Drag ──────────────────────

function SceneElementView({
  element, index, layout, isMobile,
}: {
  element: SceneElement; index: number; layout: Scene["layout"]; isMobile: boolean;
}) {
  const state = SceneManager.getState();
  const isMinimized = state.minimizedIds.has(element.id);
  const visibleElements = SceneManager.getVisibleElements();
  const gridProps = getElementGridProps(element, index, visibleElements.length, layout, isMobile);

  const offsetRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const expanded = SceneManager.getExpandedItem();
  const isExpanded = expanded?.elementId === element.id;
  const hasExpanded = expanded !== null;

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

  // Override grid props when expanded
  let finalGridProps = gridProps;
  if (isExpanded) {
    finalGridProps = { ...gridProps, gridColumn: "1 / -1", minHeight: "400px" };
  }

  return (
    <motion.div
      ref={elementRef}
      layout={!isDragging && offsetRef.current.x === 0 && offsetRef.current.y === 0}
      layoutId={element.id}
      style={{
        ...finalGridProps,
        zIndex: isDragging ? 100 : undefined,
        position: "relative",
        opacity: hasExpanded && !isExpanded ? 0.5 : 1,
        pointerEvents: "auto",
      }}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{
        opacity: hasExpanded && !isExpanded ? 0.5 : 1,
        y: 0,
        scale: hasExpanded && !isExpanded ? 0.95 : 1,
      }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{
        duration: 0.3,
        delay: index * 0.08,
        ease: [0.4, 0, 0.2, 1],
        layout: { type: "spring", damping: 25, stiffness: 200 },
      }}
    >
      <GlassPanel
        title={expandedTitle || element.title}
        priority={isExpanded ? 1 : element.priority}
        minimized={isMinimized}
        onDismiss={() => SceneManager.dismissElement(element.id)}
        onMinimize={() => SceneManager.minimizeElement(element.id)}
        isDragging={isDragging}
        onDragStart={(e) => {
          setIsDragging(true);
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
            setIsDragging(false);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
      >
        <PrimitiveContent element={element} onListExpandChange={handleListExpandChange} />
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
  const _dismissCount = sceneState.dismissedIds.size;
  const _minimizeCount = sceneState.minimizedIds.size;

  const [isMobile, setIsMobile] = useState(false);
  const prevSceneId = useRef(scene.id);

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
    } else {
      SceneManager.applyScene(scene, false);
    }
  }, [scene]);

  const visibleElements = SceneManager.getVisibleElements();
  const solved = solveLayout(visibleElements, scene.layout, isMobile);
  const maxWidth = getContentMaxWidth(scene.layout);

  if (visibleElements.length === 0) return null;

  return (
    <div className="relative z-30 w-full h-full overflow-y-auto flex flex-col">
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

      {/* Content grid — centered on screen */}
      <div className="relative z-10 px-4 md:px-8 pb-24 flex-1 min-h-0 flex items-center justify-center">
        <LayoutGroup>
          <div
            className="mx-auto w-full"
            style={{
              maxWidth,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : solved.columns,
              gridTemplateRows: isMobile ? "auto" : solved.rows,
              gap: isMobile ? "12px" : "16px",
              maxHeight: isMobile ? "none" : "calc(100vh - 200px)",
            }}
          >
            <AnimatePresence mode="popLayout">
              {visibleElements.map((el, i) => (
                <SceneElementView
                  key={el.id}
                  element={el}
                  index={i}
                  layout={scene.layout}
                  isMobile={isMobile}
                />
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}
