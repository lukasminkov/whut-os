"use client";

import { useSyncExternalStore } from "react";
import { screenContextStore } from "@/lib/screen-context";
import type { ScreenState } from "@/lib/screen-context";

/**
 * React hook to subscribe to the screen context store.
 * Re-renders when screen state changes (debounced at 100ms).
 */
export function useScreenContext(): ScreenState {
  return useSyncExternalStore(
    (cb) => screenContextStore.subscribe(cb),
    () => screenContextStore.getState(),
    () => screenContextStore.getState()
  );
}
