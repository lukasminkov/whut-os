export type WindowType = "chat" | "scene" | "files" | "browser" | "document" | "settings";

export interface WindowState {
  id: string;
  type: WindowType;
  title: string;
  /** Position & size (percentage-based for responsive) */
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  /** Type-specific props */
  props?: Record<string, unknown>;
}

export type WindowLayout = "floating" | "tiled-horizontal" | "tiled-vertical" | "stacked";

export interface WorkspaceState {
  windows: WindowState[];
  activeWindowId: string | null;
  layout: WindowLayout;
  nextZIndex: number;
}

export type WindowAction =
  | { type: "OPEN"; payload: Omit<WindowState, "zIndex"> }
  | { type: "CLOSE"; id: string }
  | { type: "FOCUS"; id: string }
  | { type: "MINIMIZE"; id: string }
  | { type: "MAXIMIZE"; id: string }
  | { type: "RESTORE"; id: string }
  | { type: "MOVE"; id: string; x: number; y: number }
  | { type: "RESIZE"; id: string; width: number; height: number }
  | { type: "SET_LAYOUT"; layout: WindowLayout }
  | { type: "SET_TITLE"; id: string; title: string }
  | { type: "TILE_ALL" };
