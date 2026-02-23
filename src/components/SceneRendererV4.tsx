"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Scene, SceneElement, PrimitiveType } from "@/lib/scene-v4-types";
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
  ImagePrimitive,
  TablePrimitive,
  TimelinePrimitive,
  SearchResultsPrimitive,
  EmbedPrimitive,
} from "./primitives";

// ── Primitive Dispatcher ────────────────────────────────

function PrimitiveContent({ element }: { element: SceneElement }) {
  switch (element.type) {
    case "metric":
      return <MetricPrimitive data={element.data} />;
    case "list":
      return <ListPrimitive data={element.data} />;
    case "detail":
      return <DetailPrimitive data={element.data} />;
    case "text":
      return <TextPrimitive data={element.data} />;
    case "chart-line":
      return <ChartLinePrimitive data={element.data} />;
    case "chart-bar":
      return <ChartBarPrimitive data={element.data} />;
    case "chart-radial":
      return <ChartRadialPrimitive data={element.data} />;
    case "image":
      return <ImagePrimitive data={element.data} />;
    case "table":
      return <TablePrimitive data={element.data} />;
    case "timeline":
      return <TimelinePrimitive data={element.data} />;
    case "search-results":
      return <SearchResultsPrimitive data={element.data} />;
    case "embed":
      return <EmbedPrimitive data={element.data} />;
    default:
      return <p className="text-xs text-white/30">Unknown primitive: {element.type}</p>;
  }
}

// ── Single Element ──────────────────────────────────────

function SceneElementView({
  element,
  index,
  total,
  layout,
  isMobile,
}: {
  element: SceneElement;
  index: number;
  total: number;
  layout: Scene["layout"];
  isMobile: boolean;
}) {
  const state = SceneManager.getState();
  const isMinimized = state.minimizedIds.has(element.id);
  const gridProps = getElementGridProps(element, index, total, layout, isMobile);

  return (
    <motion.div
      layout
      style={gridProps}
      initial={{ opacity: 0, scale: 0.95, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{
        type: "spring",
        damping: 24,
        stiffness: 200,
        delay: index * 0.06,
      }}
    >
      <GlassPanel
        title={element.title}
        priority={element.priority}
        minimized={isMinimized}
        onDismiss={() => SceneManager.dismissElement(element.id)}
        onMinimize={() => SceneManager.minimizeElement(element.id)}
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
  // Subscribe to SceneManager state changes
  const sceneState = useSyncExternalStore(
    SceneManager.subscribe,
    SceneManager.getState,
    SceneManager.getState,
  );

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Apply scene on mount/change
  useEffect(() => {
    SceneManager.applyScene(scene);
  }, [scene]);

  const visibleElements = SceneManager.getVisibleElements();
  const solved = solveLayout(visibleElements, scene.layout, isMobile);
  const maxWidth = getContentMaxWidth(scene.layout);

  if (visibleElements.length === 0) return null;

  return (
    <div className="relative z-30 w-full h-full overflow-y-auto">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between px-6 md:px-8 pt-5 pb-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <div className="hidden md:block w-[80px] shrink-0" />
          {scene.intent && (
            <span className="text-[11px] uppercase tracking-[0.25em] text-white/30 truncate">
              {scene.intent}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/60 transition-colors uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            <X size={10} />
            <span>Close all</span>
          </button>
        )}
      </motion.div>

      {/* Content grid */}
      <div className="px-4 md:px-8 pb-24">
        <div
          className="mx-auto"
          style={{
            maxWidth,
            display: "grid",
            gridTemplateColumns: solved.columns,
            gridTemplateRows: solved.rows,
            gap: "16px",
          }}
        >
          <AnimatePresence mode="popLayout">
            {visibleElements.map((el, i) => (
              <SceneElementView
                key={el.id}
                element={el}
                index={i}
                total={visibleElements.length}
                layout={scene.layout}
                isMobile={isMobile}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
