// WHUT OS V4 — Smart Layout Solver
// Content-aware, auto-sizing panels with focus/expand support
// Panels tile like an intelligent window manager — no overlaps, no off-screen clipping

import type { SceneElement, LayoutMode } from "./scene-v4-types";

export interface SolvedLayout {
  columns: string;
  rows: string;
  isMobile: boolean;
}

/**
 * Solve the CSS Grid layout based on element count, layout mode, and focus state.
 * When focusedId is set, the focused element gets more space and others compress.
 */
export function solveLayout(
  elements: SceneElement[],
  layout: LayoutMode,
  isMobile: boolean,
  focusedId?: string | null,
): SolvedLayout {
  if (elements.length === 0 || isMobile) {
    return { columns: "1fr", rows: "auto", isMobile };
  }

  const count = elements.length;

  if (layout === "minimal") return { columns: "1fr", rows: "auto", isMobile };
  if (layout === "immersive") return { columns: "1fr", rows: "1fr", isMobile };
  if (layout === "split") return { columns: "1fr 1fr", rows: "1fr", isMobile };

  const hasFocus = focusedId && elements.some(e => e.id === focusedId);

  // With a focused element: give it dominant space, compress others
  if (hasFocus) {
    if (count === 1) return { columns: "1fr", rows: "1fr", isMobile };
    if (count === 2) return { columns: "3fr 1fr", rows: "1fr", isMobile };
    // 3+: focused gets center 3fr, sides get 1fr each
    return { columns: "1fr 3fr 1fr", rows: "minmax(0, 1fr) auto", isMobile };
  }

  // No focus — auto-size with balanced proportions
  if (count === 1) {
    return { columns: "1fr", rows: "1fr", isMobile };
  }
  if (count === 2) {
    return { columns: "3fr 2fr", rows: "1fr", isMobile };
  }
  if (count === 3) {
    return { columns: "1fr 2fr 1fr", rows: "minmax(0, 1fr)", isMobile };
  }
  if (count === 4) {
    return { columns: "1fr 2fr 1fr", rows: "minmax(0, 1fr) auto", isMobile };
  }
  if (count >= 5) {
    return { columns: "1fr 2fr 1fr", rows: "minmax(0, 1fr) minmax(0, 1fr)", isMobile };
  }

  return { columns: "repeat(3, 1fr)", rows: "auto", isMobile };
}

/**
 * Get CSS grid placement props for an element.
 * Handles focus state: focused element spans more, non-focused compress.
 */
export function getElementGridProps(
  element: SceneElement,
  _index: number,
  _total: number,
  layout: LayoutMode,
  isMobile: boolean,
  focusedId?: string | null,
): React.CSSProperties {
  if (isMobile) return { gridColumn: "1 / -1" };
  if (layout === "immersive") return { gridColumn: "1 / -1", gridRow: "1 / -1" };
  if (layout === "minimal") return { gridColumn: "1 / -1" };

  if (layout === "split") {
    if (_index < 2) return {};
    return { gridColumn: "1 / -1" };
  }

  const isFocused = focusedId === element.id;
  const hasFocus = !!focusedId;

  // Single element
  if (_total === 1) {
    return { gridColumn: "1 / -1", gridRow: "1 / -1" };
  }

  // Two elements
  if (_total === 2) {
    if (hasFocus) {
      // Focused element takes the 3fr column, other takes 1fr
      if (isFocused) return { gridColumn: "1", gridRow: "1" };
      return { gridColumn: "2", gridRow: "1" };
    }
    return {}; // natural flow
  }

  // 3 elements: center hero + 2 sides
  if (_total === 3) {
    if (hasFocus && isFocused) {
      // Focused takes center (3fr), spans full height
      return { gridColumn: "2", gridRow: "1 / -1" };
    }
    if (element.priority === 1 || _index === 0) {
      return { gridColumn: "2", gridRow: "1 / -1" };
    }
    if (_index === 1) return { gridColumn: "1", gridRow: "1" };
    return { gridColumn: "3", gridRow: "1" };
  }

  // 4 elements
  if (_total === 4) {
    if (hasFocus && isFocused) {
      return { gridColumn: "2", gridRow: "1 / -1" };
    }
    if (element.priority === 1 || _index === 0) {
      return { gridColumn: "2", gridRow: "1" };
    }
    if (_index === 1) return { gridColumn: "1", gridRow: "1" };
    if (_index === 2) return { gridColumn: "3", gridRow: "1" };
    return { gridColumn: "1 / -1", gridRow: "2" };
  }

  // 5+ elements
  if (_total >= 5) {
    if (hasFocus && isFocused) {
      return { gridColumn: "2", gridRow: "1 / 3" };
    }
    if (element.priority === 1 || _index === 0) {
      return { gridColumn: "2", gridRow: "1 / 3" };
    }
    if (_index === 1) return { gridColumn: "1", gridRow: "1" };
    if (_index === 2) return { gridColumn: "3", gridRow: "1" };
    if (_index === 3) return { gridColumn: "1", gridRow: "2" };
    if (_index === 4) return { gridColumn: "3", gridRow: "2" };
    return { gridColumn: "1 / -1" };
  }

  return {};
}

export function getContentMaxWidth(layout: LayoutMode): string {
  switch (layout) {
    case "immersive": return "100%";
    case "minimal": return "700px";
    default: return "100%";
  }
}
