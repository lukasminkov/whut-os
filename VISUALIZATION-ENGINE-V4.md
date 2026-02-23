# WHUT OS — Visualization Engine V4
## "Jarvis-Class" AI-Driven Display System

### Vision
The AI doesn't pick templates. It **composes scenes** from primitives. Every element is alive — animating, updating, responding to context. The display feels like a living intelligence surface, not a dashboard.

---

## Architecture

```
User speaks → AI reasons + fetches data → AI outputs Scene Description (JSON)
                                                    ↓
                                        ┌─── Scene Manager ───┐
                                        │                      │
                                   Layout Solver          Transition Engine
                                   (spatial arrange)      (morph/appear/fade)
                                        │                      │
                                        └──── Renderer ────────┘
                                              │
                                    ┌─────────┼─────────┐
                                    ▼         ▼         ▼
                               Primitives  Decorators  Effects
```

### Scene Description (what the AI outputs)

```typescript
interface Scene {
  id: string;
  intent: string; // "morning briefing", "email triage", "research results"
  layout: "ambient" | "focused" | "split" | "immersive" | "minimal";
  elements: Element[];
  connections?: Connection[]; // visual links between elements
  emphasis?: string; // element id to highlight
  ambient?: AmbientConfig; // background effects
}

interface Element {
  id: string;
  type: PrimitiveType;
  data: any;
  priority: 1 | 2 | 3; // 1=hero, 2=supporting, 3=ambient
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  position?: "left" | "right" | "center" | "top" | "bottom" | "float";
  animate?: "slide-in" | "fade" | "morph" | "pulse" | "none";
  interactive?: boolean;
  refreshInterval?: number; // auto-refresh in seconds
  onClose?: "dismiss" | "minimize" | "persist"; // what happens when closed
  canReopen?: boolean; // if dismissed, can AI reopen it?
}
```

### Primitive Types

| Type | Description | Visual Style |
|------|-------------|-------------|
| `metric` | Single number + label + trend arrow | Glowing number, animated counter, optional radial gauge |
| `metric-group` | Multiple metrics in a cluster | Hexagonal or circular arrangement |
| `list` | Ordered items (emails, tasks, files) | Glass panel, items slide in sequentially |
| `detail` | Expanded view of a single item | Larger glass panel with sections |
| `chart-line` | Time series data | Animated SVG/Canvas with glow effect |
| `chart-bar` | Comparison data | Animated bars with glass fill |
| `chart-radial` | Progress/gauge | Radial arc with animated fill, like Jarvis gauges |
| `chart-pie` | Distribution | Animated segments |
| `timeline` | Chronological events | Horizontal timeline with glowing nodes |
| `text` | Rich text block (AI explanation, summary) | Typewriter animation, glass panel |
| `image` | Photo/screenshot/diagram | Glass-framed with subtle glow |
| `map` | Location data | Stylized dark map with glowing markers |
| `table` | Structured data grid | Glass table with hover highlights |
| `status` | System status/health | Pulsing dot + label |
| `action` | Buttons/forms for user interaction | Glowing bordered buttons |
| `code` | Code snippet | Syntax-highlighted glass panel |
| `embed` | iFrame content (email HTML, web page) | Contained glass frame |
| `weather` | Weather data | Animated icon + temp |
| `clock` | Time display | Digital or analog with glow |
| `search-results` | Web search results with thumbnails | Cards with image previews |

### Layout Solver

The layout solver takes `Element[]` and arranges them spatially:

1. **Ambient Layout**: Elements float around the orb. Low density. Background feeling.
2. **Focused Layout**: One hero element center-stage, supporting elements smaller around it.
3. **Split Layout**: Two primary panels side by side (e.g., emails left, calendar right).
4. **Immersive Layout**: Full-screen takeover for deep-dive content.
5. **Minimal Layout**: Just the AI response text, no visuals.

