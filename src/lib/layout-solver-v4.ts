// WHUT OS V4 — Layout Solver
// Computes spatial arrangement based on layout mode + priorities

import type { SceneElement, LayoutMode, LayoutRect } from "./scene-v4-types";

export interface SolvedLayout {
  gridTemplate: string;
  gridAreas: Map<string, string>;
  columns: string;
  rows: string;
  isMobile: boolean;
}

function prioritySize(p: 1 | 2 | 3): string {
  switch (p) {
    case 1: return "1fr";
    case 2: return "minmax(0, 0.6fr)";
    case 3: return "minmax(0, 0.3fr)";
  }
}

export function solveLayout(
  elements: SceneElement[],
  layout: LayoutMode,
  isMobile: boolean,
): SolvedLayout {
  if (elements.length === 0) {
    return { gridTemplate: "", gridAreas: new Map(), columns: "1fr", rows: "auto", isMobile };
  }

  // Mobile: always single column stack
  if (isMobile) {
    return {
      gridTemplate: "",
      gridAreas: new Map(),
      columns: "1fr",
      rows: elements.map(() => "auto").join(" "),
      isMobile,
    };
  }

  const sorted = [...elements].sort((a, b) => a.priority - b.priority);
  const areas = new Map<string, string>();

  switch (layout) {
    case "minimal":
      return {
        gridTemplate: "",
        gridAreas: areas,
        columns: "1fr",
        rows: "auto",
        isMobile,
      };

    case "focused": {
      // Hero element gets full width, rest flow below in grid
      if (sorted.length === 1) {
        return { gridTemplate: "", gridAreas: areas, columns: "1fr", rows: "auto", isMobile };
      }
      const hero = sorted[0];
      const rest = sorted.slice(1);
      const restCols = Math.min(rest.length, 3);
      return {
        gridTemplate: "",
        gridAreas: areas,
        columns: "1fr",
        rows: `minmax(200px, 1fr) ${rest.length > 0 ? "auto" : ""}`.trim(),
        isMobile,
      };
    }

    case "split": {
      // Two columns
      return {
        gridTemplate: "",
        gridAreas: areas,
        columns: "1fr 1fr",
        rows: elements.map(() => "auto").join(" "),
        isMobile,
      };
    }

    case "immersive": {
      // Single full-width element
      return {
        gridTemplate: "",
        gridAreas: areas,
        columns: "1fr",
        rows: "1fr",
        isMobile,
      };
    }

    case "ambient":
    default: {
      // Auto-grid based on element count
      const cols = elements.length <= 2 ? elements.length : elements.length <= 4 ? 2 : 3;
      return {
        gridTemplate: "",
        gridAreas: areas,
        columns: `repeat(${cols}, 1fr)`,
        rows: "auto",
        isMobile,
      };
    }
  }
}

// Returns CSS grid properties for a specific element within the solved layout
export function getElementGridProps(
  element: SceneElement,
  index: number,
  total: number,
  layout: LayoutMode,
  isMobile: boolean,
): React.CSSProperties {
  if (isMobile) {
    return { gridColumn: "1 / -1" };
  }

  switch (layout) {
    case "focused": {
      if (index === 0) {
        return { gridColumn: "1 / -1" };
      }
      return {};
    }

    case "immersive": {
      return { gridColumn: "1 / -1", gridRow: "1 / -1" };
    }

    case "split": {
      // First two elements take one column each, rest span full
      if (index < 2) return {};
      return { gridColumn: "1 / -1" };
    }

    default:
      return {};
  }
}

// Helper: calculate max-width for content area based on layout
export function getContentMaxWidth(layout: LayoutMode): string {
  switch (layout) {
    case "immersive": return "100%";
    case "focused": return "900px";
    case "split": return "1200px";
    default: return "1100px";
  }
}
