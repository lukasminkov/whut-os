# WHUT OS — Visualization Engine v2 Architecture

## Executive Summary

The current engine maps 1 user query → 1 tool call → 1 component. V2 introduces **Scene Composition**: the AI outputs a **scene graph** — a spatial tree of components with data bindings — rendered by a recursive layout engine. A **Data Layer** resolves real data from connected integrations. An **Action System** lets scenes contain interactive mutations (send email, create event). Progressive rendering streams the scene skeleton first, then fills data slots asynchronously.

**Architectural choice: Option C+ (Composed High-Level Components with a Layout DSL)**

Not raw JSX (security/maintenance nightmare). Not pure primitives (too low-level for the AI to reliably compose). Instead: a curated set of ~15 high-level components composed in a grid/flex layout DSL. The AI specifies *what* to show and *where*, not *how* to render pixels.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  Voice /  │──▶│   AI Client   │──▶│  Scene Renderer │  │
│  │  Text In  │   │  (sends ctx)  │   │  (recursive)    │  │
│  └──────────┘   └──────┬───────┘   └───────┬────────┘  │
│                        │                    │           │
│                        │              ┌─────▼─────┐     │
│                        │              │ Data Slots │     │
│                        │              │ (SWR/fetch)│     │
│                        │              └─────┬─────┘     │
│                        │                    │           │
│  ┌─────────────────────┼────────────────────┼────────┐  │
│  │              Context Provider                     │  │
│  │  • screen size  • connected integrations          │  │
│  │  • current scene • conversation history           │  │
│  │  • user prefs   • google tokens                   │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────┘
                             │ POST /api/ai
                             ▼
┌─────────────────────────────────────────────────────────┐
│                      BACKEND                            │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐                    │
│  │  AI Route    │──▶│  Claude API   │                    │
│  │  (orchestr.) │◀──│  (scene tool) │                    │
│  └──────┬───────┘   └──────────────┘                    │
│         │                                               │
│  ┌──────▼───────┐   ┌──────────────┐                    │
│  │ Action Exec  │──▶│  Integration  │                    │
│  │ (tool loop)  │   │  APIs (Gmail, │                    │
│  └──────────────┘   │  Calendar...) │                    │
│                     └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Scene Graph

A scene is a JSON tree. The root is always a layout node. Leaf nodes are components. Each component can declare a `dataSource` (resolved at render time) or inline `data`.

```typescript
interface SceneNode {
  // Layout nodes
  type: "grid" | "flex" | "stack";
  columns?: number;          // grid: number of columns
  gap?: number;              // px gap
  direction?: "row" | "col"; // flex direction
  span?: number;             // grid-column span
  children: SceneNode[];
  
  // OR Component leaf nodes
  type: "stat-cards" | "email-list" | "calendar-events" | "chart" 
      | "comparison" | "card-grid" | "table" | "timeline" 
      | "text-block" | "email-compose" | "file-list" | "form"
      | "commerce-summary" | "action-button" | "markdown";
  
  // Data binding (pick one)
  data?: any;                // Inline static data from AI
  dataSource?: DataSource;   // Resolved at render time from integration
  
  // Metadata
  id?: string;               // For updates/targeting
  title?: string;
  loading?: string;          // Skeleton label while loading
  minHeight?: string;        // CSS value
}

interface DataSource {
  integration: "gmail" | "calendar" | "drive" | "tiktok" | "shopify";
  method: string;            // e.g. "getRecentEmails", "getUpcomingEvents"
  params?: Record<string, any>;  // e.g. { maxResults: 10, query: "is:unread" }
  transform?: string;        // Optional: jmespath-like expression to reshape
}
```

### 2. Component Registry

A finite, curated set of renderable components. Each is a React component that accepts typed props. The AI can only reference registered types.

