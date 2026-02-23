"use client";

import { useEffect, useState, useRef, useSyncExternalStore, lazy, Suspense } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { X } from "lucide-react";
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
import GridBackground from "./hud/GridBackground";
import ProcessingPulse from "./hud/ProcessingPulse";

// Lazy-load particles (heavy)
const ParticleBackground = lazy(() => import("./hud/ParticleBackground"));

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

// ── Single Element with layout animation ────────────────

function SceneElementView({
  element, index, total, layout, isMobile,
}: {
  element: SceneElement; index: number; total: number; layout: Scene["layout"]; isMobile: boolean;
}) {
  const state = SceneManager.getState();
  const isMinimized = state.minimizedIds.has(element.id);
  const gridProps = getElementGridProps(element, index, total, layout, isMobile);

  // Slide direction based on position
  const slideX = element.position === "left" ? -30 : element.position === "right" ? 30 : 0;

  return (
    <motion.div
      layout // framer-motion auto-layout animation for reflows
      layoutId={element.id}
      style={gridProps}
      initial={{ opacity: 0, scale: 0.93, x: slideX, y: slideX === 0 ? 20 : 0 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -12 }}
      transition={{
        type: "spring",
        damping: 22,
        stiffness: 180,
        delay: index * 0.07,
        layout: { type: "spring", damping: 20, stiffness: 150 },
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
  const sceneState = useSyncExternalStore(
    SceneManager.subscribe, SceneManager.getState, SceneManager.getState,
  );

  const [isMobile, setIsMobile] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const prevSceneId = useRef(scene.id);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Scene transition pulse
  useEffect(() => {
    if (prevSceneId.current !== scene.id) {
      setShowPulse(true);
      const t = setTimeout(() => setShowPulse(false), 900);
      prevSceneId.current = scene.id;
      return () => clearTimeout(t);
    }
    SceneManager.applyScene(scene);
  }, [scene]);

  useEffect(() => {
    SceneManager.applyScene(scene);
  }, [scene]);

  const visibleElements = SceneManager.getVisibleElements();
  const solved = solveLayout(visibleElements, scene.layout, isMobile);
  const maxWidth = getContentMaxWidth(scene.layout);

  if (visibleElements.length === 0) return null;

  return (
    <div className="relative z-30 w-full h-full overflow-y-auto">
      {/* Background layers */}
      <GridBackground />
      <Suspense fallback={null}>
        <ParticleBackground />
      </Suspense>

      {/* Processing pulse on scene change */}
      <AnimatePresence>{showPulse && <ProcessingPulse key="pulse" />}</AnimatePresence>

      {/* Header */}
      <motion.div
        className="relative z-10 flex items-center justify-between px-4 md:px-8 pt-5 pb-3"
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
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/60 transition-colors uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg hover:bg-white/[0.04]">
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
        </LayoutGroup>
      </div>
    </div>
  );
}
