"use client";

import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from "react";
import type { WorkspaceState, WindowAction, WindowType } from "./types";
import { workspaceReducer, initialWorkspaceState } from "./reducer";
import { screenContextStore } from "@/lib/screen-context";

interface WindowManagerContextValue {
  state: WorkspaceState;
  dispatch: (action: WindowAction) => void;
  openWindow: (type: WindowType, props?: Record<string, unknown>) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  tileAll: () => void;
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

const WINDOW_DEFAULTS: Record<WindowType, { title: string; width: number; height: number }> = {
  chat: { title: "Chat", width: 30, height: 80 },
  scene: { title: "Scene", width: 50, height: 70 },
  files: { title: "Files", width: 40, height: 60 },
  browser: { title: "Browser", width: 50, height: 70 },
  document: { title: "Document", width: 40, height: 60 },
  settings: { title: "Settings", width: 35, height: 50 },
};

let windowCounter = 0;

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);

  const openWindow = useCallback(
    (type: WindowType, props?: Record<string, unknown>) => {
      const id = `${type}-${++windowCounter}`;
      const defaults = WINDOW_DEFAULTS[type];
      // Stagger position slightly for each new window
      const offset = (state.windows.length * 3) % 20;
      dispatch({
        type: "OPEN",
        payload: {
          id,
          type,
          title: (props?.title as string) ?? defaults.title,
          x: 10 + offset,
          y: 5 + offset,
          width: defaults.width,
          height: defaults.height,
          minimized: false,
          maximized: false,
          props,
        },
      });
      return id;
    },
    [state.windows.length]
  );

  // Sync window state to screen context store
  useEffect(() => {
    const windows = state.windows
      .filter((w) => !w.minimized)
      .map((w) => ({
        id: w.id,
        type: w.type,
        title: w.title,
        focused: w.id === state.activeWindowId,
      }));
    screenContextStore.setOpenWindows(windows);
  }, [state.windows, state.activeWindowId]);

  const closeWindow = useCallback((id: string) => dispatch({ type: "CLOSE", id }), []);
  const focusWindow = useCallback((id: string) => dispatch({ type: "FOCUS", id }), []);
  const minimizeWindow = useCallback((id: string) => dispatch({ type: "MINIMIZE", id }), []);
  const maximizeWindow = useCallback((id: string) => dispatch({ type: "MAXIMIZE", id }), []);
  const tileAll = useCallback(() => dispatch({ type: "TILE_ALL" }), []);

  return (
    <WindowManagerContext.Provider
      value={{ state, dispatch, openWindow, closeWindow, focusWindow, minimizeWindow, maximizeWindow, tileAll }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager(): WindowManagerContextValue {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return ctx;
}