| Component | Props | Data Source Compatible |
|-----------|-------|-----------------------|
| `stat-cards` | `stats: {label, value, change?, icon?}[]` | Yes (any numeric API) |
| `email-list` | `emails: {id, from, subject, snippet, date, unread}[]` | Yes (Gmail) |
| `calendar-events` | `events: {title, start, end, location?, attendees?}[]` | Yes (GCal) |
| `file-list` | `files: {name, type, modified, link}[]` | Yes (Drive) |
| `chart` | `{chartType, data[], xLabel?, yLabel?}` | Yes |
| `card-grid` | `cards: {title, description, imageQuery, tags?}[]` | No (AI-generated) |
| `comparison` | `{items: {name, specs, pros?, cons?}[]}` | No (AI-generated) |
| `table` | `{columns, rows}` | Yes |
| `timeline` | `{events: {date, title, description}[]}` | No |
| `text-block` | `{content: string}` (markdown) | No |
| `email-compose` | `{to, subject, body}` | No |
| `form` | `{fields: {name, type, label, value?}[], action}` | No |
| `commerce-summary` | `{revenue, orders, profit, period}` | Yes (TikTok/Shopify) |
| `action-button` | `{label, action, confirm?}` | No |
| `markdown` | `{content}` | No |

### 3. Data Layer

The frontend resolves `dataSource` bindings. Flow:

1. Scene arrives from AI with `dataSource` references
2. `SceneRenderer` walks the tree, finds all `dataSource` nodes
3. For each, `useDataSlot(dataSource)` hook fires an SWR fetch to `/api/data/{integration}/{method}`
4. Component renders skeleton → real data when resolved
5. Tokens come from the Context Provider (localStorage)

```typescript
// Frontend hook
function useDataSlot(ds: DataSource) {
  const { tokens } = useIntegrations();
  return useSWR(
    ds ? [ds.integration, ds.method, ds.params] : null,
    () => fetchData(ds, tokens)
  );
}

// Backend route: /api/data/[integration]/[method]/route.ts
// Validates token, calls appropriate API, returns data
```

### 4. Action System

Actions are mutations the user can trigger from within a scene. Two types:

**AI-executed actions** (tool loop): The AI calls tools like `send_email`, `create_event` during its reasoning. The backend executes them and feeds results back to Claude before returning the scene.

**Client-side actions**: Components like `email-compose` and `form` have submit handlers that POST to `/api/actions/{type}`. The action endpoint executes the mutation and returns a result, which can trigger a scene update.

```typescript
interface Action {
  type: "send_email" | "create_event" | "search_drive" | "reply_email";
  params: Record<string, any>;
  confirm?: boolean;  // Show confirmation dialog first
}
```

---

## AI Prompt Strategy

### System Prompt (v2)

```
You are WHUT OS — a voice-first AI operating system.

You have ONE tool: `render_scene`. ALWAYS use it for visual responses.

A scene is a spatial layout of components. You decide:
- What components to show
- How to arrange them (grid/flex/stack)
- What data to display (inline or via dataSource binding)
- What actions are available

CONTEXT (injected per-request):
- Connected integrations: {integrations}
- Screen: {width}x{height}, {device}
- Current scene: {currentSceneId or "none"}
- Time: {datetime}, {timezone}

RULES:
1. Compose SCENES, not single widgets. "Good morning" = stats + calendar + emails.
2. Use dataSource bindings for connected integrations (real data). Use inline data for AI-generated content.
3. Grid layouts: use columns (2-4) for dashboards. Use stack for single-focus views.
4. Keep it scannable. No walls of text. Visual hierarchy matters.
5. For actions (send email, etc.), include the component + confirm the action in text.
```

### Single Tool: `render_scene`

Instead of 7+ tools, one tool that accepts the scene graph:

```json
{
  "name": "render_scene",
  "description": "Render a composed visual scene with multiple components in a spatial layout.",
  "input_schema": {
    "type": "object",
    "properties": {
      "layout": { "$ref": "#/definitions/SceneNode" },
      "actions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "type": { "type": "string" },
            "params": { "type": "object" }
          }
        },
        "description": "Server-side actions to execute before rendering (e.g., send_email)"
      }
    },
    "required": ["layout"]
  }
}
```

---

## Scene Graph Examples

### "Good morning" — Morning Briefing

