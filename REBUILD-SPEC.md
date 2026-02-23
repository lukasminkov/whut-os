# WHUT OS — Definitive Rebuild Spec
## Based on: UI Research + Codebase Audit + User Feedback

---

## The Core Insight

The product feels dead because:
1. **Flat grid** — all panels get equal visual weight (no hero/supporting hierarchy)
2. **Static** — nothing breathes, no ambient animation, elements just appear/disappear
3. **No streaming feel** — content dumps all at once instead of progressive rendering
4. **Rigid boxes** — identical glass panels regardless of content type
5. **AI over-fetches** — pulls everything instead of just what's needed

## What "Alive" Looks Like

From the research, three principles:
1. **Hero + Supporters** — ONE large panel answers the question, small panels add context
2. **Everything breathes** — ambient 4s animation cycle on all elements
3. **Stream progressively** — skeleton → partial → final (never a loading spinner)

---

## Architecture: The Rebuild

### 1. Layout Engine (COMPLETE REWRITE of layout-solver-v4.ts)

Replace CSS Grid equal-boxes with Hero Card Pattern:

```
┌─────────────────────────────────────────┐
│                                         │
│            HERO (priority 1)            │  60% of space
│         Large, centered, prominent      │
│                                         │
├────────────┬────────────┬───────────────┤
│  Support 1 │  Support 2 │   Support 3   │  40% of space
│  (pri 2)   │  (pri 2)   │   (pri 3)     │
└────────────┴────────────┴───────────────┘
```

Concrete CSS:
```css
.scene-layout {
  display: grid;
  gap: 12px;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Focused: 1 hero spanning full width, supporters below */
.scene-layout[data-layout="focused"] {
  grid-template-columns: repeat(3, 1fr);
}
.scene-layout[data-layout="focused"] .hero {
  grid-column: 1 / -1;
  min-height: 280px;
}

/* Split: 2 heroes side by side */
.scene-layout[data-layout="split"] {
  grid-template-columns: 1fr 1fr;
}

/* Mobile: everything stacks */
@media (max-width: 768px) {
  .scene-layout {
    grid-template-columns: 1fr !important;
  }
}
```

### 2. Panel Styling (Fix the "rigid box" problem)

Every panel gets:
- `bg-white/[0.03]` (barely visible background)
- `backdrop-blur-[20px]`
- `border border-white/[0.06]` (subtle, not boxy)
- `rounded-2xl` (16px radius — softer than 8px)
- `p-5` (comfortable padding)
- **Ambient breathe animation**: `animation: breathe 4s ease-in-out infinite`
- **Data arrival pulse** when content updates
- **Processing scan line** while loading

Labels MUST be:
- `text-[10px] uppercase tracking-[0.15em] text-white/[0.4]`
- This ONE change makes everything feel HUD-like

Hero panels additionally get:
- Slightly brighter: `bg-white/[0.05]`
- Teal accent line at top: `border-t-2 border-[#00d4aa]/40`
- Larger padding: `p-6`

### 3. Animation System

**Entry (300ms):**
```css
@keyframes panel-enter {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

**Exit (150ms — FAST):**
```css
@keyframes panel-exit {
  to { opacity: 0; transform: scale(0.96); }
}
```

**Ambient breathe (continuous):**
```css
@keyframes breathe {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}
```

**Data update pulse (600ms):**
```css
@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(0, 212, 170, 0.3); }
  70% { box-shadow: 0 0 0 4px rgba(0, 212, 170, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 212, 170, 0); }
}
```

**Stagger:** Each panel enters with 80ms delay after the previous one.

### 4. Close Button Fix

Current: `onClose` clears ALL panels (wipes entire scene).
Fix: `onDismiss` per panel removes just that element from the scene.

The X button on each panel should:
1. Immediately start exit animation (150ms)
2. Remove element from scene state
3. Remaining elements reflow smoothly (framer-motion `layout` prop)
4. Element ID added to `dismissedIds` so AI doesn't re-show it

"Close All" button in top-right corner clears everything.

### 5. The Quiet Default State

When no scene is active (no AI output), show:
- Center: AI Orb (already exists)
- Below orb: subtle greeting text (`text-white/30`)
- Below that: 3-4 suggestion pills that glow on hover
  - "What's my day look like?"
  - "Search the web"
  - "Show my emails"
  - "Tell me something interesting"
- These pills submit as if the user typed them

### 6. Remove V3 Completely

Delete the V3 fallback path. If the AI doesn't call `display`, that's fine — just show the text response in a minimal way (small text panel bottom-left, not a full card).

### 7. Progressive Rendering

When AI starts processing:
1. Immediately show a skeleton panel (pulsing gray rectangles)
2. As data arrives via SSE, fill in the skeleton
3. When complete, skeleton settles into final state with a subtle "settled" animation

### 8. Typography Hierarchy

```
Labels:     text-[10px] uppercase tracking-[0.15em] text-white/40 font-medium
Titles:     text-base font-semibold text-white/90
Body:       text-sm text-white/70 leading-relaxed
Data/Nums:  text-2xl font-bold text-white tabular-nums (monospace for numbers)
Hero nums:  text-4xl font-bold text-white
Muted:      text-xs text-white/30
Sources:    text-[11px] text-white/25 italic
```

### 9. Metrics Should Pop

When showing a metric (like population count):
- Number is LARGE (text-4xl on hero, text-2xl on support)
- Animated counter (counts up from 0)
- Trend arrow (up/down) with color (green/red)
- Delta text below: "+6.4% since 2015" in green/red
- Optional sparkline (tiny line chart inline)

### 10. Lists Should Feel Interactive

Email/calendar lists:
- Items slide in with 50ms stagger
- Unread items have a teal dot
- Hover: slight left-shift + background brighten
- Click: item expands or opens detail view (replace element, not new panel)
- Subtle separator lines between items

---

## Implementation Order

1. Rewrite SceneRendererV4 with hero card layout pattern
2. Fix per-element close (not closeAll)
3. Add ambient breathe animation + label typography
4. Add skeleton/progressive rendering
5. Remove V3 fallback
6. Add suggestion pills for quiet state
7. Polish metrics, lists, charts
8. Test end-to-end with real queries
