// Screen Context Types — tracks what's currently visible on screen

export interface ActiveEmail {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  threadId?: string;
  date?: string;
}

export interface ActiveDocument {
  id: string;
  title: string;
  snippet?: string; // first ~200 chars
  type?: string;
}

export interface ActiveFile {
  path: string;
  name: string;
  type: string;
}

export interface BrowserState {
  url: string;
  title: string;
}

export interface ActiveVisualization {
  id: string;
  intent: string;
  layout: string;
  elementTypes: string[]; // e.g. ["metric", "chart", "list"]
  elementSummaries: string[]; // brief description of each element
}

export interface ScreenState {
  /** Which top-level view/page is active */
  activeView: string;
  /** All open windows from window manager */
  openWindows: Array<{ id: string; type: string; title: string; focused: boolean }>;
  /** Currently focused window type */
  focusedWindowType: string | null;
  /** Active email if viewing one */
  activeEmail: ActiveEmail | null;
  /** Active document if editing one */
  activeDocument: ActiveDocument | null;
  /** Active file if viewing one */
  activeFile: ActiveFile | null;
  /** Browser state if browser is open */
  browserState: BrowserState | null;
  /** Current visualization/scene on screen */
  activeVisualization: ActiveVisualization | null;
  /** Selected items (files, emails, etc.) */
  selectedItems: Array<{ id: string; type: string; label: string }>;
  /** Timestamp of last update */
  contextTimestamp: string;
}

export const DEFAULT_SCREEN_STATE: ScreenState = {
  activeView: "dashboard",
  openWindows: [],
  focusedWindowType: null,
  activeEmail: null,
  activeDocument: null,
  activeFile: null,
  browserState: null,
  activeVisualization: null,
  selectedItems: [],
  contextTimestamp: new Date().toISOString(),
};
