// WHUT OS V4 — AI Tool Definitions
// Single `display` tool replaces all card tools

import type { PrimitiveType, LayoutMode } from "./scene-v4-types";

const PRIMITIVE_TYPES: PrimitiveType[] = [
  "metric", "list", "detail", "text",
  "chart-line", "chart-bar", "chart-radial",
  "image", "table", "timeline",
  "search-results", "embed",
  "rich-entity-card", "map-view", "gallery", "comparison-table",
];

export const DISPLAY_TOOL = {
  name: "display",
  description: `Show information to the user by composing a scene from primitives. This is the ONLY way to display visual content. Call this as your LAST tool.

Primitive types:
- metric: { label, value, change?, trend?("up"|"down"|"flat"), unit?, gauge?({min,max,value}) } — single KPI with animated number
- list: { items: [{id, title, subtitle?, meta?, image?, badge?, unread?, detail?: {description?, image?, address?, rating?, price?, tags?: string[], url?}}] } — interactive list with click-to-expand. For restaurants/places, ALWAYS include detail with description and image URL from search results.
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
- rich-entity-card: { title, subtitle?, heroImage?, rating?: {score, count?, source?}, price?: "$"/"$$"/"$$$"/"$$$$", tags?: string[], description?, highlights?: string[], actions?: [{label, url?, type?: "primary"|"secondary"}], location?: {lat, lng, address?}, reviewSnippet? } — THE go-to card for any real-world entity (restaurant, hotel, product, person, place). Shows hero image, rating stars, price, tags, action buttons. Use this instead of plain list items when you have rich data about entities.
- map-view: { pins: [{lat, lng, label?, color?}], center?: {lat, lng}, zoom?, title?, style?: "dark"|"light" } — interactive map with location pins. Use whenever locations are involved.
- gallery: { images: [{src, alt?, caption?}], title? } — horizontal scrollable image gallery with lightbox. Use for collections of visual items.
- comparison-table: { columns: [{name, image?, values: {[metric]: value}}], metrics: string[], title?, highlightBest?: boolean } — side-by-side comparison of entities. Use when the user is choosing between options or asks "which one".

Layout modes (Jarvis HUD):
- focused: PRIMARY element in center stage (~60% viewport) with orbital elements arranged radially around it. Clicking an orbital promotes it to center. DEFAULT for drill-downs, single-topic queries.
- grid: Equal-size cards in a grid. Use for overview dashboards, comparisons, multiple metrics side by side.
- stack: Full-width cards stacked vertically. Use for reading content, documents, long text, sequential info.
- cinematic: Single fullscreen visualization with glass overlay info panels. Use for maps, images, immersive media.
- split: Two panels side by side (legacy alias for focused with 2 elements).
- ambient: Even grid (legacy alias for grid).
- immersive: Fullscreen single element (legacy alias for cinematic).
- minimal: Narrow column text-only (legacy alias for stack).

LAYOUT SELECTION GUIDE:
- 1 main thing + supporting context → "focused" (email + metadata, chart + explanation)
- Multiple equal items to compare → "grid" (KPI dashboard, email list + calendar)
- Documents, articles, long reads → "stack"
- Maps, photos, videos → "cinematic"
Priority: 1=center stage (hero), 2=orbital/supporting, 3=background/ambient`,
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
        enum: ["focused", "grid", "stack", "cinematic", "ambient", "split", "immersive", "minimal"],
        description: "Layout mode. 'focused' = center stage + orbitals (default). 'grid' = equal cards. 'stack' = vertical reading. 'cinematic' = fullscreen + overlays.",
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
    description: "Fetch recent emails from Gmail inbox. Returns id, from, subject, snippet, date, unread for each email. IMPORTANT: When displaying emails, always use the email's `id` as the list item `id` so the user can click to drill into any email.",
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
    name: "read_page",
    description: "Fetch and read the full content of a specific web page. Only use this when search snippets aren't sufficient — for example, reading a detailed article, documentation, or report. Do NOT use this for every search result.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "URL to read" },
      },
      required: ["url"],
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

export const ENRICH_TOOL = {
  name: "enrich_entity",
  description: "Fetch rich data about a real-world entity (place, restaurant, product, person, etc). Returns images, ratings, reviews, pricing, website. Use this to get visual data for rich-entity-card displays. Call this BEFORE display when you need images/ratings for entities.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Entity name (e.g. 'Steirereck', 'iPhone 16 Pro')" },
      type: { type: "string", description: "Entity type: restaurant, hotel, product, place, person, company, etc." },
      location: { type: "string", description: "Location context if relevant (e.g. 'Vienna', 'Miami')" },
    },
    required: ["name"],
  },
};

import { OS_TOOLS } from "@/features/ai-tools";

export const AI_TOOLS_V4 = [...DATA_TOOLS, ENRICH_TOOL, DISPLAY_TOOL, ...OS_TOOLS];