```json
{
  "layout": {
    "type": "stack",
    "gap": 16,
    "children": [
      {
        "type": "text-block",
        "data": { "content": "Good morning, Lukas. Here's your day." }
      },
      {
        "type": "grid",
        "columns": 3,
        "gap": 12,
        "children": [
          {
            "type": "stat-cards",
            "data": {
              "stats": [
                { "label": "Unread Emails", "value": "12", "icon": "mail" },
                { "label": "Meetings Today", "value": "3", "icon": "calendar" },
                { "label": "TikTok Revenue (Today)", "value": "$847", "change": "+23%", "icon": "trending-up" }
              ]
            },
            "span": 3
          }
        ]
      },
      {
        "type": "grid",
        "columns": 2,
        "gap": 12,
        "children": [
          {
            "type": "email-list",
            "title": "Recent Emails",
            "dataSource": {
              "integration": "gmail",
              "method": "getRecentEmails",
              "params": { "maxResults": 5 }
            },
            "loading": "Loading emails..."
          },
          {
            "type": "calendar-events",
            "title": "Today's Schedule",
            "dataSource": {
              "integration": "calendar",
              "method": "getUpcomingEvents",
              "params": { "maxResults": 5 }
            },
            "loading": "Loading calendar..."
          }
        ]
      }
    ]
  }
}
```

### "Show me my emails"

```json
{
  "layout": {
    "type": "stack",
    "gap": 12,
    "children": [
      {
        "type": "email-list",
        "title": "Inbox",
        "dataSource": {
          "integration": "gmail",
          "method": "getRecentEmails",
          "params": { "maxResults": 15 }
        },
        "loading": "Loading your inbox..."
      }
    ]
  }
}
```

### "Send an email to Reid about next week's meeting"

```json
{
  "layout": {
    "type": "stack",
    "gap": 12,
    "children": [
      {
        "type": "text-block",
        "data": { "content": "Here's a draft for Reid. Review and hit send when ready." }
      },
      {
        "type": "email-compose",
        "data": {
          "to": "reid@example.com",
          "subject": "Next Week's Meeting",
          "body": "Hey Reid,\n\nWanted to touch base about our meeting next week. Are we still on for the same time? Let me know if there's anything specific you'd like to cover on the agenda.\n\nBest,\nLukas"
        }
      }
    ]
  }
}
```

### "How are my TikTok sales doing?"

