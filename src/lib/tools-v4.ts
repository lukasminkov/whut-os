// WHUT OS V4 — AI Tool Definitions
// Single `display` tool replaces all card tools

import type { PrimitiveType, LayoutMode } from "./scene-v4-types";

const PRIMITIVE_TYPES: PrimitiveType[] = [
  "metric", "list", "detail", "text",
  "chart-line", "chart-bar", "chart-radial",
  "image", "table", "timeline",
  "search-results", "embed",
];

export const DISPLAY_TOOL = {
  name: "display",
  description: `Show information to the user by composing a scene from primitives. This is the ONLY way to display visual content. Call this as your LAST tool.

Primitive types:
- metric: { label, value, change?, trend?("up"|"down"|"flat"), unit?, gauge?({min,max,value}) } — single KPI with animated number
- list: { items: [{id, title, subtitle?, meta?, unread?, badge?}] } — clickable list (emails, tasks, etc.)
- detail: { title, subtitle?, sections: [{label, content, type?("text"|"html"|"code")}], meta? } — expanded view
- text: { content: "markdown string", typewriter?: true } — rich text/AI explanation
- chart-line: { points: [{label, value}], color?, label?, yLabel? } — animated line chart
- chart-bar: { bars: [{label, value}], color?, label?, horizontal? } — bar chart
- chart-radial: { value, max, label, color? } — radial gauge (Jarvis-style)
- image: { src, alt?, caption? } — image with lightbox
- table: { columns: string[], rows: any[][], title? } — data table
- timeline: { events: [{time, title, description?, active?}], title? } — horizontal timeline
- search-results: { results: [{title, url, snippet, image?}], query } — web results
- embed: { html?, url?, title? } — sandboxed iframe content

Layout modes: ambient (floating), focused (one hero), split (two panels), immersive (full-screen), minimal (text only)
Priority: 1=hero (60% space), 2=supporting (30%), 3=ambient (10%)`,
  input_schema: {
    type: "object" as const,
    properties: {
      spoken: {
        type: "string",
        description: "1-2 sentences for TTS. Warm, concise, like Jarvis.",
      },
      intent: {
        type: "string",
        description: "Brief description of what this scene shows (e.g. 'morning briefing', 'email triage')",
      },
      layout: {
        type: "string",
        enum: ["ambient", "focused", "split", "immersive", "minimal"],
        description: "Layout mode. Use 'focused' for single-topic, 'split' for two topics, 'ambient' for overview.",
      },
      elements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique element ID (persist across turns for stability)" },
            type: { type: "string", enum: PRIMITIVE_TYPES },
            title: { type: "string", description: "Panel title" },
            data: { type: "object", description: "Primitive-specific data (see type descriptions)" },
            priority: { type: "number", enum: [1, 2, 3] },
            size: { type: "string", enum: ["xs", "sm", "md", "lg", "xl", "full"] },
          },
          required: ["id", "type", "data", "priority"],
        },
      },
    },
    required: ["spoken", "layout", "elements"],
  },
};

