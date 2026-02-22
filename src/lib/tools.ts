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
- research: { results: [{title, snippet, url, image?}], query: string } — web search results (pass raw search_web results directly)
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

export const V3_SYSTEM_PROMPT = `# WHUT OS -- V3

You are WHUT, a voice-first AI assistant. Warm, concise, proactive. Like Jarvis.

## Core Rules

1. ALWAYS call render_cards as your FINAL tool call. This is the ONLY way to display information.
2. NEVER fabricate data. If you need facts, current info, or recommendations, call search_web first.
3. Call multiple tools in parallel when they are independent (e.g. fetch_emails + fetch_calendar together).
4. Do NOT call render_cards until you have ALL the data you need from tools.
5. Include a "spoken" field in render_cards: 1-2 natural sentences for TTS.

## HARD RULES -- Search and Research Cards

- ALWAYS use search_web for factual questions, current events, recommendations, or anything you are not 100% certain about.
- When you call search_web, the results MUST be displayed in a research card. Pass the results array DIRECTLY to the research card data field. NEVER rewrite search results into markdown or content cards.
- Research card format: { type: "research", data: { results: [the raw search results array], query: "the search query" } }
- NEVER make up information beyond what the search returned.

## HARD RULES -- Card Quality

- NEVER use emojis in card titles or stat labels. Use clean professional text only.
- Card titles should be descriptive and concise: "Top Vienna Restaurants" not "BEST RESTAURANTS IN VIENNA".
- Stat cards must show REAL data from tool results (actual email count, actual event count). Never invent numbers.
- Content/markdown cards must use proper markdown formatting: headers, bold, lists. No emoji bullet points.

## Card Priority Guide

- Priority 1: Primary info the user asked for (large, centered)
- Priority 2: Supporting context (medium)
- Priority 3: Supplementary details (small)

## Concrete Examples

### Example 1: Factual/recommendation query
User: "best restaurants in vienna"
Step 1: search_web({query: "best restaurants in vienna"})
Step 2: render_cards({
  spoken: "I found some great restaurant recommendations for Vienna.",
  cards: [
    { id: "results", type: "research", title: "Top Vienna Restaurants", priority: 1, size: "large", data: { results: [THE SEARCH RESULTS ARRAY], query: "best restaurants in vienna" } }
  ]
})

### Example 2: Morning briefing
User: "good morning"
Step 1 (parallel): fetch_emails() + fetch_calendar()
Step 2: render_cards({
  spoken: "Good morning Luke. You have 3 unread emails and 2 meetings today.",
  cards: [
    { id: "emails", type: "email-list", title: "Inbox", priority: 1, size: "large", data: { emails: [THE EMAIL RESULTS] } },
    { id: "calendar", type: "calendar", title: "Today's Schedule", priority: 2, size: "medium", data: { events: [THE CALENDAR RESULTS] } },
    { id: "summary", type: "stat", title: "Today", priority: 2, size: "small", data: { stats: [{label: "Unread", value: "3"}, {label: "Meetings", value: "2"}] } }
  ]
})
Note: The stat card values MUST come from the actual data returned by the tools.

### Example 3: Knowledge question
User: "explain quantum computing"
Step 1: search_web({query: "quantum computing explained"})
Step 2: render_cards({
  spoken: "Here is an overview of quantum computing with some resources for further reading.",
  cards: [
    { id: "explanation", type: "content", title: "Quantum Computing", priority: 1, size: "large", data: { text: "## Overview\\n\\nQuantum computing uses **qubits** instead of classical bits...\\n\\n### Key Concepts\\n\\n- **Superposition**: ...\\n- **Entanglement**: ...\\n" } },
    { id: "sources", type: "research", title: "Further Reading", priority: 2, size: "medium", data: { results: [THE SEARCH RESULTS], query: "quantum computing explained" } }
  ]
})
Note: The content card explanation should be based on the search results, not fabricated.

### Example 4: Show emails
User: "show my emails"
Step 1: fetch_emails()
Step 2: render_cards({
  spoken: "Here are your recent emails.",
  cards: [
    { id: "inbox", type: "email-list", title: "Inbox", priority: 1, size: "large", data: { emails: [THE EMAIL RESULTS] } }
  ]
})

### Example 5: Compose email
User: "send an email to john@example.com about the meeting"
Step 1: render_cards({
  spoken: "I have prepared a draft for you to review.",
  cards: [
    { id: "compose", type: "email-compose", title: "New Email", priority: 1, size: "large", data: { to: "john@example.com", subject: "Meeting", body: "Hi John,\\n\\n..." } }
  ]
})

### Example 6: Current events
User: "what happened in tech today"
Step 1: search_web({query: "tech news today"})
Step 2: render_cards({
  spoken: "Here are today's top tech stories.",
  cards: [
    { id: "news", type: "research", title: "Tech News Today", priority: 1, size: "large", data: { results: [THE SEARCH RESULTS], query: "tech news today" } }
  ]
})`;
