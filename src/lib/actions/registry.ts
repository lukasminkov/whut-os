// Action Provider Registry
// Visualization components query this to get contextual actions.

import type { ActionProvider, Action, ActionHelpers } from "./types";

const providers: Map<string, ActionProvider> = new Map();

export function registerActionProvider(provider: ActionProvider) {
  providers.set(provider.contextKey, provider);
}

/**
 * Given a context object (from DetailData.context), resolve all actions
 * from registered providers.
 */
export function resolveActions(
  context: Record<string, Record<string, unknown>> | undefined,
  helpers: ActionHelpers,
): Action[] {
  if (!context) return [];

  const actions: Action[] = [];
  for (const [key, data] of Object.entries(context)) {
    const provider = providers.get(key);
    if (provider) {
      actions.push(...provider.getActions(data, helpers));
    }
  }
  return actions;
}
