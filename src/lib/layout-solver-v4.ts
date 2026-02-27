// WHUT OS V4 — Jarvis HUD Layout Engine
// Radial/orbital focus-based layout with multiple modes

import type { SceneElement, LayoutMode } from "./scene-v4-types";

// ── Types ──────────────────────────────────────────────

export interface ElementLayout {
  /** CSS properties for absolute positioning */
  x: string;       // left
  y: string;       // top  
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

// ── Orbital Position Calculator ─────────────────────────

function computeOrbitalPositions(
  count: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number; angle: number }[] {
  if (count === 0) return [];
  
  // Semi-circle arrangement: orbitals arranged in an arc below/around center
  const positions: { x: number; y: number; angle: number }[] = [];
  const cx = viewportWidth / 2;
  const cy = viewportHeight / 2;
  
  // Orbital radius based on viewport (orbitals sit in outer ring)
  const rx = viewportWidth * 0.35;
  const ry = viewportHeight * 0.32;
  
  // Spread orbitals in semi-circle (from -120° to 120°, bottom-heavy arc)
  const startAngle = -Math.PI * 0.65;
  const endAngle = Math.PI * 0.65;
  const step = count > 1 ? (endAngle - startAngle) / (count - 1) : 0;
  
  for (let i = 0; i < count; i++) {
    const angle = count === 1 ? 0 : startAngle + step * i;
    // Shift down so orbitals are more around bottom/sides
    positions.push({
      x: cx + rx * Math.sin(angle),
      y: cy + ry * Math.cos(angle) * 0.6 + viewportHeight * 0.1,
      angle,
    });
  }
  
  return positions;
}

// ── Focus Mode Layout (Radial/Orbital) ──────────────────

export function solveFocusLayout(
  elements: SceneElement[],
  focusedId: string | null,
  isMobile: boolean,
): HUDLayout {
  const layoutMap = new Map<string, ElementLayout>();
  
  if (elements.length === 0) return { mode: "absolute", elements: layoutMap };
  
  // Mobile: stack everything vertically
  if (isMobile) {
    return solveStackLayout(elements, focusedId);
  }
  
  // Determine which element is center stage
  const centerId = focusedId || elements.find(e => e.priority === 1)?.id || elements[0].id;
  const allOrbitals = elements.filter(e => e.id !== centerId);
  // Limit visible orbitals to 6 max to prevent crushing
  const orbitals = allOrbitals.slice(0, 6);
  
  // Center element: ~60% viewport, centered
  layoutMap.set(centerId, {
    x: "50%",
    y: "45%",
    width: elements.length === 1 ? "70%" : "58%",
    height: elements.length === 1 ? "80%" : "70%",
    scale: 1,
    opacity: 1,
    zIndex: 10,
    role: "center",
  });
  
  if (orbitals.length === 0) return { mode: "absolute", elements: layoutMap };
  
  // Orbital elements: arranged around center
  // For 1 orbital: right side
  // For 2: left and right
  // For 3+: semi-circle arc
  
  if (orbitals.length === 1) {
    layoutMap.set(orbitals[0].id, {
      x: "83%",
      y: "50%",
      width: "30%",
      height: "55%",
      scale: 0.45,
      opacity: 0.7,
      zIndex: 5,
      role: "orbital",
    });
  } else if (orbitals.length === 2) {
    layoutMap.set(orbitals[0].id, {
      x: "15%",
      y: "50%",
      width: "28%",
      height: "50%",
      scale: 0.45,
      opacity: 0.7,
      zIndex: 5,
      role: "orbital",
    });
    layoutMap.set(orbitals[1].id, {
      x: "85%",
      y: "50%",
      width: "28%",
      height: "50%",
      scale: 0.45,
      opacity: 0.7,
      zIndex: 5,
      role: "orbital",
    });
  } else {
    // 3+ orbitals: arc arrangement
    const arcSpread = Math.min(orbitals.length, 6);
    const startAngle = -Math.PI * 0.55;
    const endAngle = Math.PI * 0.55;
    const step = arcSpread > 1 ? (endAngle - startAngle) / (arcSpread - 1) : 0;
    
    orbitals.forEach((el, i) => {
      const angle = arcSpread === 1 ? 0 : startAngle + step * i;
      // Compute position on elliptical arc
      const px = 50 + Math.sin(angle) * 38;  // % from center
      const py = 50 + Math.cos(angle) * 28 + 8; // slightly below center
      
      layoutMap.set(el.id, {
        x: `${px}%`,
        y: `${py}%`,
        width: "26%",
        height: "42%",
        scale: 0.42,
        opacity: 0.65,
        zIndex: 5,
        role: "orbital",
      });
    });
  }
  
  return { mode: "absolute", elements: layoutMap };
}

// ── Grid Mode Layout ────────────────────────────────────

export function solveGridLayout(
  elements: SceneElement[],
): HUDLayout {
  const layoutMap = new Map<string, ElementLayout>();
  const count = elements.length;
  
  // Compute grid dimensions
  const cols = count <= 2 ? count : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const colWidth = 100 / cols;
  const rows = Math.ceil(count / cols);
  const rowHeight = 100 / rows;
  
  elements.forEach((el, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    layoutMap.set(el.id, {
      x: `${col * colWidth + colWidth / 2}%`,
      y: `${row * rowHeight + rowHeight / 2}%`,
      width: `${colWidth - 2}%`,
      height: `${rowHeight - 3}%`,
      scale: 1,
      opacity: 1,
      zIndex: 1,
      role: "grid",
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
  
  elements.forEach((el, _i) => {
    layoutMap.set(el.id, {
      x: "50%",
      y: "0",
      width: "100%",
      height: "auto",
      scale: 1,
      opacity: 1,
      zIndex: 1,
      role: "stack",
    });
  });
  
  return { mode: "stack", elements: layoutMap };
}

// ── Cinematic Mode Layout ───────────────────────────────

export function solveCinematicLayout(
  elements: SceneElement[],
): HUDLayout {
  const layoutMap = new Map<string, ElementLayout>();
  
  if (elements.length === 0) return { mode: "absolute", elements: layoutMap };
  
  // First element is fullscreen background
  layoutMap.set(elements[0].id, {
    x: "50%",
    y: "50%",
    width: "100%",
    height: "100%",
    scale: 1,
    opacity: 1,
    zIndex: 1,
    role: "cinematic-main",
  });
  
  // Additional elements are glass overlay panels along bottom
  elements.slice(1).forEach((el, i) => {
    const count = elements.length - 1;
    const width = Math.min(35, 80 / count);
    const x = count === 1 ? 50 : 15 + (i * 70) / Math.max(count - 1, 1);
    
    layoutMap.set(el.id, {
      x: `${x}%`,
      y: "82%",
      width: `${width}%`,
      height: "30%",
      scale: 0.9,
      opacity: 0.9,
      zIndex: 10,
      role: "cinematic-overlay",
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
  // Legacy: still used by some grid-based code paths
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
  _total: number,
  layout: LayoutMode,
  isMobile: boolean,
  focusedId?: string | null,
): React.CSSProperties {
  // Legacy compatibility — grid mode only
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
