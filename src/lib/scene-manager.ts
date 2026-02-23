// WHUT OS V4 — Scene Manager
// Holds scene state, handles element lifecycle, tracks dismissed elements

import type { Scene, SceneElement, ElementState } from "./scene-v4-types";

export interface SceneState {
  currentScene: Scene | null;
  elementStates: Map<string, ElementState>;
  dismissedIds: Set<string>;
  minimizedIds: Set<string>;
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

export function applyScene(scene: Scene): SceneDiff {
  // Filter out dismissed elements (unless canReopen is set)
  const filtered: SceneElement[] = scene.elements.filter(
    (el) => !state.dismissedIds.has(el.id) || el.canReopen
  );

  const filteredScene = { ...scene, elements: filtered };
  const diff = diffScenes(state.currentScene, filteredScene);

  // Set element states
  for (const el of filtered) {
    if (state.minimizedIds.has(el.id)) {
      state.elementStates.set(el.id, "minimized");
    } else {
      state.elementStates.set(el.id, "visible");
    }
  }

  // Clean up removed elements
  for (const id of diff.removed) {
    state.elementStates.delete(id);
  }

  state.currentScene = filteredScene;
  notify();
  return diff;
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
  notify();
}
