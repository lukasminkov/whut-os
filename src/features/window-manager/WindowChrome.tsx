"use client";

import { useCallback, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { X, Minus, Maximize2, Minimize2 } from "lucide-react";
import type { WindowState } from "./types";
import { useWindowManager } from "./context";

interface WindowChromeProps {
  window: WindowState;
  children: ReactNode;
}

export default function WindowChrome({ window: win, children }: WindowChromeProps) {
  const { closeWindow, focusWindow, minimizeWindow, maximizeWindow, dispatch } = useWindowManager();
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      focusWindow(win.id);
      const rect = (e.currentTarget as HTMLElement).closest("[data-window]")?.parentElement;
      if (!rect) return;
      const parentRect = rect.getBoundingClientRect();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        winX: win.x,
        winY: win.y,
      };
      setIsDragging(true);

      const handleMove = (ev: globalThis.MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ((ev.clientX - dragRef.current.startX) / parentRect.width) * 100;
        const dy = ((ev.clientY - dragRef.current.startY) / parentRect.height) * 100;
        dispatch({
          type: "MOVE",
          id: win.id,
          x: Math.max(0, Math.min(90, dragRef.current.winX + dx)),
          y: Math.max(0, Math.min(90, dragRef.current.winY + dy)),
        });
      };

      const handleUp = () => {
        dragRef.current = null;
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [win.id, win.x, win.y, focusWindow, dispatch]
  );

  if (win.minimized) return null;

  const style = win.maximized
    ? { left: 0, top: 0, width: "100%", height: "calc(100% - 48px)", zIndex: win.zIndex }
    : {
        left: `${win.x}%`,
        top: `${win.y}%`,
        width: `${win.width}%`,
        height: `${win.height}%`,
        zIndex: win.zIndex,
      };

  return (
    <motion.div
      data-window={win.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute overflow-hidden rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl flex flex-col"
      style={{ ...style, position: "absolute" }}
      onMouseDown={() => focusWindow(win.id)}
    >
      {/* Title bar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5 select-none shrink-0 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
      >
        <span className="text-xs text-white/60 font-medium truncate">{win.title}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => minimizeWindow(win.id)} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors">
            <Minus size={12} />
          </button>
          <button onClick={() => maximizeWindow(win.id)} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors">
            {win.maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button onClick={() => closeWindow(win.id)} className="p-1 rounded hover:bg-red-500/30 text-white/40 hover:text-red-300 transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </motion.div>
  );
}
