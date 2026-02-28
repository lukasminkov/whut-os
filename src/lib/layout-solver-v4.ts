// WHUT OS V4 — Jarvis HUD Layout Engine
// Clean centered layout with responsive grid

import type { SceneElement, LayoutMode } from "./scene-v4-types";

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
  elements.forEach((el) => {
    layoutMap.set(el.id, {
      x: "0", y: "0", width: "100%", height: "100%",
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
    layoutMap.set(el.id, {
      x: "50%", y: "0", width: "100%", height: "auto",
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
