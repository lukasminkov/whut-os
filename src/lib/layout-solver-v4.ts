// WHUT OS V4 — Jarvis HUD Layout Engine
// Clean centered layout with responsive grid + auto-layout intelligence

import type { SceneElement, LayoutMode, PrimitiveType } from "./scene-v4-types";

// ── Content-Aware Sizing ────────────────────────────────

export interface ContentSize {
  preferredWidth: number;   // px
  preferredHeight: number;  // px
  minHeight: number;        // px
  aspectRatio?: number;     // width/height
}

/**
 * Returns preferred sizing based on element type and content length.
 * Used by grid/stack modes to allocate appropriate space per card.
 */
export function getContentSize(element: { type: string; data?: any }): ContentSize {
  const dataLen = element.data ? JSON.stringify(element.data).length : 0;

  switch (element.type) {
    case "metric":
      return { preferredWidth: 200, preferredHeight: 120, minHeight: 100 };

    case "list":
    case "table":
    case "search-results": {
      const itemCount = element.data?.items?.length || element.data?.rows?.length || element.data?.results?.length || 0;
      const h = Math.min(400, 120 + itemCount * 48);
      return { preferredWidth: 600, preferredHeight: h, minHeight: 200 };
    }

    case "chart-line":
    case "chart-bar":
    case "chart-radial":
    case "chart-radar":
    case "chart-candlestick":
    case "chart-gauge":
      return { preferredWidth: 500, preferredHeight: 350, minHeight: 250, aspectRatio: 500 / 350 };

    case "rich-entity-card":
    case "detail": {
      const hasImage = element.data?.heroImage || element.data?.image;
      const h = hasImage ? 480 : 360;
      return { preferredWidth: 450, preferredHeight: h, minHeight: 280 };
    }

    case "map-view":
      return { preferredWidth: 800, preferredHeight: 500, minHeight: 350, aspectRatio: 16 / 10 };

    case "gallery":
      return { preferredWidth: 700, preferredHeight: 400, minHeight: 300 };

    case "comparison-table": {
      const cols = element.data?.columns?.length || 2;
      return { preferredWidth: Math.min(900, 250 * cols), preferredHeight: 400, minHeight: 250 };
    }

    case "image":
      return { preferredWidth: 500, preferredHeight: 400, minHeight: 200, aspectRatio: 4 / 3 };

    case "timeline":
      return { preferredWidth: 600, preferredHeight: 300, minHeight: 200 };

    case "text": {
      const contentLen = element.data?.content?.length || 0;
      const h = Math.min(500, 120 + Math.ceil(contentLen / 80) * 24);
      return { preferredWidth: 600, preferredHeight: h, minHeight: 120 };
    }

    case "embed":
      return { preferredWidth: 600, preferredHeight: 450, minHeight: 300 };

    default:
      return { preferredWidth: 400, preferredHeight: 300, minHeight: 150 };
  }
}

// ── Types ──────────────────────────────────────────────

export interface ElementLayout {
  x: string;
  y: string;
  width: string;
  height: string;
  scale: number;
  opacity: number;
  zIndex: number;
  role: "center" | "orbital" | "grid" | "stack" | "cinematic-main" | "cinematic-overlay" | "sidebar";
}

export interface SolvedLayout {
  columns: string;
  rows: string;
  isMobile: boolean;
}

export interface HUDLayout {
  mode: "absolute" | "grid" | "stack";
  elements: Map<string, ElementLayout>;
}

// ── Content Type Classification ─────────────────────────

const METRIC_TYPES: Set<PrimitiveType> = new Set(["metric", "chart-gauge", "chart-radial"]);
const CHART_TYPES: Set<PrimitiveType> = new Set(["chart-line", "chart-bar", "chart-radar", "chart-candlestick"]);
const DETAIL_TYPES: Set<PrimitiveType> = new Set(["detail", "rich-entity-card", "text", "embed"]);
const COMPACT_TYPES: Set<PrimitiveType> = new Set(["metric", "chart-gauge", "chart-radial"]);

function classifyElements(elements: SceneElement[]) {
  const metrics = elements.filter(e => METRIC_TYPES.has(e.type));
  const charts = elements.filter(e => CHART_TYPES.has(e.type));
  const details = elements.filter(e => DETAIL_TYPES.has(e.type));
  const compact = elements.filter(e => COMPACT_TYPES.has(e.type));
  const maps = elements.filter(e => e.type === "map-view");
  const tables = elements.filter(e => e.type === "table" || e.type === "comparison-table");
  const lists = elements.filter(e => e.type === "list");

  return { metrics, charts, details, compact, maps, tables, lists };
}

