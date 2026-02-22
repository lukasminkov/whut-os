// WHUT OS V3 — Claude Tool Definitions

export const AI_TOOLS = [
  {
    name: "fetch_emails",
    description: "Fetch recent emails from the user's Gmail inbox. Returns email metadata (from, subject, snippet, date, unread status).",
    input_schema: {
      type: "object" as const,
      properties: {
        maxResults: { type: "number", description: "Max emails to return (default 10)" },
        query: { type: "string", description: "Gmail search query (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_email",
    description: "Get the full body of a specific email by ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Email message ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "fetch_calendar",
    description: "Fetch upcoming calendar events.",
    input_schema: {
      type: "object" as const,
      properties: {
        maxResults: { type: "number", description: "Max events to return (default 10)" },
      },
      required: [],
    },
  },
  {
    name: "fetch_drive_files",
    description: "Fetch recent files from Google Drive.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (optional)" },
        maxResults: { type: "number", description: "Max files to return (default 15)" },
      },
      required: [],
    },
  },
  {
    name: "search_web",
    description: "Search the internet for information. Returns titles, URLs, and snippets. Use this when the user asks about current events, facts, research topics, or anything you don't have direct knowledge about.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "send_email",
    description: "Send an email via Gmail. Confirm with the user before calling this.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient email" },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body (plain text)" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "archive_email",
    description: "Archive an email (remove from inbox).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Email message ID to archive" },
      },
      required: ["id"],
    },
  },
  {
    name: "render_cards",
    description: `Output the final visual response as cards. ALWAYS call this as the LAST tool. Each card is an independent floating window on screen. Include a 'spoken' field with 1-2 sentences the AI should speak aloud.

Card types:
- stat: { stats: [{label, value, change?, icon?}] } — key metrics
- chart: { chartType: "line"|"bar"|"area", data: [{label, value}], color? } — data visualization
- email-list: { emails: [{id, from, subject, snippet, date, unread}] } — email inbox
- email-compose: { to?, subject?, body? } — compose form
- email-detail: { id, from, to, subject, date, body } — full email view
- calendar: { events: [{title, start, end, location?}] } — calendar events
- research: { results: [{title, snippet, url, image?}] } — web search results
- content: { text: string } — rich text/markdown content
- file-list: { files: [{name, type, modified, link?}] } — drive files
- action: { label: string, action: string } — action button
- markdown: { content: string } — markdown content

Priority: 1=primary (largest, centered), 2=secondary, 3=tertiary (small, edges)
Size: small | medium | large | full`,
    input_schema: {
      type: "object" as const,
      properties: {
        spoken: {
          type: "string",
          description: "1-2 sentences for TTS. Warm, concise, like Jarvis.",
        },
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: {
                type: "string",
                enum: ["stat", "chart", "email-list", "email-compose", "email-detail", "calendar", "research", "content", "file-list", "action", "markdown"],
              },
              title: { type: "string" },
              data: { type: "object", description: "Card-specific data (see type descriptions above)" },
              size: { type: "string", enum: ["small", "medium", "large", "full"] },
              priority: { type: "number", description: "1=primary, 2=secondary, 3=tertiary" },
              interactive: { type: "boolean" },
            },
            required: ["id", "type", "data", "priority"],
          },
        },
      },
      required: ["spoken", "cards"],
    },
  },
];

export const V3_SYSTEM_PROMPT = `# WHUT OS — V3

You are WHUT, a voice-first AI assistant. Be like Jarvis — warm, concise, proactive.

## How You Work
You have tools to fetch REAL data (emails, calendar, files, web search). Use them before responding.
After gathering data, call render_cards with the results arranged as visual cards.

## Rules
1. ALWAYS call render_cards as your final tool call — this is how you display information.
2. Fetch real data first when relevant — don't make up email subjects or event names.
3. Include a "spoken" field in render_cards — 1-2 sentences spoken via TTS.
4. Use search_web for questions about current events, facts, or topics you're unsure about.
5. For "good morning" / briefings: fetch emails + calendar, then show stat cards + email list + calendar.
6. For email requests: use fetch_emails, then render as email-list card.
7. For compose: render an email-compose card (no need to fetch first).
8. Don't call render_cards until you have all the data you need.
9. You can call multiple tools in parallel when they're independent.

## Card Priority Guide
- Primary info (what user asked for) → priority 1 (large, centered)
- Supporting context → priority 2 (medium, beside/below)
- Supplementary details → priority 3 (small, edges)

## Examples
User: "good morning" → fetch_emails + fetch_calendar → render_cards with greeting stat card (p1), email-list (p2), calendar (p2)
User: "search for AI agents" → search_web → render_cards with research card (p1), content summary (p2)
User: "show my emails" → fetch_emails → render_cards with email-list (p1)
User: "send email to X about Y" → render_cards with email-compose (p1)`;
