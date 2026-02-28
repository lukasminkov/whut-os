"use client";

import { useEffect, useState, useRef, useSyncExternalStore, useCallback, useMemo } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
import type { Scene, SceneElement } from "@/lib/scene-v4-types";
import { solveHUDLayout, getContentMaxWidth, getContentSize, type HUDLayout, type ElementLayout } from "@/lib/layout-solver-v4";
import * as SceneManager from "@/lib/scene-manager";
import { screenContextStore } from "@/lib/screen-context";
import { ActionBar, AIOverlay, useElementActions } from "./ActionBar";
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
  RichEntityCardPrimitive,
  MapViewPrimitive,
  GalleryPrimitive,
  ComparisonTablePrimitive,
} from "./primitives";
import FeedbackWidget from "./FeedbackWidget";

// ── Card position/size manager for drag & resize ────────

interface CardTransform {
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  hasMoved: boolean;
}

function useCardTransforms() {
  const [transforms, setTransforms] = useState<Map<string, CardTransform>>(new Map());
  const zCounter = useRef(100);

  const bringToFront = useCallback((id: string) => {
    setTransforms(prev => {
      const next = new Map(prev);
      const t = next.get(id);
      zCounter.current += 1;
      if (t) {
        next.set(id, { ...t, zIndex: zCounter.current });
      }
      return next;
    });
  }, []);

  const startDrag = useCallback((id: string, startX: number, startY: number) => {
    bringToFront(id);
    return { startX, startY };
  }, [bringToFront]);

  const updatePosition = useCallback((id: string, dx: number, dy: number) => {
    setTransforms(prev => {
      const next = new Map(prev);
      const t = next.get(id) || { x: 0, y: 0, w: 0, h: 0, zIndex: 100, hasMoved: false };
      next.set(id, { ...t, x: t.x + dx, y: t.y + dy, hasMoved: true });
      return next;
    });
  }, []);

  const updateSize = useCallback((id: string, dw: number, dh: number) => {
    setTransforms(prev => {
      const next = new Map(prev);
      const t = next.get(id) || { x: 0, y: 0, w: 0, h: 0, zIndex: 100, hasMoved: false };
      next.set(id, { ...t, w: t.w + dw, h: t.h + dh, hasMoved: true });
      return next;
    });
  }, []);

  const getTransform = useCallback((id: string): CardTransform => {
    return transforms.get(id) || { x: 0, y: 0, w: 0, h: 0, zIndex: 100, hasMoved: false };
  }, [transforms]);

  return { getTransform, bringToFront, startDrag, updatePosition, updateSize };
}

// ── Primitive Dispatcher ────────────────────────────────

function PrimitiveContent({ element, onListExpandChange, onListItemAction, sendToAI }: { element: SceneElement; onListExpandChange?: (expanded: boolean, itemTitle?: string) => void; onListItemAction?: (item: any) => void; sendToAI?: (message: string) => void }) {
  switch (element.type) {
    case "metric":       return <MetricPrimitive data={element.data} />;
    case "list":         return <ListPrimitive data={element.data} elementId={element.id} onExpandChange={onListExpandChange} onItemAction={onListItemAction} />;
    case "detail":       return <DetailPrimitive data={element.data} sendToAI={sendToAI} />;
    case "text":         return <TextPrimitive data={element.data} />;
    case "chart-line":   return <ChartLinePrimitive data={element.data} sendToAI={sendToAI} />;
    case "chart-bar":    return <ChartBarPrimitive data={element.data} sendToAI={sendToAI} />;
    case "chart-radial": return <ChartRadialPrimitive data={element.data} />;
    case "chart-radar":  return <ChartRadarPrimitive data={element.data} />;
    case "chart-candlestick": return <ChartCandlestickPrimitive data={element.data} />;
    case "chart-gauge":  return <ChartGaugePrimitive data={element.data} />;
    case "image":        return <ImagePrimitive data={element.data} />;
    case "table":        return <TablePrimitive data={element.data} sendToAI={sendToAI} />;
    case "timeline":     return <TimelinePrimitive data={element.data} />;
    case "search-results": return <SearchResultsPrimitive data={element.data} />;
    case "embed":        return <EmbedPrimitive data={element.data} />;
    case "rich-entity-card": return <RichEntityCardPrimitive data={element.data} />;
    case "map-view":     return <MapViewPrimitive data={element.data} sendToAI={sendToAI} />;
    case "gallery":      return <GalleryPrimitive data={element.data} />;
    case "comparison-table": return <ComparisonTablePrimitive data={element.data} />;
    default:             return <p className="text-xs text-white/30">Unknown: {element.type}</p>;
  }
}

