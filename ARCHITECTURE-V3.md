# WHUT OS — V3 Architecture: Intelligent Multi-Window Card System

## Overview

V3 replaces the single scene graph with a **multi-window card system**. The AI operates as an **agent with tools** — it fetches real data, searches the web, and composes multiple independent cards that float on screen simultaneously. Cards stream progressively as the AI works.

## Key Changes from V2

| V2 | V3 |
|---|---|
| Single scene graph (tree) | Array of independent cards |
| One `render_scene` tool | Multiple tools (fetch_emails, search_web, etc.) |
| Synchronous response | SSE streaming with progressive card rendering |
| AI composes layout | Smart layout engine auto-positions cards |
| Static data in scene | AI fetches real data via tool_use loop |

## Card System

```typescript
interface Card {
  id: string;
  type: 'stat' | 'chart' | 'email-list' | 'email-compose' | 'email-detail' |
        'calendar' | 'research' | 'content' | 'file-list' | 'action' | 'markdown';
  title?: string;
  data: any;
  position: { x: number; y: number };  // percentage-based
  size: 'small' | 'medium' | 'large' | 'full';
  priority: number;  // 1=primary, 2=secondary, 3=tertiary
  interactive: boolean;
  minimized?: boolean;
}
```

### Layout Engine

`layoutCards(cards)` auto-positions based on priority:
- 1 card → centered, large
- 2 cards → side by side
- 3+ → primary centered, secondaries below/beside, tertiaries at edges
- Accounts for sidebar (200px left) and input bar (80px bottom)

### Card Components

Each card is a self-contained glass-morphism window with:
- Drag handle (title bar)
- Minimize/close buttons  
- Framer Motion enter/exit animations
- `position: absolute` within content area

## AI Agent Architecture

```
User Input → Claude (with tools) → Tool Calls → Execute → Results back to Claude → Cards
```

### Tools

| Tool | Description |
|---|---|
| `fetch_emails` | Gmail inbox (maxResults, query) |
| `fetch_calendar` | Calendar events (timeMin, timeMax) |
| `fetch_drive_files` | Drive files (query) |
| `search_web` | Web search via Brave API |
| `send_email` | Send email (to, subject, body) |
| `get_email` | Full email body (id) |
| `archive_email` | Archive email (id) |
| `render_cards` | Final output — array of Card objects |

### Tool Use Loop

1. POST /api/ai with user message
2. Stream SSE response
3. Claude decides tools → stream status ("Checking emails...")
4. Execute tools server-side, feed results back to Claude
5. Claude calls `render_cards` with real data
6. Stream cards to frontend one by one

## Streaming Protocol

SSE stream with newline-delimited JSON:

```
{"type":"status","text":"Searching the web..."}
{"type":"status","text":"Found 5 results, analyzing..."}
{"type":"card","card":{...}}
{"type":"card","card":{...}}
{"type":"done","spoken":"Here's what I found about..."}
```

Frontend adds cards progressively with staggered Framer Motion animations.

## File Structure

```
src/
├── lib/
│   ├── card-types.ts          # Card interface + types
│   ├── layout-engine.ts       # Auto-positioning logic
│   └── tools.ts               # Tool definitions for Claude
├── components/
│   ├── CardRenderer.tsx        # Main card container + drag/minimize
│   └── cards/
│       ├── StatCard.tsx
│       ├── ChartCard.tsx
│       ├── EmailListCard.tsx
│       ├── EmailDetailCard.tsx
│       ├── EmailComposeCard.tsx
│       ├── CalendarCard.tsx
│       ├── ResearchCard.tsx
│       ├── ContentCard.tsx
│       ├── FileListCard.tsx
│       └── ActionCard.tsx
├── app/
│   ├── api/
│   │   ├── ai/route.ts        # Agent with tool_use loop + SSE
│   │   └── search/route.ts    # Web search endpoint
│   └── dashboard/page.tsx      # Updated for card system
```