// ── Auto Layout Selection ───────────────────────────────

export function autoSelectLayout(elements: SceneElement[]): LayoutMode {
  const count = elements.length;
  if (count === 0) return "focused";

  const { metrics, charts, details, compact, maps, tables, lists } = classifyElements(elements);

  // 1 card → focused (centered)
  if (count === 1) return "focused";

  // All metrics/compact → compact dashboard grid
  if (compact.length === count) return "grid";

  // Single detail + related cards → focused with sidebar
  if (details.length === 1 && count >= 2 && count <= 4) return "focused";

  // 2-4 mixed cards → grid
  if (count >= 2 && count <= 4) return "grid";

  // 5+ cards → grid with priority ordering
  if (count >= 5) return "grid";

  // Default
  return "grid";
}

// ── Focus Mode Layout (Radial/Orbital) ──────────────────

export function solveFocusLayout(
  elements: SceneElement[],
  focusedId: string | null,
  isMobile: boolean,
): HUDLayout {
  const layoutMap = new Map<string, ElementLayout>();

  if (elements.length === 0) return { mode: "absolute", elements: layoutMap };
  if (isMobile) return solveStackLayout(elements, focusedId);

  const { details } = classifyElements(elements);
  const centerId = focusedId || elements.find(e => e.priority === 1)?.id || elements[0].id;
  const others = elements.filter(e => e.id !== centerId);

  // Single card: centered, reasonable size
  if (elements.length === 1) {
    layoutMap.set(centerId, {
      x: "50%", y: "48%",
      width: "min(600px, 65%)", height: "min(500px, 72%)",
      scale: 1, opacity: 1, zIndex: 10, role: "center",
    });
    return { mode: "absolute", elements: layoutMap };
  }

  // Single detail + related → focused center + sidebar cards
  if (details.length === 1 && elements.length <= 4) {
    const detailId = details[0].id;
    const sideElements = elements.filter(e => e.id !== detailId);

    layoutMap.set(detailId, {
      x: "38%", y: "48%",
      width: "52%", height: "75%",
      scale: 1, opacity: 1, zIndex: 10, role: "center",
    });

    sideElements.forEach((el, i) => {
      const yOffset = 25 + (i * 28);
      layoutMap.set(el.id, {
        x: "78%", y: `${yOffset}%`,
        width: "30%", height: `${Math.min(40, 80 / sideElements.length)}%`,
        scale: 0.95, opacity: 0.9, zIndex: 8, role: "sidebar",
      });
    });

    return { mode: "absolute", elements: layoutMap };
  }

  // Standard focus: center + orbitals (capped at 6)
  const orbitals = others.slice(0, 6);

  // Center element — takes left portion, orbitals go in right sidebar
  const hasOrbitals = orbitals.length > 0;
  layoutMap.set(centerId, {
    x: hasOrbitals ? "35%" : "50%", y: "48%",
    width: hasOrbitals ? "58%" : "min(600px, 65%)", height: "min(600px, 78%)",
    scale: 1, opacity: 1, zIndex: 10, role: "center",
  });

  // Orbitals render as a scrollable sidebar on the right
  // Each orbital gets a stacked position in the right 30% of viewport
  orbitals.forEach((el, i) => {
    layoutMap.set(el.id, {
      x: "80%", y: `${20 + i * (60 / Math.max(orbitals.length, 1))}%`,
      width: "30%", height: `${Math.min(50, 55 / Math.max(orbitals.length, 1))}%`,
      scale: 0.85, opacity: 0.9, zIndex: 5, role: "orbital",
    });
  });

  return { mode: "absolute", elements: layoutMap };
}

// ── Grid Mode Layout ────────────────────────────────────

export function solveGridLayout(elements: SceneElement[]): HUDLayout {
  const layoutMap = new Map<string, ElementLayout>();
  // Sort by priority
  const sorted = [...elements].sort((a, b) => (a.priority || 2) - (b.priority || 2));

  sorted.forEach((el) => {
    const size = getContentSize(el);
    layoutMap.set(el.id, {
      x: "0", y: "0", width: "100%",
      height: `${size.preferredHeight}px`,
      scale: 1, opacity: 1, zIndex: 1, role: "grid",
    });
  });
  return { mode: "grid", elements: layoutMap };
}

