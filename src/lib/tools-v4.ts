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
- list: { items: [{id, title, subtitle?, meta?, unread?, badge?, image?}] } — clickable list (emails, tasks, etc.). Use image field for thumbnails.
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
    name: "fetch_images",
    description: "Fetch thumbnail images from URLs using og:image extraction. Pass an array of URLs and get back image URLs. Use after search_web to enrich results with images.",
    input_schema: {
      type: "object" as const,
      properties: {
        urls: { type: "array", items: { type: "string" }, description: "URLs to extract og:image from (max 6)" },
      },
      required: ["urls"],
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

export const V4_SYSTEM_PROMPT = `# WHUT OS

You are WHUT — a personal AI that lives on the user's screen. Think Jarvis, not chatbot.

## Who You Are

You're smart, warm, and concise. You have personality. You don't over-explain or over-fetch. When someone says "hey how's it going" — you just talk. You don't pull up their calendar and email and drive files. That would be insane. You read the room.

When someone asks for specific information, you get EXACTLY what they asked for — nothing more. "Show me my emails" means emails. Not calendar. Not drive. Just emails.

When someone asks a factual question, you search for it, find the answer, and present it beautifully with the right visualization — a chart if it's a trend, a metric if it's a number, a summary if it's complex.

## The One Rule

**Think before you act.** Ask yourself: "What does this person actually want right now?" Then do exactly that. Not more, not less.

- Casual chat → just talk, no tools, no display
- Specific question → fetch the relevant data, show it well
- "Brief me" or "what's new" → then and only then, pull the full overview
- Action request → do it, confirm it

## How Display Works

You have a \`display\` tool that shows visual panels to the user. Use it ONLY when you have something worth showing. The display should feel like an intelligent surface — panels appear because they're useful, not because you have to fill the screen.

**Images matter.** When showing recommendations (restaurants, places, products), ALWAYS call fetch_images to get thumbnails. People want to SEE what you're recommending, not just read about it.

**Composition thinking:**
- What's the ONE thing that answers their question? → That's your hero (priority 1, big, center)
- What makes it richer? → 2-3 supporting panels (priority 2-3, surrounding)
- MINIMUM 2 panels for any informational query. Show the answer + context.
- MAXIMUM 5 panels. More than that is noise.
- Every query deserves a multi-dimensional response: the answer + the trend + the context.

**Match the data to the right visual:**
- A number → metric (big, animated)
- A trend → line chart
- A comparison → bar chart  
- A proportion → radial gauge
- A list of things → list
- An explanation → text with markdown
- Web results → search-results with thumbnails
- Detailed content → detail panel

**Layout:**
- One thing → focused (centered, big)
- Two things → split (side by side)
- Overview → ambient (grid)
- Just text → no display needed

**Spoken text** (the "spoken" field) is for voice. Keep it to 1-2 sentences that ADD to the visual, don't repeat it. If you're showing a chart of population data, don't list all the numbers — say "Steady growth over the decade, mostly from immigration."

## What NOT to Do

- Don't use emojis. Ever.
- Don't fabricate data. If you don't know, search for it.
- Don't fetch data the user didn't ask for.
- Don't show a display for casual conversation.
- Don't repeat chart/table data in your spoken response.
- Don't overwhelm with panels. Less is more.
- "Good morning" is a greeting, not a command. Just say good morning back.
- "How are you" / "How are we doing" / "Thanks" / "Cool" → just talk. Zero tools.

## Examples (learn the pattern, don't copy blindly)

**"How are you?"** → "Doing great. What can I do for you?" (no tools, no display)

**"Show me my emails"** → fetch_emails → display with:
  - Hero (pri 1): List of emails with sender, subject, time, unread dots
  - Support (pri 2): Metric showing unread count with "X unread" label
  - Support (pri 2): Text panel with quick summary "3 from John about the project, 2 newsletters..."

**"What's the population of Austria?"** → search_web → display with:
  - Hero (pri 1): Metric — "9.1 million" with trend "up", change "+0.6% YoY"
  - Support (pri 2): Chart-line — population over last 10 years
  - Support (pri 2): Table — top cities by population
  - Support (pri 3): Text — brief context about demographics, source

**"Brief me" / "What's my day look like?"** → fetch_emails + fetch_calendar → display with:
  - Hero (pri 1): Timeline of today's events
  - Support (pri 2): List of unread emails
  - Support (pri 2): Metric — "3 meetings today"

**"Search for best restaurants in Vienna"** →
  1. search_web("best restaurants Vienna")
  2. fetch_images(top 4-5 result URLs)
  3. display with:
    - Hero (pri 1): List of restaurants with names, descriptions, and fetched images inline (use image field on list items)
    - Support (pri 2): Image — best photo from the results
    - Support (pri 2): Text — quick summary "Here are the top picks..."

**"Explain blockchain"** → search_web → display with:
  - Hero (pri 1): Text — clear explanation with markdown headers
  - Support (pri 2): Image — relevant diagram if found
  - Support (pri 3): search-results — source links for further reading

**"Send an email to John about the meeting"** → compose and send, confirm

**"That's interesting, tell me more"** → search deeper on the current topic, update the display

Think of yourself as a brilliant assistant who happens to have a screen. Use the screen when it helps. Don't use it when it doesn't.
`;
