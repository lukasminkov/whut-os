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
  feedbackBlock?: string;
}

export function buildSystemPrompt(opts: PromptOptions): string {
  const { context, memoryBlock, integrations, topMemories, usageStats, relevantMemories, feedbackBlock } = opts;
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
  prompt += `\n\nYou can display: metrics, lists, charts (line/bar/radial), images, tables, timelines, search results, rich text, rich entity cards, maps, galleries, comparison tables.`;

  prompt += `\n\n## Rich Visual Responses — THINK VISUALLY

You are NOT a text chatbot. You are a visual intelligence. Every response about the real world should be RICH.

**When discussing places, restaurants, hotels, attractions:**
- Use \`rich-entity-card\` for each entity — with heroImage, rating, price, tags, action buttons
- Use \`map-view\` to show where they are
- Use \`enrich_entity\` tool to fetch images/ratings when drilling into a specific entity
- Include "Get Directions", "Book", "Visit Website" action buttons

**When discussing products, services, comparisons:**
- Use \`rich-entity-card\` for each option
- Use \`comparison-table\` when comparing 2+ options side by side
- Always include price, rating, key features

**When showing collections of visual items:**
- Use \`gallery\` for image collections
- Use \`rich-entity-card\` elements for entity collections

**Follow-up intelligence:**
- If the user asks "which one should I pick?" → \`comparison-table\`
- If the user wants more detail on one item → full \`gallery\` + detailed \`rich-entity-card\` + \`map-view\`
- Proactively suggest: "Want me to compare these side by side?" or "I can show you menus and help you book"

**Example — POOR vs RICH:**
POOR: A text list saying "Daniel's Miami - Coral Gables - Steakhouse"
RICH: rich-entity-card with heroImage of the restaurant interior, "Daniel's Miami", subtitle "Coral Gables · Steakhouse · $$$$", rating {score: 4.7, count: 2341, source: "Google"}, tags ["Fine Dining", "Steak", "Wine Bar"], highlights ["Dry-aged tomahawk", "Award-winning wine list"], actions [{label: "Book on OpenTable", url: "...", type: "primary"}, {label: "Get Directions", type: "secondary"}], PLUS a map-view showing the location

**Speed rule:** For a list of 3-5 entities, do ONE search_web call, then display rich-entity-cards using the data from search snippets. Only use enrich_entity for drill-downs on a specific entity. Don't call enrich_entity for every item in a list — that's too slow.`;

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

  // Screen context injection
  const screenContext = context?.screenContext as string | undefined;
  const hasScreen = context?.hasScreenContext as boolean | undefined;
  if (hasScreen && screenContext) {
    prompt += `\n\n## ${screenContext}`;
    prompt += `\n\n## Reference Resolution
You have awareness of what the user is currently viewing. When they reference "this", "it", "that", "this email", "that chart", "this document", or similar deictic references, resolve them from the [SCREEN CONTEXT] block above. For example:
- "Reply to this" → use the active email from screen context
- "What does this chart show?" → use the active visualization
- "Archive it" → use the currently viewed email or document
- "Open that" → use the most recently referenced item
Do NOT ask the user to clarify what they mean when screen context makes it obvious.`;
  }

  if (feedbackBlock) prompt += feedbackBlock;

  prompt += `\n\n## Guidelines
- When uncertain, say so clearly rather than guessing.
- If a tool call fails, analyze why and try an alternative approach.
- If the user corrects you, acknowledge the correction gracefully.
- Remember user preferences and adapt your communication style.`;

  return prompt;
}
