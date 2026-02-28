// WHUT OS V4 — Jarvis HUD Layout Engine
// Clean centered layout with responsive grid

import type { SceneElement, LayoutMode } from "./scene-v4-types";

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
  role: "center" | "orbital" | "grid" | "stack" | "cinematic-main" | "cinematic-overlay";
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

// ── Focus Mode Layout (Radial/Orbital) ──────────────────

export function solveFocusLayout(
  elements: SceneElement[],
  focusedId: string | null,
  isMobile: boolean,
): HUDLayout {
  const layoutMap = new Map<string, ElementLayout>();

  if (elements.length === 0) return { mode: "absolute", elements: layoutMap };
  if (isMobile) return solveStackLayout(elements, focusedId);

  const centerId = focusedId || elements.find(e => e.priority === 1)?.id || elements[0].id;
  const allOrbitals = elements.filter(e => e.id !== centerId);
  const orbitals = allOrbitals.slice(0, 6);

  // Single card: centered, reasonable size
  if (elements.length === 1) {
    layoutMap.set(centerId, {
      x: "50%", y: "48%",
      width: "min(600px, 65%)", height: "min(500px, 72%)",
      scale: 1, opacity: 1, zIndex: 10, role: "center",
    });
    return { mode: "absolute", elements: layoutMap };
  }

  // Center element
  layoutMap.set(centerId, {
    x: "50%", y: "46%",
    width: "55%", height: "68%",
    scale: 1, opacity: 1, zIndex: 10, role: "center",
  });

  if (orbitals.length === 1) {
    layoutMap.set(orbitals[0].id, {
      x: "84%", y: "48%",
      width: "28%", height: "52%",
      scale: 0.48, opacity: 0.75, zIndex: 5, role: "orbital",
    });
  } else if (orbitals.length === 2) {
    layoutMap.set(orbitals[0].id, {
      x: "14%", y: "48%", width: "26%", height: "50%",
      scale: 0.48, opacity: 0.75, zIndex: 5, role: "orbital",
    });
    layoutMap.set(orbitals[1].id, {
      x: "86%", y: "48%", width: "26%", height: "50%",
      scale: 0.48, opacity: 0.75, zIndex: 5, role: "orbital",
    });
  } else {
    const arcSpread = Math.min(orbitals.length, 6);
    const startAngle = -Math.PI * 0.55;
    const endAngle = Math.PI * 0.55;
    const step = arcSpread > 1 ? (endAngle - startAngle) / (arcSpread - 1) : 0;

    orbitals.forEach((el, i) => {
      const angle = arcSpread === 1 ? 0 : startAngle + step * i;
      const px = 50 + Math.sin(angle) * 38;
      const py = 50 + Math.cos(angle) * 26 + 6;
      layoutMap.set(el.id, {
        x: `${px}%`, y: `${py}%`,
        width: "24%", height: "40%",
        scale: 0.44, opacity: 0.65, zIndex: 5, role: "orbital",
      });
    });
  }

  return { mode: "absolute", elements: layoutMap };
}

// ── Grid Mode Layout ────────────────────────────────────

export function solveGridLayout(elements: SceneElement[]): HUDLayout {
  const layoutMap = new Map<string, ElementLayout>();
  elements.forEach((el) => {
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
  layout: LayoutMode,
  isMobile: boolean,
  focusedId: string | null,
): HUDLayout {
  if (elements.length === 0) return { mode: "absolute", elements: new Map() };
  if (isMobile) return solveStackLayout(elements, focusedId);

  switch (layout) {
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
  _element: SceneElement,
  _index: number,
  _total: number,
  _layout: LayoutMode,
  isMobile: boolean,
  _focusedId?: string | null,
): React.CSSProperties {
  if (isMobile) return { gridColumn: "1 / -1" };
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