// ── Stack Mode Layout ───────────────────────────────────

export function solveStackLayout(
  elements: SceneElement[],
  _focusedId?: string | null,
): HUDLayout {
  const layoutMap = new Map<string, ElementLayout>();
  elements.forEach((el) => {
    const size = getContentSize(el);
    // Stack mode uses auto height but provides a min-height hint
    layoutMap.set(el.id, {
      x: "50%", y: "0", width: "100%",
      height: `${size.minHeight}px`,
      scale: 1, opacity: 1, zIndex: 1, role: "stack",
    });
  });
  return { mode: "stack", elements: layoutMap };
}

// ── Cinematic Mode Layout ───────────────────────────────

export function solveCinematicLayout(elements: SceneElement[]): HUDLayout {
  const layoutMap = new Map<string, ElementLayout>();
  if (elements.length === 0) return { mode: "absolute", elements: layoutMap };

  layoutMap.set(elements[0].id, {
    x: "50%", y: "50%", width: "100%", height: "100%",
    scale: 1, opacity: 1, zIndex: 1, role: "cinematic-main",
  });

  elements.slice(1).forEach((el, i) => {
    const count = elements.length - 1;
    const width = Math.min(35, 80 / count);
    const x = count === 1 ? 50 : 15 + (i * 70) / Math.max(count - 1, 1);
    layoutMap.set(el.id, {
      x: `${x}%`, y: "82%", width: `${width}%`, height: "30%",
      scale: 0.9, opacity: 0.9, zIndex: 10, role: "cinematic-overlay",
    });
  });

  return { mode: "absolute", elements: layoutMap };
}

// ── Master Layout Solver ────────────────────────────────

export function solveHUDLayout(
  elements: SceneElement[],
  layout: LayoutMode | "auto",
  isMobile: boolean,
  focusedId: string | null,
): HUDLayout {
  if (elements.length === 0) return { mode: "absolute", elements: new Map() };
  if (isMobile) return solveStackLayout(elements, focusedId);

  // Auto-select layout if "auto" or use the provided layout
  const resolvedLayout = layout === "auto" ? autoSelectLayout(elements) : layout;

  switch (resolvedLayout) {
    case "grid":
    case "ambient":
      return solveGridLayout(elements);
    case "stack":
    case "minimal":
      return solveStackLayout(elements, focusedId);
    case "cinematic":
    case "immersive":
      return solveCinematicLayout(elements);
    case "focused":
    case "split":
    default:
      return solveFocusLayout(elements, focusedId, isMobile);
  }
}

// ── Legacy exports for compatibility ────────────────────

export function solveLayout(
  elements: SceneElement[],
  layout: LayoutMode,
  isMobile: boolean,
  focusedId?: string | null,
): SolvedLayout {
  if (isMobile) return { columns: "1fr", rows: "auto", isMobile };
  const count = elements.length;
  if (layout === "grid" || layout === "ambient") {
    const cols = count <= 2 ? count : count <= 4 ? 2 : 3;
    return { columns: `repeat(${cols}, 1fr)`, rows: "auto", isMobile };
  }
  if (layout === "stack" || layout === "minimal") {
    return { columns: "1fr", rows: "auto", isMobile };
  }
  return { columns: "1fr", rows: "1fr", isMobile };
}

export function getElementGridProps(
  element: SceneElement,
  _index: number,
  total: number,
  _layout: LayoutMode,
  isMobile: boolean,
  _focusedId?: string | null,
): React.CSSProperties {
  if (isMobile) return { gridColumn: "1 / -1" };

  // Compact types (metrics) in dashboard grids get smaller
  if (COMPACT_TYPES.has(element.type) && total >= 4) {
    return {};
  }

  // Detail types span full width in grids with many items
  if (DETAIL_TYPES.has(element.type) && total >= 3) {
    return { gridColumn: "1 / -1" };
  }

  return {};
}

export function getContentMaxWidth(layout: LayoutMode): string {
  switch (layout) {
    case "cinematic":
    case "immersive": return "100%";
    case "stack":
    case "minimal": return "800px";
    default: return "100%";
  }
}
