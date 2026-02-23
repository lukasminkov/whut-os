// WHUT OS V4 — Layout Solver (Full-Screen Dashboard)
// Priority 1 = hero (center, large), Priority 2-3 = supporters (surrounding)

import type { SceneElement, LayoutMode } from "./scene-v4-types";

export interface SolvedLayout {
  columns: string;
  rows: string;
  isMobile: boolean;
}

export function solveLayout(
  elements: SceneElement[],
  layout: LayoutMode,
  isMobile: boolean,
): SolvedLayout {
  if (elements.length === 0 || isMobile) {
    return { columns: "1fr", rows: "auto", isMobile };
  }

  const count = elements.length;

  if (layout === "minimal") return { columns: "1fr", rows: "auto", isMobile };
  if (layout === "immersive") return { columns: "1fr", rows: "1fr", isMobile };

  if (layout === "split") {
    return { columns: "1fr 1fr", rows: "1fr", isMobile };
  }

  // Dynamic grid based on element count
  if (count === 1) {
    return { columns: "1fr", rows: "1fr", isMobile };
  }
  if (count === 2) {
    return { columns: "3fr 2fr", rows: "1fr", isMobile };
  }
  if (count === 3) {
    return { columns: "1fr 2fr 1fr", rows: "1fr", isMobile };
  }
  if (count === 4) {
    return { columns: "1fr 2fr 1fr", rows: "1fr auto", isMobile };
  }
  if (count >= 5) {
    return { columns: "1fr 2fr 1fr", rows: "1fr 1fr", isMobile };
  }

  return { columns: "repeat(3, 1fr)", rows: "auto", isMobile };
}

export function getElementGridProps(
  element: SceneElement,
  _index: number,
  _total: number,
  layout: LayoutMode,
  isMobile: boolean,
): React.CSSProperties {
  if (isMobile) return { gridColumn: "1 / -1" };

  if (layout === "immersive") {
    return { gridColumn: "1 / -1", gridRow: "1 / -1" };
  }

  if (layout === "minimal") return { gridColumn: "1 / -1" };

  if (layout === "split") {
    if (_index < 2) return {};
    return { gridColumn: "1 / -1" };
  }

  // For 1 element: fill everything
  if (_total === 1) {
    return { gridColumn: "1 / -1", gridRow: "1 / -1" };
  }

  // For 2 elements: side by side
  if (_total === 2) {
    return {}; // natural grid flow
  }

  // For 3 elements: hero in center column, supports on sides
  if (_total === 3) {
    if (element.priority === 1 || _index === 0) {
      return { gridColumn: "2", gridRow: "1 / -1" };
    }
    if (_index === 1) return { gridColumn: "1", gridRow: "1" };
    return { gridColumn: "3", gridRow: "1" };
  }

  // For 4 elements: hero center, supports on sides, full-width bottom
  if (_total === 4) {
    if (element.priority === 1 || _index === 0) {
      return { gridColumn: "2", gridRow: "1" };
    }
    if (_index === 1) return { gridColumn: "1", gridRow: "1" };
    if (_index === 2) return { gridColumn: "3", gridRow: "1" };
    return { gridColumn: "1 / -1", gridRow: "2" };
  }

  // For 5+ elements: full dashboard
  if (_total >= 5) {
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
