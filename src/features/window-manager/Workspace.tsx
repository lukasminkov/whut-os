"use client";

import { AnimatePresence } from "framer-motion";
import { useWindowManager } from "./context";
import WindowChrome from "./WindowChrome";
import type { WindowType } from "./types";
import type { ReactNode } from "react";

interface WorkspaceProps {
  /** Render function for window content by type */
  renderWindow: (type: WindowType, props?: Record<string, unknown>) => ReactNode;
  /** Background content (shown when no windows are open) */
  background?: ReactNode;
}

export default function Workspace({ renderWindow, background }: WorkspaceProps) {
  const { state } = useWindowManager();

  return (
    <div className="relative w-full h-[calc(100vh-48px)] overflow-hidden">
      {/* Background layer */}
      {state.windows.length === 0 && background && (
        <div className="absolute inset-0">{background}</div>
      )}

      {/* Windows layer */}
      <AnimatePresence>
        {state.windows.map((win) => (
          <WindowChrome key={win.id} window={win}>
            {renderWindow(win.type, win.props)}
          </WindowChrome>
        ))}
      </AnimatePresence>
    </div>
  );
}
