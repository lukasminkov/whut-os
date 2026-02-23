// WHUT OS V4 — Scene Manager
// Holds scene state, handles element lifecycle, tracks dismissed elements, scene history

import type { Scene, SceneElement, ElementState } from "./scene-v4-types";

export interface SceneState {
  currentScene: Scene | null;
  elementStates: Map<string, ElementState>;
  dismissedIds: Set<string>;
  minimizedIds: Set<string>;
  history: Scene[];
  historyIndex: number;
}

export interface SceneDiff {
  added: SceneElement[];
  removed: string[];
  changed: SceneElement[];
  unchanged: SceneElement[];
}

function createInitialState(): SceneState {
  return {
    currentScene: null,
    elementStates: new Map(),
    dismissedIds: new Set(),
    minimizedIds: new Set(),
    history: [],
    historyIndex: -1,
  };
}

let state = createInitialState();
let listeners: Array<() => void> = [];

function notify() {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function getState(): SceneState {
  return state;
}

export function getVisibleElements(): SceneElement[] {
  if (!state.currentScene) return [];
  return state.currentScene.elements.filter(
    (el) => !state.dismissedIds.has(el.id) && state.elementStates.get(el.id) !== "dismissed"
  );
}

export function diffScenes(oldScene: Scene | null, newScene: Scene): SceneDiff {
  const oldMap = new Map<string, SceneElement>();
  if (oldScene) {
    for (const el of oldScene.elements) oldMap.set(el.id, el);
  }

  const added: SceneElement[] = [];
  const changed: SceneElement[] = [];
  const unchanged: SceneElement[] = [];
  const newIds = new Set<string>();

  for (const el of newScene.elements) {
    newIds.add(el.id);
    const old = oldMap.get(el.id);
    if (!old) {
      added.push(el);
    } else if (JSON.stringify(old.data) !== JSON.stringify(el.data)) {
      changed.push(el);
    } else {
      unchanged.push(el);
    }
  }

  const removed: string[] = [];
  if (oldScene) {
    for (const el of oldScene.elements) {
      if (!newIds.has(el.id)) removed.push(el.id);
    }
  }

  return { added, removed, changed, unchanged };
}

export function applyScene(scene: Scene, pushHistory = true): SceneDiff {
  // Push current scene to history before replacing (for back navigation)
  if (pushHistory && state.currentScene && state.currentScene.id !== scene.id) {
    // Truncate forward history if we branched
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(state.currentScene);
    state.historyIndex = state.history.length - 1;
    // Keep max 20 history entries
    if (state.history.length > 20) {
      state.history = state.history.slice(-20);
      state.historyIndex = state.history.length - 1;
    }
  }

  // Filter out dismissed elements (unless canReopen is set)
  const filtered: SceneElement[] = scene.elements.filter(
    (el) => !state.dismissedIds.has(el.id) || el.canReopen
  );

  const filteredScene = { ...scene, elements: filtered };
  const diff = diffScenes(state.currentScene, filteredScene);

  for (const el of filtered) {
    if (state.minimizedIds.has(el.id)) {
      state.elementStates.set(el.id, "minimized");
    } else {
      state.elementStates.set(el.id, "visible");
    }
  }

  for (const id of diff.removed) {
    state.elementStates.delete(id);
  }

  state.currentScene = filteredScene;
  notify();
  return diff;
}

/** Navigate back in scene history. Returns true if successful. */
export function goBack(): boolean {
  if (state.historyIndex < 0 || state.history.length === 0) return false;
  const prev = state.history[state.historyIndex];
  state.historyIndex--;
  // Clear dismiss state for the restored scene's elements
  for (const el of prev.elements) {
    state.dismissedIds.delete(el.id);
    state.minimizedIds.delete(el.id);
  }
  applyScene(prev, false);
  return true;
}

export function canGoBack(): boolean {
  return state.historyIndex >= 0 && state.history.length > 0;
}

/** Update a single element in the current scene without rebuilding */
export function updateElement(id: string, newElement: Partial<SceneElement>) {
  if (!state.currentScene) return;
  state.currentScene = {
    ...state.currentScene,
    elements: state.currentScene.elements.map(el =>
      el.id === id ? { ...el, ...newElement } : el
    ),
  };
  notify();
}

/** Replace one element with another (e.g., list item → detail view) */
export function replaceElement(oldId: string, newElement: SceneElement) {
  if (!state.currentScene) return;
  // Push current to history for back navigation
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push({ ...state.currentScene });
  state.historyIndex = state.history.length - 1;

  state.currentScene = {
    ...state.currentScene,
    elements: state.currentScene.elements.map(el =>
      el.id === oldId ? newElement : el
    ),
  };
  state.elementStates.set(newElement.id, "visible");
  notify();
}

export function dismissElement(id: string) {
  state.dismissedIds.add(id);
  state.elementStates.set(id, "dismissed");
  notify();
}

export function minimizeElement(id: string) {
  if (state.minimizedIds.has(id)) {
    state.minimizedIds.delete(id);
    state.elementStates.set(id, "visible");
  } else {
    state.minimizedIds.add(id);
    state.elementStates.set(id, "minimized");
  }
  notify();
}

export function clearScene() {
  state.currentScene = null;
  state.elementStates.clear();
  notify();
}

export function clearDismissed() {
  state.dismissedIds.clear();
  notify();
}

export function resetAll() {
  state = createInitialState();
  expandedItem = null;
  notify();
}

// Track expanded list items
let expandedItem: { elementId: string; itemId: string } | null = null;

export function expandListItem(elementId: string, itemId: string) {
  expandedItem = { elementId, itemId };
  notify();
}

export function collapseListItem() {
  expandedItem = null;
  notify();
}

export function getExpandedItem() {
  return expandedItem;
}