// ── Spring animation configs ────────────────────────────

const springTransition = {
  type: "spring" as const,
  stiffness: 200,
  damping: 28,
  mass: 0.8,
};

const gentleSpring = {
  type: "spring" as const,
  stiffness: 150,
  damping: 24,
  mass: 1,
};

// ── Resize Handle ───────────────────────────────────────

function ResizeHandle({ onResize }: { onResize: (dw: number, dh: number) => void }) {
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    onResize(dx, dy);
  }, [onResize]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 group/resize"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" className="absolute bottom-1 right-1 opacity-0 group-hover/resize:opacity-40 transition-opacity text-white">
        <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ── HUD Element (Absolute positioned) ───────────────────

function HUDElement({
  element,
  index,
  elementLayout,
  isMobile,
  focusedId,
  totalElements,
  onItemAction,
  sendToAI,
  onPromote,
  mouseX,
  mouseY,
  userQuery,
  cardTransform,
  onBringToFront,
  onDragMove,
  onResize,
}: {
  element: SceneElement;
  index: number;
  elementLayout: ElementLayout;
  isMobile: boolean;
  focusedId: string | null;
  totalElements: number;
  onItemAction?: (item: any, element: SceneElement) => void;
  sendToAI?: (message: string) => void;
  onPromote: (id: string) => void;
  mouseX: number;
  mouseY: number;
  userQuery?: string;
  cardTransform?: CardTransform;
  onBringToFront?: () => void;
  onDragMove?: (dx: number, dy: number) => void;
  onResize?: (dw: number, dh: number) => void;
}) {
  const state = SceneManager.getState();
  const isMinimized = state.minimizedIds.has(element.id);
  const [isHovered, setIsHovered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onBringToFront?.();
  }, [onBringToFront]);

  const handleDragPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    onDragMove?.(dx, dy);
  }, [onDragMove]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  const feedbackWidget = (
    <FeedbackWidget
      containerRef={panelRef}
      visualizationType={element.type}
      userQuery={userQuery}
      aiResponseSummary={element.title}
    />
  );

  const {
    config: actionConfig,
    context: actionContext,
    actions: elementActions,
    aiActions: elementAIActions,
    overlayContent,
    clearOverlay,
    hasActions,
  } = useElementActions({
    elementId: element.id,
    elementType: element.type,
    data: element.data,
    title: element.title,
    sendToAI,
  });

  const expanded = SceneManager.getExpandedItem();
  const isExpanded = expanded?.elementId === element.id;
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

  const isCenter = elementLayout.role === "center" || elementLayout.role === "cinematic-main";
  const isOrbital = elementLayout.role === "orbital";
  const isCinematicOverlay = elementLayout.role === "cinematic-overlay";

  // Parallax offset for orbital elements (subtle mouse tracking)
  const parallaxX = isOrbital ? (mouseX - 0.5) * 12 : 0;
  const parallaxY = isOrbital ? (mouseY - 0.5) * 8 : 0;

  // Hover scale boost for orbitals
  const hoverScale = isOrbital && isHovered ? 0.55 : elementLayout.scale;
  const hoverOpacity = isOrbital && isHovered ? 0.95 : elementLayout.opacity;

  // For stack/grid modes, use flow layout with drag/resize
  if (elementLayout.role === "stack" || elementLayout.role === "grid") {
    const contentSize = getContentSize(element);
    const isWideType = ["list", "table", "map-view", "comparison-table", "search-results", "timeline", "detail", "text"].includes(element.type);
    const spanFull = elementLayout.role === "grid" && isWideType && totalElements > 1;
    const ct = cardTransform || { x: 0, y: 0, w: 0, h: 0, zIndex: 100, hasMoved: false };

    return (
      <motion.div
        layoutId={ct.hasMoved ? undefined : element.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
        transition={{ ...gentleSpring, delay: index * 0.04 }}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragEnd}
        onClick={() => onBringToFront?.()}
        style={{
          width: ct.hasMoved ? undefined : "100%",
          minHeight: `${Math.max(contentSize.minHeight, 120) + ct.h}px`,
          minWidth: `${Math.max(250 + ct.w, 250)}px`,
          gridColumn: spanFull ? "1 / -1" : undefined,
          maxWidth: elementLayout.role === "stack" ? "800px" : undefined,
          margin: elementLayout.role === "stack" ? "0 auto" : undefined,
          position: ct.hasMoved ? "relative" : undefined,
          left: ct.hasMoved ? `${ct.x}px` : undefined,
          top: ct.hasMoved ? `${ct.y}px` : undefined,
          zIndex: ct.zIndex,
        }}
      >
        <div ref={panelRef} className="relative h-full">
          <GlassPanel
            title={expandedTitle || element.title}
            priority={element.priority}
            minimized={isMinimized}
            focused={false}
            dimmed={false}
            variant="default"
            titleBarExtra={feedbackWidget}
            staggerIndex={index}
            onDismiss={() => SceneManager.dismissElement(element.id)}
            onMinimize={() => SceneManager.minimizeElement(element.id)}
            onDragStart={handleDragStart}
          >
            <PrimitiveContent element={element} onListExpandChange={handleListExpandChange} onListItemAction={onItemAction ? (item: any) => onItemAction(item, element) : undefined} sendToAI={sendToAI} />
            {hasActions && actionContext && <ActionBar actions={elementActions} aiActions={elementAIActions} context={actionContext} className="mt-2" />}
            {actionContext && <AIOverlay content={overlayContent} onClose={clearOverlay} onSendToChat={(c) => { sendToAI?.(c); clearOverlay(); }} onCopy={(c) => { navigator.clipboard?.writeText(c); clearOverlay(); }} />}
          </GlassPanel>
          {onResize && <ResizeHandle onResize={onResize} />}
        </div>
      </motion.div>
    );
  }

  // Absolute positioned elements (focus/cinematic modes)
  return (
    <motion.div
      layoutId={element.id}
      style={{
        position: "absolute",
        left: elementLayout.x,
        top: elementLayout.y,
        width: elementLayout.width,
        height: elementLayout.height === "auto" ? "auto" : elementLayout.height,
        zIndex: isHovered && isOrbital ? elementLayout.zIndex + 5 : elementLayout.zIndex,
        transform: "translate(-50%, -50%)",
        pointerEvents: "auto",
        cursor: isOrbital ? "pointer" : "default",
      }}
      initial={{
        opacity: 0,
        scale: isCenter ? 0.8 : 0.3,
        ...(isOrbital ? { x: (index % 2 === 0 ? -80 : 80), y: 40 } : {}),
      }}
      animate={{
        opacity: hoverOpacity,
        scale: hoverScale,
        x: parallaxX,
        y: parallaxY,
      }}
      exit={{
        opacity: 0,
        scale: isCenter ? 0.85 : 0.2,
        transition: { duration: 0.2 },
      }}
      transition={isCenter ? springTransition : { ...gentleSpring, delay: index * 0.06 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={(e) => {
        if (isOrbital && !(e.target as HTMLElement).closest("button")) {
          onPromote(element.id);
        }
      }}
    >
      <div style={{ width: "100%", height: "100%", maxHeight: isCenter ? "calc(100vh - 140px)" : undefined }}>
        <GlassPanel
          title={expandedTitle || element.title}
          priority={isCenter ? 1 : element.priority}
          minimized={isMinimized}
          focused={isCenter}
          dimmed={false}
          variant={isCenter ? "center" : isOrbital ? "orbital" : isCinematicOverlay ? "cinematic-overlay" : "default"}
          onFocus={isOrbital ? () => onPromote(element.id) : undefined}
          titleBarExtra={feedbackWidget}
          staggerIndex={index}
          onDismiss={() => SceneManager.dismissElement(element.id)}
          onMinimize={isCenter ? () => SceneManager.minimizeElement(element.id) : undefined}
        >
          <PrimitiveContent element={element} onListExpandChange={handleListExpandChange} onListItemAction={onItemAction ? (item: any) => onItemAction(item, element) : undefined} sendToAI={sendToAI} />
          {hasActions && actionContext && isCenter && (
            <ActionBar actions={elementActions} aiActions={elementAIActions} context={actionContext} className="mt-2" />
          )}
          {actionContext && isCenter && (
            <AIOverlay content={overlayContent} onClose={clearOverlay} onSendToChat={(c) => { sendToAI?.(c); clearOverlay(); }} onCopy={(c) => { navigator.clipboard?.writeText(c); clearOverlay(); }} />
          )}
        </GlassPanel>
      </div>
    </motion.div>
  );
}

// ── Main SceneRenderer V4 ───────────────────────────────

interface SceneRendererV4Props {
  scene: Scene;
  onClose?: () => void;
  onItemAction?: (item: any, element: SceneElement) => void;
  sendToAI?: (message: string) => void;
}

export default function SceneRendererV4({ scene, onClose, onItemAction, sendToAI }: SceneRendererV4Props) {
  const sceneState = useSyncExternalStore(
    SceneManager.subscribe, SceneManager.getState, SceneManager.getState,
  );
  const _dismissCount = sceneState.dismissedIds.size;
  const _minimizeCount = sceneState.minimizedIds.size;

  const [isMobile, setIsMobile] = useState(false);
  const prevSceneId = useRef(scene.id);
  const containerRef = useRef<HTMLDivElement>(null);

  const focusedId = SceneManager.getFocusedId();

  // Card drag/resize transforms
  const cardTransforms = useCardTransforms();

  // Mouse tracking for parallax
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

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
      SceneManager.unfocusElement();
    } else {
      SceneManager.applyScene(scene, false);
    }
  }, [scene]);

  // Report active visualization to screen context
  useEffect(() => {
    const elements = scene.elements || [];
    screenContextStore.setActiveVisualization({
      id: scene.id,
      intent: scene.intent || "",
      layout: scene.layout || "focused",
      elementTypes: elements.map((el) => el.type),
      elementSummaries: elements.map(
        (el) =>
          `${el.type}${el.data?.title ? `: ${el.data.title}` : ""}${el.data?.label ? `: ${el.data.label}` : ""}`
      ),
    });
    return () => {
      screenContextStore.setActiveVisualization(null);
    };
  }, [scene.id, scene.intent, scene.layout, scene.elements]);

  // Click outside / Escape to unfocus
  useEffect(() => {
    if (!focusedId) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && e.target === containerRef.current) {
        SceneManager.unfocusElement();
      }
    };
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
  
  // Solve HUD layout
  const hudLayout = useMemo(
    () => solveHUDLayout(visibleElements, scene.layout, isMobile, focusedId),
    [visibleElements, scene.layout, isMobile, focusedId],
  );

  // Promote orbital to center
  const handlePromote = useCallback((id: string) => {
    SceneManager.focusElement(id);
  }, []);

  if (visibleElements.length === 0) return null;

  const isAbsoluteMode = hudLayout.mode === "absolute";
  const isGridMode = hudLayout.mode === "grid";
  const isStackMode = hudLayout.mode === "stack";

  // Grid layout for grid mode
  const gridCols = isGridMode
    ? visibleElements.length === 1 ? 1
      : visibleElements.length <= 3 ? visibleElements.length
      : visibleElements.length <= 4 ? 2
      : visibleElements.length <= 9 ? 3 : 4
    : 1;

  return (
    <div
      className="relative z-30 w-full h-full overflow-hidden flex flex-col"
      onMouseMove={isAbsoluteMode ? handleMouseMove : undefined}
    >
      {/* Header */}
      <motion.div
        className="relative z-50 flex items-center justify-between px-4 md:px-8 pt-5 pb-3 shrink-0"
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

      {/* Content area */}
      {isAbsoluteMode ? (
        /* Absolute/Focus/Cinematic mode — positioned elements */
        <div
          ref={containerRef}
          className="relative flex-1 min-h-0"
          style={{ overflow: "hidden" }}
        >
          <AnimatePresence mode="popLayout">
            {visibleElements.map((el, i) => {
              const elLayout = hudLayout.elements.get(el.id);
              if (!elLayout) return null;
              return (
                <HUDElement
                  key={el.id}
                  element={el}
                  index={i}
                  elementLayout={elLayout}
                  isMobile={isMobile}
                  focusedId={focusedId}
                  totalElements={visibleElements.length}
                  onItemAction={onItemAction}
                  sendToAI={sendToAI}
                  onPromote={handlePromote}
                  mouseX={mousePos.x}
                  mouseY={mousePos.y}
                  userQuery={scene.intent}
                />
              );
            })}
          </AnimatePresence>
        </div>
      ) : isGridMode ? (
        /* Grid mode — CSS grid dashboard layout */
        <div className="relative z-10 px-4 md:px-8 pb-32 flex-1 min-h-0 overflow-y-auto flex items-start justify-center">
          <div
            ref={containerRef}
            className="w-full"
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : visibleElements.length === 1 ? "minmax(0, 700px)" : visibleElements.length === 2 ? "1.2fr 0.8fr" : `repeat(${gridCols}, minmax(0, 1fr))`,
              gridAutoRows: "auto",
              alignItems: "start",
              gap: isMobile ? "12px" : "20px",
              maxWidth: visibleElements.length === 1 ? "700px" : "100%",
              margin: "0 auto",
              paddingTop: "16px",
            }}
          >
            <AnimatePresence mode="popLayout">
              {visibleElements.map((el, i) => {
                const elLayout = hudLayout.elements.get(el.id);
                if (!elLayout) return null;
                return (
                  <HUDElement
                    key={el.id}
                    element={el}
                    index={i}
                    elementLayout={elLayout}
                    isMobile={isMobile}
                    focusedId={focusedId}
                    totalElements={visibleElements.length}
                    onItemAction={onItemAction}
                    sendToAI={sendToAI}
                    onPromote={handlePromote}
                    mouseX={mousePos.x}
                    mouseY={mousePos.y}
                    userQuery={scene.intent}
                    cardTransform={cardTransforms.getTransform(el.id)}
                    onBringToFront={() => cardTransforms.bringToFront(el.id)}
                    onDragMove={(dx, dy) => cardTransforms.updatePosition(el.id, dx, dy)}
                    onResize={(dw, dh) => cardTransforms.updateSize(el.id, dw, dh)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Stack mode — vertical flow */
        <div className="relative z-10 px-4 md:px-8 pb-32 flex-1 min-h-0 overflow-y-auto">
          <div ref={containerRef} className="mx-auto w-full flex flex-col gap-4" style={{ maxWidth: "800px" }}>
            <AnimatePresence mode="popLayout">
              {visibleElements.map((el, i) => {
                const elLayout = hudLayout.elements.get(el.id);
                if (!elLayout) return null;
                return (
                  <HUDElement
                    key={el.id}
                    element={el}
                    index={i}
                    elementLayout={elLayout}
                    isMobile={isMobile}
                    focusedId={focusedId}
                    totalElements={visibleElements.length}
                    onItemAction={onItemAction}
                    sendToAI={sendToAI}
                    onPromote={handlePromote}
                    mouseX={mousePos.x}
                    mouseY={mousePos.y}
                    userQuery={scene.intent}
                    cardTransform={cardTransforms.getTransform(el.id)}
                    onBringToFront={() => cardTransforms.bringToFront(el.id)}
                    onDragMove={(dx, dy) => cardTransforms.updatePosition(el.id, dx, dy)}
                    onResize={(dw, dh) => cardTransforms.updateSize(el.id, dw, dh)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
