// Universal Voice Command Router
// Checks registered voice commands from visible visualizations FIRST,
// then falls through to general AI chat.

import { resolveActionConfig } from "./universal-registry";
import type { ActionContext, ActionContextHelpers, VoiceCommand } from "./universal-types";

export interface ActiveElement {
  elementId: string;
  elementType: string;
  data: any;
  title?: string;
}

/**
 * Route a voice transcript to the best matching handler.
 * Returns true if a command was matched, false if it should go to general chat.
 */
export function routeVoiceCommand(
  transcript: string,
  activeElements: ActiveElement[],
  helpers: ActionContextHelpers,
): boolean {
  const trimmed = transcript.trim();
  if (!trimmed) return false;

  // Check each active element's voice commands
  for (const element of activeElements) {
    const config = resolveActionConfig(element.elementType, element.data);
    if (!config) continue;

    for (const command of config.voiceCommands) {
      if (command.pattern.test(trimmed)) {
        const context: ActionContext = {
          visualizationType: config.visualizationType,
          elementId: element.elementId,
          elementType: element.elementType,
          data: element.data,
          title: element.title,
          helpers,
        };
        command.handler(trimmed, context);
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all available voice commands for the currently visible elements.
 * Useful for showing help/suggestions.
 */
export function getAvailableVoiceCommands(
  activeElements: ActiveElement[],
): { description: string; visualizationType: string }[] {
  const commands: { description: string; visualizationType: string }[] = [];

  for (const element of activeElements) {
    const config = resolveActionConfig(element.elementType, element.data);
    if (!config) continue;

    for (const command of config.voiceCommands) {
      commands.push({
        description: command.description,
        visualizationType: config.visualizationType,
      });
    }
  }

  return commands;
}
