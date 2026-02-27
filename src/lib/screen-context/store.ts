// Screen Context Store — lightweight pub/sub store (no extra deps)

import type {
  ScreenState,
  ActiveEmail,
  ActiveDocument,
  ActiveFile,
  BrowserState,
  ActiveVisualization,
} from "./types";
import { DEFAULT_SCREEN_STATE } from "./types";

type Listener = () => void;

class ScreenContextStore {
  private state: ScreenState = { ...DEFAULT_SCREEN_STATE };
  private listeners = new Set<Listener>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 100;

  getState(): ScreenState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private update(partial: Partial<ScreenState>) {
    this.state = {
      ...this.state,
      ...partial,
      contextTimestamp: new Date().toISOString(),
    };
    // Debounce notifications
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.listeners.forEach((l) => l());
    }, this.DEBOUNCE_MS);
  }

  // ── Setters ──

  setActiveView(view: string) {
    this.update({ activeView: view });
  }

  setOpenWindows(
    windows: Array<{ id: string; type: string; title: string; focused: boolean }>
  ) {
    const focused = windows.find((w) => w.focused);
    this.update({
      openWindows: windows,
      focusedWindowType: focused?.type ?? null,
    });
  }

  setActiveEmail(email: ActiveEmail | null) {
    this.update({ activeEmail: email });
  }

  setActiveDocument(doc: ActiveDocument | null) {
    this.update({ activeDocument: doc });
  }

  setActiveFile(file: ActiveFile | null) {
    this.update({ activeFile: file });
  }

  setBrowserState(browser: BrowserState | null) {
    this.update({ browserState: browser });
  }

  setActiveVisualization(viz: ActiveVisualization | null) {
    this.update({ activeVisualization: viz });
  }

  setSelectedItems(items: Array<{ id: string; type: string; label: string }>) {
    this.update({ selectedItems: items });
  }

  clearAll() {
    this.state = { ...DEFAULT_SCREEN_STATE };
    this.listeners.forEach((l) => l());
  }
}

// Singleton
export const screenContextStore = new ScreenContextStore();
