import type { ActionConfig } from "./universal-types";

const configs: ActionConfig[] = [];

export function registerActionConfig(config: ActionConfig) {
  const idx = configs.findIndex(c => c.visualizationType === config.visualizationType);
  if (idx >= 0) configs[idx] = config;
  else configs.push(config);
}

export function resolveActionConfig(
  elementType: string,
  data: any,
): ActionConfig | null {
  for (const config of configs) {
    if (config.match(elementType, data)) return config;
  }
  return null;
}

export function getAllVoiceCommands(): ActionConfig[] {
  return [...configs];
}