```json
{
  "layout": {
    "type": "stack",
    "gap": 16,
    "children": [
      {
        "type": "text-block",
        "data": { "content": "Here's your TikTok Shop performance overview." }
      },
      {
        "type": "grid",
        "columns": 4,
        "gap": 12,
        "children": [
          {
            "type": "stat-cards",
            "data": {
              "stats": [
                { "label": "Revenue (7d)", "value": "$4,231", "change": "+18%", "icon": "dollar-sign" },
                { "label": "Orders (7d)", "value": "127", "change": "+12%", "icon": "shopping-bag" },
                { "label": "Avg Order Value", "value": "$33.31", "change": "-2%", "icon": "receipt" },
                { "label": "Profit Margin", "value": "34%", "change": "+5%", "icon": "trending-up" }
              ]
            },
            "span": 4
          }
        ]
      },
      {
        "type": "chart",
        "title": "Revenue — Last 30 Days",
        "dataSource": {
          "integration": "tiktok",
          "method": "getDailyRevenue",
          "params": { "days": 30 }
        },
        "loading": "Loading sales data..."
      },
      {
        "type": "grid",
        "columns": 2,
        "gap": 12,
        "children": [
          {
            "type": "table",
            "title": "Top Products",
            "dataSource": {
              "integration": "tiktok",
              "method": "getTopProducts",
              "params": { "limit": 5, "period": "7d" }
            },
            "loading": "Loading products..."
          },
          {
            "type": "chart",
            "title": "Revenue Breakdown",
            "data": {
              "chartType": "pie",
              "data": [
                { "label": "Organic", "value": 2100 },
                { "label": "GMV Max", "value": 1500 },
                { "label": "Affiliate", "value": 631 }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

### "Compare the top 3 project management tools"

```json
{
  "layout": {
    "type": "stack",
    "gap": 16,
    "children": [
      {
        "type": "text-block",
        "data": { "content": "Here's how the top 3 project management tools stack up:" }
      },
      {
        "type": "comparison",
        "data": {
          "items": [
            {
              "name": "Linear",
              "imageQuery": "Linear app project management logo",
              "specs": [
                { "label": "Price", "value": "$8/user/mo" },
                { "label": "Best For", "value": "Engineering teams" },
                { "label": "Integrations", "value": "GitHub, Slack, Figma" }
              ],
              "pros": ["Fastest UI", "Keyboard-first", "Great API"],
              "cons": ["Engineering-focused", "Limited custom fields"],
              "verdict": "Best for dev teams who value speed"
            },
            {
              "name": "Notion",
              "imageQuery": "Notion app workspace logo",
              "specs": [
                { "label": "Price", "value": "$10/user/mo" },
                { "label": "Best For", "value": "All-in-one workspace" },
                { "label": "Integrations", "value": "Slack, Google, Zapier" }
              ],
              "pros": ["Extremely flexible", "Docs + PM combined", "Templates"],
              "cons": ["Can get slow", "Overwhelming flexibility"],
              "verdict": "Best for teams wanting docs + PM in one"
            },
            {
              "name": "Asana",
              "imageQuery": "Asana project management logo",
              "specs": [
                { "label": "Price", "value": "$11/user/mo" },
                { "label": "Best For", "value": "Cross-functional teams" },
                { "label": "Integrations", "value": "Salesforce, Slack, Adobe" }
              ],
              "pros": ["Multiple views", "Goals/portfolios", "Automations"],
              "cons": ["Pricey", "Complex setup"],
              "verdict": "Best for larger orgs with complex workflows"
            }
          ]
        }
      }
    ]
  }
}
```

---

## Streaming & Progressive Rendering

### Approach: Skeleton-First, Data-Fill

1. **AI response streams** via SSE (already implemented). As soon as the `render_scene` tool call JSON is parseable, the scene skeleton renders.
2. **Layout renders immediately** with skeleton placeholders for every `dataSource` node.
3. **Data slots resolve in parallel** (SWR fetches fire simultaneously).
4. **Each component transitions** from skeleton → real data independently (framer-motion fade).

```
Time →
[0ms]   AI starts streaming
[200ms] Scene JSON parseable → skeleton renders (grid structure visible)
[200ms] Data fetches fire: Gmail, Calendar, TikTok (parallel)
[400ms] Calendar data arrives → calendar component fills in
[600ms] Gmail data arrives → email list fills in
[1200ms] TikTok data arrives → charts fill in
```

### Streaming the Scene JSON

For large scenes, we can stream the JSON using partial parsing:

1. Stream the AI response as SSE chunks
2. Use a streaming JSON parser (e.g., `@streamparser/json`) to detect complete subtrees
3. Render subtrees as they complete (top-down: the grid layout first, then children)

This is a **nice-to-have** optimization. The simpler approach (wait for full JSON, then parallel data fetches) is sufficient for v2.0.

---

## Component Hierarchy

```
<SceneProvider>                    // Context: scene state, integrations, tokens
  <SceneRenderer scene={scene}>    // Recursive tree walker
    <LayoutNode type="grid">       // CSS Grid / Flex renderer
      <DataSlot source={...}>      // SWR data fetcher + skeleton
        <ComponentRenderer>        // Maps type → React component
          <EmailList />            // Actual UI component
        </ComponentRenderer>
      </DataSlot>
    </LayoutNode>
  </SceneRenderer>
