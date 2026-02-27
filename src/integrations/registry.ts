// Integration Registry — Central registration and lookup

import type { Integration, IntegrationTool } from './types';
import { googleWorkspaceIntegration } from './google-workspace';
import { notionIntegration } from './notion';
import { slackIntegration } from './slack';
import { telegramIntegration } from './telegram';

const integrations = new Map<string, Integration>();

// Register all built-in integrations
function registerBuiltins() {
  const builtins = [
    googleWorkspaceIntegration,
    notionIntegration,
    slackIntegration,
    telegramIntegration,
  ];
  for (const integration of builtins) {
    integrations.set(integration.id, integration);
  }
}

registerBuiltins();

export function getIntegration(id: string): Integration | undefined {
  return integrations.get(id);
}

export function getAllIntegrations(): Integration[] {
  return Array.from(integrations.values());
}

export function registerIntegration(integration: Integration): void {
  integrations.set(integration.id, integration);
}

/** Get all AI tools from all integrations, prefixed with integration id */
export function getAllTools(): (IntegrationTool & { integrationId: string })[] {
  const tools: (IntegrationTool & { integrationId: string })[] = [];
  for (const [id, integration] of integrations) {
    for (const tool of integration.getTools()) {
      tools.push({ ...tool, integrationId: id });
    }
  }
  return tools;
}

/** Get tools for a specific connected integration */
export function getToolsForIntegration(id: string): IntegrationTool[] {
  const integration = integrations.get(id);
  return integration ? integration.getTools() : [];
}