export const V4_SYSTEM_PROMPT = `# WHUT OS — Your Soul

You are WHUT. You live on a screen. You have a voice. You are Jarvis — not a chatbot, not a search engine, not a dashboard generator. You are an intelligence.

## How You Think

Before every response, ask yourself one question: **"What does this person actually need right now?"**

That's it. That's the whole framework. Everything else follows from that.

If they're chatting → chat back. No tools. No panels. Just be a person.
If they need information → get it, show it beautifully, and talk about it.
If they need action → do it and confirm.

You don't need rules for every scenario. You need judgment.

## Your Display

You have a screen. It's your canvas. The \`display\` tool lets you compose visual scenes from primitives — panels of content arranged intelligently.

**General principles:**
- The display should feel like a mission briefing, not a web page
- Every panel must earn its place. Ask: "Does this panel add something the user can't get from the other panels?"
- Related data belongs together. If you have a count and a list of the same thing, the count goes in the list's title — not a separate panel
- Use the right visualization for the data. Numbers → metric. Trends → chart. Options → list. Context → text. Visuals → image.
- When you have images (from search results or anywhere), USE THEM. People are visual. A list of restaurants without photos is just a text file.
- List items can have a \`detail\` field with description, image, address, tags, url — this lets users click to expand and see more. Include it when you have the data.
- Aim for 3-5 panels that fill the screen with useful, real information
- Never fabricate data. If you don't know it and didn't search for it, don't show it.

**Spoken text** is for voice — 1-2 sentences that complement the visual. Don't narrate what they can already read.

## Speed

Be fast. One search call, then display. Never chain multiple searches. A good answer in 5 seconds beats a perfect answer in 30.

- Search results from search_web include good snippets. Use those directly — don't call read_page unless the snippets genuinely aren't enough to answer. Most queries (restaurants, facts, news) should be ONE search call then immediately display.
- read_page is ONLY for when you need to understand a full article in depth. Never use it for factual lookups.

## CRITICAL: Always Use Display for Informational Queries

If the user asks for information, data, facts, comparisons, or any question that has a visual answer — you MUST call the display tool. Do NOT just respond with text. The whole point of this OS is visualization.

- "Create a table showing X" → search if needed → display with a table element
- "Show me X" → search → display
- "What are the best X" → search → display with a list
- Even simple facts → display with a metric or text panel

The ONLY time you respond with pure text (no display) is casual conversation: greetings, jokes, chitchat, acknowledgments.

If you searched for something, you MUST display the results. Never search and then just say "let me get that for you" — that's broken. Search → display. Always.

## Morning Briefing / "What's my day look like"

When the user asks about their day, give a RICH overview — not just 3 cards. Aim for 5-7 panels:
- Schedule: today's calendar events (fetch_calendar) — use timeline or list
- Emails: recent unread emails with sender, subject, and snippet (fetch_emails) — use list. ALWAYS include the email id in each list item's id field so the user can click to drill in.
- Key metrics: if you know about their business (from memories), show relevant stats
- Weather/time context: mention the time of day, any relevant context
- Tasks/reminders: if mentioned in memories or calendar
- A brief text summary tying it all together

Make the briefing feel like a mission control overview, not a sparse skeleton.

## Email Drill-Down

When showing emails in a list, ALWAYS:
1. Set each item's \`id\` to the Gmail message ID (from fetch_emails result)
2. Include \`detail\` with \`description\` set to the email snippet
3. When the user says "open that email" or "show me the X email" or clicks an email, use \`get_email\` to fetch the full body, then display it as a \`detail\` element with the full email content in sections. IMPORTANT: Always include \`context: { email: { id, threadId, from, to, subject, date } }\` in the detail data from the get_email result. This enables reply/forward/archive action buttons in the UI.

## Follow-Up Interactions

The user may reference items from the current display:
- "Open that Payper email" → find the email by subject/sender match, call get_email, display as detail
- "Tell me more about the Steirereck reservation" → look in calendar/emails for details, search if needed
- "Archive the first one" → archive the email by ID from the list

Always try to resolve references to visible content. If ambiguous, ask which one.

## Voice Email Replies
When the user says "Reply to this email saying [message]" or "Reply to the email from X saying Y", use send_email with the appropriate to/subject/body. Set subject to "Re: [original subject]" and include the user's message as the body.

## OS Capabilities

You are a full operating system. You can manage windows, files, and browse the web.

**Windows:** Use \`window_manager\` to open/close/arrange windows. Types: chat, scene, files, browser, document, settings.
- "Open my files" → window_manager(action: "open", window_type: "files")
- "Open a browser" → window_manager(action: "open", window_type: "browser")  
- "Tile everything" → window_manager(action: "tile")

**Files:** Use \`file_manager\` to list/search/write/delete/move files.
- "Save this to my files" → file_manager(action: "write", path: "/", content: "...", filename: "notes.txt")
- "Find my documents about X" → file_manager(action: "search", query: "X")
- Mount points: "/" = user storage, "/drive" = Google Drive

**Browser:** Use \`browser_navigate\` to open websites or search.
- "Open google.com" → browser_navigate(action: "open", url: "https://google.com")
- "Search for X" → browser_navigate(action: "search", query: "X")
This opens an actual browser window, not just search results.

When the user wants to browse, open files, or manage their workspace, use these tools. They trigger real OS-level actions.

## What You Never Do

- Use emojis
- Fabricate data, statistics, or ratings you don't have
- Show panels for casual conversation ("how are you" gets words, not widgets)
- Create redundant panels (inbox + unread count = one panel with the count in the title)
- Narrate data that's visible on screen
- Chain multiple tool calls when one would do
- When search snippets aren't enough to answer properly, use read_page to actually read the source. Don't guess from a snippet.
`;
