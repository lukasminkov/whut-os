// Serialize screen state into a concise text block for AI context injection

import type { ScreenState } from "./types";

/**
 * Produces a compact [SCREEN CONTEXT] block for the AI system prompt.
 * Keeps it lightweight — summaries + IDs, not full content.
 */
export function serializeScreenContext(state: ScreenState): string {
  const lines: string[] = ["[SCREEN CONTEXT]"];

  lines.push(`Active view: ${state.activeView}`);

  if (state.focusedWindowType) {
    lines.push(`Focused window: ${state.focusedWindowType}`);
  }

  if (state.openWindows.length > 0) {
    const windowList = state.openWindows.map((w) => w.type);
    lines.push(`Open windows: [${windowList.join(", ")}]`);
  }

  if (state.activeEmail) {
    const e = state.activeEmail;
    const snippet =
      e.snippet.length > 120 ? e.snippet.slice(0, 120) + "…" : e.snippet;
    lines.push(
      `Email: {id: "${e.id}", subject: "${e.subject}", from: "${e.from}", snippet: "${snippet}"${e.threadId ? `, threadId: "${e.threadId}"` : ""}}`
    );
  }

  if (state.activeDocument) {
    const d = state.activeDocument;
    lines.push(
      `Document: {id: "${d.id}", title: "${d.title}"${d.snippet ? `, snippet: "${d.snippet.slice(0, 100)}"` : ""}}`
    );
  }

  if (state.activeFile) {
    const f = state.activeFile;
    lines.push(`File: {path: "${f.path}", name: "${f.name}", type: "${f.type}"}`);
  }

  if (state.browserState) {
    const b = state.browserState;
    lines.push(`Browser: {url: "${b.url}", title: "${b.title}"}`);
  }

  if (state.activeVisualization) {
    const v = state.activeVisualization;
    lines.push(
      `Visualization: {intent: "${v.intent}", layout: "${v.layout}", elements: [${v.elementSummaries.join(", ")}]}`
    );
  }

  if (state.selectedItems.length > 0) {
    const items = state.selectedItems
      .slice(0, 10)
      .map((i) => `${i.type}:"${i.label}"`)
      .join(", ");
    lines.push(`Selected: [${items}]`);
  }

  lines.push(`Context timestamp: ${state.contextTimestamp}`);

  return lines.join("\n");
}

/**
 * Returns true if the screen state has any meaningful content
 * (not just default/empty state).
 */
export function hasScreenContext(state: ScreenState): boolean {
  return !!(
    state.activeEmail ||
    state.activeDocument ||
    state.activeFile ||
    state.browserState ||
    state.activeVisualization ||
    state.selectedItems.length > 0 ||
    state.openWindows.length > 0
  );
}