Priority drives size: P1 gets 60% of space, P2 gets 30%, P3 gets 10%.

### Transition Engine

When the scene changes (new AI response, user interaction):

1. **Diff the scenes** — identify added, removed, and changed elements.
2. **Morph** elements that changed (e.g., email list → email detail = the list item expands).
3. **Slide out** removed elements.
4. **Slide/fade in** new elements with staggered delay.
5. **Reflow** remaining elements smoothly.

Key: NEVER just swap content. Everything animates.

### Glass Morphism Design System

Every element uses:
- `background: rgba(255,255,255,0.03)` to `rgba(255,255,255,0.08)`
- `backdrop-filter: blur(20px)`
- `border: 1px solid rgba(255,255,255,0.08)`
- Subtle inner glow: `box-shadow: inset 0 0 20px rgba(0,212,170,0.03)`
- Corner accents (thin L-shaped lines at corners, like HUD elements)
- Scan-line effect on hover (subtle horizontal line sweep)

### The "Close" Problem

Current bug: closing a card = it's gone forever until refresh.

Fix: Element state machine:
- `visible` → user sees it
- `dismissed` → user closed it, but it's in the "dismissed" set
- `minimized` → collapsed to a small icon at the edge
- AI can reference dismissed elements: "I notice you closed the emails — want me to bring them back?"
- Scene changes from AI naturally bring elements back (new conversation turn = fresh scene)
- User closing an element adds it to `dismissedIds` in state — the AI's next scene won't force-reopen it unless the user asks

### Ambient Effects

The background responds to state:
- **Idle**: Subtle particle field, slow drift
- **Listening**: Particles converge toward orb, energy builds
- **Thinking**: Radial pulse waves from orb, particles orbit faster
- **Displaying**: Particles scatter outward as panels appear
- **Error**: Brief red pulse

### AI Tool Schema (replaces current card tools)

```typescript
// The AI gets ONE tool for visualization:
{
  name: "display",
  description: "Show information to the user. Compose a scene from primitives.",
  input_schema: {
    type: "object",
    properties: {
      intent: { type: "string" },
      layout: { enum: ["ambient", "focused", "split", "immersive", "minimal"] },
      elements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { enum: [...primitiveTypes] },
            data: { type: "object" },
            priority: { enum: [1, 2, 3] },
            size: { enum: ["xs", "sm", "md", "lg", "xl", "full"] },
          }
        }
      }
    }
  }
}
```

### Image Support

For `image` and `search-results` primitives:
- Images fetched via `/api/image-proxy` to avoid CORS
- Lazy loading with blur placeholder
- Click to expand to full-screen lightbox
- AI can include images from web search, Drive, or direct URLs

### Implementation Plan

**Phase 1: Core Engine** (CTO)
- [ ] `SceneManager` — holds current scene, handles transitions
- [ ] `LayoutSolver` — spatial arrangement based on layout + priorities
- [ ] Primitive components (start with: metric, list, detail, text, chart-line, chart-bar, image, table)
- [ ] Transition system (framer-motion based, diff + morph)
- [ ] Element state machine (visible/dismissed/minimized)
- [ ] Replace current CardRenderer with new SceneRenderer

**Phase 2: Visual Polish** (CTO)
- [ ] Glass morphism design tokens
- [ ] Corner accent decorators (HUD-style)
- [ ] Animated counters for metrics
- [ ] Radial gauge component
- [ ] Chart components (Canvas2D, animated)
- [ ] Staggered entry animations

**Phase 3: AI Integration** (CTO)
- [ ] New `display` tool replacing all current card tools
- [ ] System prompt update teaching AI to compose scenes
- [ ] Scene diffing (don't rebuild from scratch each turn)
- [ ] Dismissed element tracking

**Phase 4: Ambient Layer**
- [ ] Background particle response to state
- [ ] Connection lines between related elements
- [ ] Emphasis animations (pulse, glow)
