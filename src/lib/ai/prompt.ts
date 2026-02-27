// System prompt builder

import { V4_SYSTEM_PROMPT } from "@/lib/tools-v4";
import { SKILL_ONBOARDING, INTEGRATION_SKILLS } from "@/lib/skills";
import type { AIRequestContext, UsageStats, MemoryEntry } from "./types";

interface PromptOptions {
  context: AIRequestContext;
  memoryBlock: string;
  integrations: string[];
  topMemories: string[];
  usageStats: UsageStats | null;
  relevantMemories: MemoryEntry[];
}

export function buildSystemPrompt(opts: PromptOptions): string {
  const { context, memoryBlock, integrations, topMemories, usageStats, relevantMemories } = opts;
  const profile = context?.userProfile || {};
  const tz = context?.timezone || (profile as Record<string, unknown>)?.timezone as string || "UTC";
  const time = context?.time || new Date().toISOString();
  const isOnboarding = !(profile as Record<string, unknown>)?.name || 
    ["welcome", "name", "role", "integrations"].includes((profile as Record<string, unknown>)?.onboardingStep as string);

  let prompt = V4_SYSTEM_PROMPT;

  if (isOnboarding) {
    prompt += `\n\n${SKILL_ONBOARDING}`;
    const step = (profile as Record<string, unknown>)?.onboardingStep || "welcome";
    prompt += `\n\n## ONBOARDING MODE\nCurrent step: ${step}`;
    if ((profile as Record<string, unknown>)?.name) prompt += `\nName: ${(profile as Record<string, unknown>).name}`;
    if ((profile as Record<string, unknown>)?.role) prompt += `\nRole: ${(profile as Record<string, unknown>).role}`;
  }

  for (const i of integrations) {
    const skill = INTEGRATION_SKILLS[i];
    if (skill) prompt += `\n\n${skill}`;
  }

  prompt += `\n\n## Your Capabilities\nYou are connected to:`;
  const caps: Record<string, { label: string; desc: string }> = {
    google: { label: "Google (Gmail, Calendar, Drive)", desc: "read emails, send emails, archive, view calendar, list files" },
    notion: { label: "Notion", desc: "search pages" },
    slack: { label: "Slack", desc: "list channels, send messages" },
    tiktok: { label: "TikTok Shop", desc: "view orders, analytics" },
  };
  for (const [key, info] of Object.entries(caps)) {
    prompt += `\n- ${info.label}: ${integrations.includes(key) ? `✓ (${info.desc})` : "✗ not connected"}`;
  }
  prompt += `\n- Web Search: ✓ always available`;
  prompt += `\n\nYou can display: metrics, lists, charts (line/bar/radial), images, tables, timelines, search results, rich text.`;

  if (topMemories.length > 0) {
    prompt += `\n\nYou remember:`;
    for (const mem of topMemories) prompt += `\n- ${mem}`;
  }

  if (usageStats && usageStats.requests > 0) {
    prompt += `\n\nToday's usage: ${usageStats.requests} requests, ~${Math.round(usageStats.totalTokens / 1000)}K tokens, $${(usageStats.costCents / 100).toFixed(4)}`;
  }

  prompt += `\n\n## Context\n- Time: ${time} (${tz})`;
  if ((profile as Record<string, unknown>)?.name) prompt += `\n- User: ${(profile as Record<string, unknown>).name}`;
  if ((profile as Record<string, unknown>)?.role) prompt += `\n- Role: ${(profile as Record<string, unknown>).role}`;

  if (relevantMemories.length > 0) {
    prompt += `\n\n## Relevant memories:\n` + relevantMemories.map(m => `- ${m.fact || m.content}`).join("\n");
  }

  if (memoryBlock) prompt += memoryBlock;

  prompt += `\n\n## Guidelines
- When uncertain, say so clearly rather than guessing.
- If a tool call fails, analyze why and try an alternative approach.
- If the user corrects you, acknowledge the correction gracefully.
- Remember user preferences and adapt your communication style.`;

  return prompt;
}
