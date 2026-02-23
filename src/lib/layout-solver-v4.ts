// WHUT OS V4 — Layout Solver (Hero Card Pattern)
// Priority 1 = hero (full width), Priority 2-3 = supporters (row below)

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

  const heroes = elements.filter(e => e.priority === 1);
  const supporters = elements.filter(e => e.priority !== 1);

  switch (layout) {
    case "minimal":
      return { columns: "1fr", rows: "auto", isMobile };

    case "immersive":
      return { columns: "1fr", rows: "1fr", isMobile };

    case "split":
      return {
        columns: "1fr 1fr",
        rows: "auto",
        isMobile,
      };

    case "focused":
    case "ambient":
    default: {
      const supporterCols = Math.min(supporters.length, 3) || 1;
      const heroRow = heroes.length > 0 ? "minmax(280px, 1fr)" : "";
      const supportRow = supporters.length > 0 ? "auto" : "";
      const rows = [heroRow, supportRow].filter(Boolean).join(" ");
      return {
        columns: `repeat(${supporterCols}, 1fr)`,
        rows: rows || "auto",
        isMobile,
      };
    }
  }
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

  if (layout === "split") {
    if (_index < 2) return {};
    return { gridColumn: "1 / -1" };
  }

  // Hero card pattern for focused/ambient/default
  if (element.priority === 1) {
    return { gridColumn: "1 / -1" };
  }

  return {};
}

export function getContentMaxWidth(layout: LayoutMode): string {
  switch (layout) {
    case "immersive": return "100%";
    case "minimal": return "700px";
    case "focused": return "1000px";
    default: return "1200px";
  }
}