</SceneProvider>
```

### Key Components

```
src/
  components/
    scene/
      SceneProvider.tsx          // Context for scene state
      SceneRenderer.tsx          // Recursive scene graph → React tree
      LayoutNode.tsx             // Renders grid/flex/stack containers
      DataSlot.tsx               // SWR wrapper, skeleton, error states
      ComponentRenderer.tsx      // Maps type string → component
    visualizations/
      StatCards.tsx              // (existing, adapted)
      CardGrid.tsx               // (existing, adapted)
      ChartView.tsx              // (existing, adapted)
      ComparisonView.tsx         // (existing, adapted)
      TableView.tsx              // (existing, adapted)
      TimelineView.tsx           // (existing, adapted)
      EmailList.tsx              // NEW — real Gmail data
      CalendarEvents.tsx         // NEW — real GCal data
      FileList.tsx               // NEW — real Drive data
      EmailCompose.tsx           // (existing, adapted)
      CommerceSummary.tsx        // NEW — TikTok/Shopify
      ActionButton.tsx           // NEW — trigger actions
      FormView.tsx               // NEW — dynamic forms
  lib/
    scene-types.ts              // TypeScript types for scene graph
    data-resolver.ts            // Client-side data fetching logic
    action-executor.ts          // Client-side action dispatch
  app/api/
    ai/route.ts                 // AI orchestration (updated)
    data/[integration]/[method]/route.ts  // Data proxy endpoints
    actions/[type]/route.ts     // Action execution endpoints
```

---

## Data Flow

```
User: "Good morning"
        │
        ▼
Frontend builds context payload:
{
  message: "Good morning",
  history: [...],
  context: {
    integrations: ["gmail", "calendar", "drive"],
    screen: { width: 1440, height: 900 },
    currentScene: null,
    time: "2026-02-22T08:00:00+01:00"
  }
}
        │
        ▼
POST /api/ai
        │
        ▼
Backend: Build system prompt with context → Claude API
        │
        ▼
Claude returns: render_scene tool call with scene graph JSON
(Stats inline + dataSource refs for emails/calendar)
        │
        ▼
Backend: Execute any server-side actions in scene.actions[]
Return scene graph to frontend
        │
        ▼
Frontend: SceneRenderer walks tree
  ├── Renders grid layout immediately
  ├── Renders stat-cards with inline data immediately
  ├── Fires useDataSlot("gmail", "getRecentEmails") → skeleton
  ├── Fires useDataSlot("calendar", "getUpcomingEvents") → skeleton
  │
  ▼ (parallel)
GET /api/data/gmail/getRecentEmails   ──▶ Gmail API ──▶ emails
GET /api/data/calendar/getUpcomingEvents ──▶ GCal API ──▶ events
  │
  ▼
Components fill in with real data (animated transition)
```

---

## Context Awareness

### What gets sent to Claude (per request)

```typescript
interface AIContext {
  // What integrations are available
  integrations: {
    connected: string[];       // ["gmail", "calendar", "drive"]
    available: string[];       // ["tiktok", "shopify", "slack"]
  };
  
  // Current screen state
  screen: {
    width: number;
    height: number;
    device: "desktop" | "tablet" | "mobile";
  };
  
  // What's currently displayed
  currentScene?: {
    id: string;
    summary: string;           // "Morning briefing with emails and calendar"
    componentTypes: string[];  // ["stat-cards", "email-list", "calendar-events"]
  };
  
  // Time context
  time: string;                // ISO datetime
  timezone: string;
  
  // Conversation
  history: Message[];          // Last N turns
}
```

The system prompt is **dynamically assembled** with this context. Claude knows what's connected and what's on screen, so it can make smart composition decisions.

---

## How Actions Work

### Read Actions (data fetching)
Handled entirely by the Data Layer (dataSource bindings). No AI involvement after scene creation.

### Write Actions (mutations)

**Pattern 1: AI-initiated (tool loop)**
```
User: "Send an email to Reid about the meeting"
  → Claude calls render_scene with email-compose component
  → User edits and clicks Send
  → Frontend POSTs to /api/actions/send_email
  → Backend calls Gmail API
  → Frontend shows success notification
```

**Pattern 2: Scene-embedded actions**
```
User: "Cancel my 3pm meeting"
  → Claude calls render_scene with:
    - calendar-events showing today's schedule
    - action-button: { label: "Cancel 3pm Meeting", action: "cancel_event", params: { eventId: "..." }, confirm: true }
  → User clicks button → confirmation dialog → execute