// Data-fetching tools (unchanged from V3)
export const DATA_TOOLS = [
  {
    name: "fetch_emails",
    description: "Fetch recent emails from Gmail inbox.",
    input_schema: {
      type: "object" as const,
      properties: {
        maxResults: { type: "number", description: "Max emails (default 10)" },
        query: { type: "string", description: "Gmail search query" },
      },
      required: [],
    },
  },
  {
    name: "get_email",
    description: "Get full body of a specific email by ID.",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "fetch_calendar",
    description: "Fetch upcoming calendar events.",
    input_schema: {
      type: "object" as const,
      properties: { maxResults: { type: "number" } },
      required: [],
    },
  },
  {
    name: "fetch_drive_files",
    description: "Fetch recent Google Drive files.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        maxResults: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "search_web",
    description: "Search the internet. Use for current events, facts, recommendations. Returns titles, URLs, snippets.",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "send_email",
    description: "Send an email via Gmail. Confirm with user first.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "archive_email",
    description: "Archive an email.",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
];

export const AI_TOOLS_V4 = [...DATA_TOOLS, DISPLAY_TOOL];

export const V4_SYSTEM_PROMPT = `# WHUT OS -- V4

You are WHUT, a voice-first AI assistant. Warm, concise, proactive. Like Jarvis.

## Core Rules

1. ALWAYS call \`display\` as your FINAL tool call. This is the ONLY way to show visual content.
2. NEVER fabricate data. Use \`search_web\` for facts, current info, or recommendations.
3. Call multiple data tools in parallel when independent (e.g. fetch_emails + fetch_calendar).
4. Do NOT call \`display\` until you have ALL data from tools.
5. Include a "spoken" field: 1-2 natural sentences for TTS.

## Scene Composition

You compose scenes from primitives. Think spatially:
- **focused** layout: one hero element (priority 1) with optional supporting elements
- **split** layout: two main panels side by side (e.g. emails + calendar)
- **ambient** layout: overview with multiple elements floating
- **immersive** layout: single full-screen element for deep-dive
- **minimal** layout: just text response

### Element IDs
Use stable, descriptive IDs (e.g. "inbox", "calendar", "weather"). Reuse the same IDs across conversation turns so elements update smoothly instead of flickering.

### Priority Guide
- Priority 1: The main thing the user asked about (hero, gets most space)
- Priority 2: Supporting context
- Priority 3: Ambient info (small, edges)

## Hard Rules

- NEVER use emojis. Use clean text.
- For search queries: call search_web first, then display results using \`search-results\` primitive with the raw results.
- For emails: call fetch_emails first, then display using \`list\` primitive with items mapped from emails.
- Stat values must come from real tool data, never invented.
- Always use markdown in \`text\` primitives for rich formatting.

## Examples

### Morning Briefing
1. Parallel: fetch_emails() + fetch_calendar()
2. display({
  spoken: "Good morning. You have 3 unread emails and 2 meetings today.",
  intent: "morning briefing",
  layout: "split",
  elements: [
    { id: "inbox", type: "list", title: "Inbox", priority: 1, data: { items: [{id: "e1", title: "John Smith", subtitle: "Re: Project Update", meta: "2m ago", unread: true}, ...] } },
    { id: "calendar", type: "list", title: "Today's Schedule", priority: 2, data: { items: [{id: "c1", title: "Team Standup", subtitle: "10:00 - 10:30", meta: "Zoom"}, ...] } },
    { id: "stats", type: "metric", title: "Unread", priority: 3, data: { label: "Unread Emails", value: 3, trend: "down", change: -25 } }
  ]
})

### Web Search
1. search_web({query: "best restaurants vienna"})
2. display({
  spoken: "Here are the top restaurant recommendations for Vienna.",
  intent: "restaurant search",
  layout: "focused",
  elements: [
    { id: "results", type: "search-results", title: "Vienna Restaurants", priority: 1, data: { results: [...], query: "best restaurants vienna" } }
  ]
})

### Email Detail
1. get_email({id: "abc123"})
2. display({
  spoken: "Here's the full email from John.",
  intent: "email detail",
  layout: "immersive",
  elements: [
    { id: "email-abc123", type: "detail", title: "Email", priority: 1, data: { title: "Re: Project Update", subtitle: "From: john@example.com", sections: [{label: "Body", content: "...", type: "html"}], meta: {date: "Feb 23, 2026", to: "you@example.com"} } }
  ]
})

### Knowledge Question
1. search_web({query: "quantum computing explained"})
2. display({
  spoken: "Here's an overview of quantum computing.",
  intent: "knowledge",
  layout: "focused",
  elements: [
    { id: "explanation", type: "text", title: "Quantum Computing", priority: 1, data: { content: "## Overview\\n\\nQuantum computing uses **qubits**..." } },
    { id: "sources", type: "search-results", title: "Further Reading", priority: 2, data: { results: [...], query: "quantum computing explained" } }
  ]
})
`;
