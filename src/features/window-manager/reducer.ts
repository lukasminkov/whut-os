import type { WorkspaceState, WindowAction, WindowState } from "./types";

export const initialWorkspaceState: WorkspaceState = {
  windows: [],
  activeWindowId: null,
  layout: "floating",
  nextZIndex: 1,
};

function tileWindows(windows: WindowState[]): WindowState[] {
  const visible = windows.filter((w) => !w.minimized);
  if (visible.length === 0) return windows;

  const cols = Math.ceil(Math.sqrt(visible.length));
  const rows = Math.ceil(visible.length / cols);
  const w = 100 / cols;
  const h = 100 / rows;

  let idx = 0;
  return windows.map((win) => {
    if (win.minimized) return win;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    idx++;
    return {
      ...win,
      x: col * w,
      y: row * h,
      width: w,
      height: h,
      maximized: false,
    };
  });
}

export function workspaceReducer(state: WorkspaceState, action: WindowAction): WorkspaceState {
  switch (action.type) {
    case "OPEN": {
      const existing = state.windows.find((w) => w.id === action.payload.id);
      if (existing) {
        // Focus existing instead of opening duplicate
        return {
          ...state,
          activeWindowId: existing.id,
          windows: state.windows.map((w) =>
            w.id === existing.id ? { ...w, minimized: false, zIndex: state.nextZIndex } : w
          ),
          nextZIndex: state.nextZIndex + 1,
        };
      }
      const newWin: WindowState = { ...action.payload, zIndex: state.nextZIndex };
      return {
        ...state,
        windows: [...state.windows, newWin],
        activeWindowId: newWin.id,
        nextZIndex: state.nextZIndex + 1,
      };
    }

    case "CLOSE":
      return {
        ...state,
        windows: state.windows.filter((w) => w.id !== action.id),
        activeWindowId: state.activeWindowId === action.id ? null : state.activeWindowId,
      };

    case "FOCUS":
      return {
        ...state,
        activeWindowId: action.id,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, zIndex: state.nextZIndex, minimized: false } : w
        ),
        nextZIndex: state.nextZIndex + 1,
      };

    case "MINIMIZE":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, minimized: true } : w
        ),
        activeWindowId: state.activeWindowId === action.id ? null : state.activeWindowId,
      };

    case "MAXIMIZE":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, maximized: true, zIndex: state.nextZIndex } : w
        ),
        activeWindowId: action.id,
        nextZIndex: state.nextZIndex + 1,
      };

    case "RESTORE":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, maximized: false, minimized: false } : w
        ),
      };

    case "MOVE":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, x: action.x, y: action.y } : w
        ),
      };

    case "RESIZE":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, width: action.width, height: action.height } : w
        ),
      };

    case "SET_LAYOUT":
      return { ...state, layout: action.layout };

    case "SET_TITLE":
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, title: action.title } : w
        ),
      };

    case "TILE_ALL":
      return { ...state, windows: tileWindows(state.windows), layout: "floating" };

    default:
      return state;
  }
}
