// WHUT OS V4 — Layout Solver (Center Hero Pattern)
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

  const supporters = elements.filter(e => e.priority !== 1);

  switch (layout) {
    case "minimal":
      return { columns: "1fr", rows: "auto", isMobile };

    case "immersive":
      return { columns: "1fr", rows: "1fr", isMobile };

    case "split":
      return { columns: "1fr 1fr", rows: "auto", isMobile };

    case "focused":
    case "ambient":
    default: {
      const total = elements.length;

      if (total === 1) {
        return { columns: "1fr", rows: "auto", isMobile };
      }

      if (total === 2) {
        return { columns: "2fr 1fr", rows: "auto", isMobile };
      }

      // 3+ elements: center hero layout
      const extraSupporters = Math.max(0, supporters.length - 2);
      const mainRow = "minmax(280px, 1fr)";
      const rows = extraSupporters > 0 ? `${mainRow} auto` : mainRow;
      return {
        columns: "1fr 2fr 1fr",
        rows,
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

  // Center hero pattern for focused/ambient/default
  if (_total === 1) {
    return { gridColumn: "1 / -1" };
  }

  if (_total === 2) {
    // Hero left (bigger), support right
    if (element.priority === 1) return { gridColumn: "1" };
    return { gridColumn: "2" };
  }

  // 3+ elements
  if (element.priority === 1) {
    return { gridColumn: "2", gridRow: "1 / -1" };
  }

  // Place supporters on sides based on index
  if (_index === 0 || _index === 1) {
    return { gridColumn: "1", gridRow: "1" };
  }
  if (_index === 2) {
    return { gridColumn: "3", gridRow: "1" };
  }
  // Additional supporters go below spanning full width
  return { gridColumn: "1 / -1" };
}

export function getContentMaxWidth(layout: LayoutMode): string {
  switch (layout) {
    case "immersive": return "100%";
    case "minimal": return "700px";
    case "focused": return "1100px";
    default: return "1200px";
  }
}