```

**Pattern 3: Direct execution (no UI needed)**
```
User: "Mark all emails as read"
  → Claude returns scene.actions: [{ type: "mark_all_read" }]
  → Backend executes immediately
  → Returns text confirmation scene
```

---

## Migration Path from V1

### Phase 1: Scene Renderer (Week 1)
- Build `SceneRenderer`, `LayoutNode`, `ComponentRenderer`
- Wrap existing visualization components to accept new prop format
- Add `render_scene` tool alongside existing tools
- AI route supports both old tools and new scene tool

### Phase 2: Data Layer (Week 2)
- Build `/api/data/` proxy routes for Gmail, Calendar, Drive
- Build `DataSlot` component with SWR + skeletons
- Add new integration-aware components (EmailList, CalendarEvents, FileList)
- Wire context injection into AI prompts

### Phase 3: Actions + Polish (Week 3)
- Build `/api/actions/` routes
- Add ActionButton, FormView components
- Add streaming scene parsing
- Remove old individual tools, old VisualizationEngine switch statement

### Backward Compatibility
During migration, the AI route can detect old-format tool calls and wrap them in a trivial scene:
```typescript
// Shim: convert old render_cards → scene
if (block.name === "render_cards") {
  return {
    type: "stack",
    children: [{ type: "card-grid", data: block.input }]
  };
}
```

---

## Technical Decisions & Tradeoffs

| Decision | Choice | Why | Tradeoff |
|----------|--------|-----|----------|
| **Layout approach** | Option C+ (composed components + layout DSL) | Reliable AI output, type-safe, no XSS risk | Less flexible than raw JSX |
| **Single tool vs many** | Single `render_scene` | Simpler prompt, AI composes freely | Larger JSON schema for Claude to learn |
| **Data resolution** | Client-side (DataSlot + SWR) | Parallel fetches, caching, no AI latency for data | Extra network round-trips |
| **Inline data vs all dataSource** | Both — AI chooses | AI-generated content (comparisons) shouldn't need an API | AI must judge when to use which |
| **Streaming** | Skeleton-first, not partial JSON | Simpler implementation, good enough UX | Not true progressive rendering |
| **Action execution** | Client-side for mutations | User confirms before action, better UX | Extra round-trip vs server-side |
| **Context sent to AI** | Summary (not full scene JSON) | Keeps token count manageable | AI can't reference exact component details |
| **Component set** | Curated ~15 types | Reliable rendering, good coverage | New use cases need new components |

### Why Not Option A (Full Layout DSL with Primitives)?
Too many degrees of freedom. Claude would need to specify padding, font sizes, colors, alignment for every element. The error surface is enormous. High-level components encapsulate good defaults.

### Why Not Option B (React/JSX Generation)?
XSS vector. Maintenance nightmare. Every Claude model update could break rendering. Eval-based rendering is fundamentally unsafe for a production OS.

### Why Not Keep V1 with Multi-Select?
V1's tools are atomic — the AI can't compose a dashboard from stats + emails + calendar in one response. Multi-tool-use helps but gives no spatial control. The scene graph is the right abstraction.

---

## Future Considerations

- **Scene Updates**: AI could return partial scene patches (update component X's data) instead of full scenes
- **User Customization**: Drag-to-rearrange components, pin favorites, save layouts
- **Plugins**: Third-party component types registered at runtime
- **Offline Scenes**: Cache last scene + data for instant load
- **Multi-modal**: Camera/image components for device integrations
- **Theming**: Scene-level theme overrides (dark/light, accent color)

---

## Summary

V2 transforms WHUT OS from "AI picks a widget" to "AI composes a spatial experience." The scene graph is the core abstraction — a typed JSON tree that the AI outputs and the frontend recursively renders. Real data flows through a separate Data Layer (not through the AI), keeping responses fast and data fresh. Actions let scenes be interactive, not just informational. The migration is incremental and backward-compatible.
