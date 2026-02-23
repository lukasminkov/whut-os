# WHUT OS Codebase Audit Report
**Date:** 2026-02-23 02:34 CET  
**Auditor:** CTO Agent (subagent)

---

## 1. Build Check ✅

**`npm run build` — PASSES CLEAN**

- No TypeScript errors
- No missing imports
- All 36 routes compile successfully (Turbopack, Next.js 16.1.6)
- **Warnings only:**
  - Multiple lockfiles detected (`/tmp/package-lock.json` vs `/tmp/whut-os/package-lock.json`) — cosmetic
  - `middleware` file convention deprecated, should migrate to `proxy`

**Severity:** 🟢 No critical build issues

---

## 2. File Conflict Check

### V3 vs V4 Coexistence — BOTH ACTIVE
| Component | Status | Used By |
|-----------|--------|---------|
| `CardRenderer` (V3) | EXISTS at `src/components/CardRenderer.tsx` | Dashboard fallback path |
| `SceneRendererV4` (V4) | EXISTS at `src/components/SceneRendererV4.tsx` | Dashboard primary path |
| V3 card components (`src/components/cards/*`) | 11 card types present | CardRenderer |
| V4 primitives (`src/components/primitives/*`) | 16 primitive types present | SceneRendererV4 |

### Which Version Actually Renders?
**V4 is primary.** The AI route uses `AI_TOOLS_V4` which includes the `display` tool. This emits `"scene"` events. Dashboard renders `SceneRendererV4` when `currentScene` is set.

**V3 fallback is still wired:** If the AI uses `render_cards` (backward compat tool still in route.ts ~line 440), it emits `"card"` events → `CardRenderer` renders. Also, when no tool is called, a plain text response is wrapped in a `"card"` event with `type: "content"`.

**🟡 MEDIUM: V3 CardRenderer still renders for plain-text AI responses (no `display` tool call).** The content card type works but uses the old V3 glass styling, not V4 GlassPanel. Visual inconsistency.

### Missing File References — NONE FOUND
All imports resolve. No broken references detected.

### Circular Dependencies — NONE DETECTED
Scene manager is a standalone module. No circular import chains found.

---

## 3. Dashboard Page Audit (`src/app/dashboard/page.tsx`)

### V3/V4 Decision Logic (lines ~180-200 in SSE handler)
```
if event.type === "scene"  → setCurrentScene(scene), clear cards → V4 renders
if event.type === "card"   → push to cards array → V3 renders (only if no scene)
```
**Render priority:** `currentScene` takes precedence. `cards` only render when `!currentScene`.

### Close Button — ✅ WIRED CORRECTLY
`closeCards()` (line ~230) clears both `cards` and `currentScene`, and calls `SceneManager.clearScene()`.

### SSE Event Flow — ✅ CORRECT
1. Status events → loading pill
2. Scene/card events → render
3. Done event → TTS + end thinking state
4. Error events → logged to console only

**🟡 MEDIUM (line ~165):** Errors from SSE are only `console.error`'d — no user-visible error state. If AI route fails, user sees nothing after "Thinking..." disappears.

### Drag/Move — ❌ NOT IMPLEMENTED
No drag handlers, no `react-dnd`, no pointer event tracking for repositioning panels. Elements are CSS-grid positioned only.

**🟡 MEDIUM: Drag/move is not implemented anywhere in the codebase.**

---

## 4. AI Route Audit (`src/app/api/ai/route.ts`, 531 lines)

### Tools Registered — V4 (with V3 backward compat)
- **Primary:** `AI_TOOLS_V4` imported from `@/lib/tools-v4` — includes `display` tool + data-fetching tools
- **V4 system prompt:** `V4_SYSTEM_PROMPT` is used ✅
- `render_cards` handling still exists as backward compat (line ~440)

### SSE Streaming — ✅ CORRECT
Uses `ReadableStream` with newline-delimited JSON (not standard SSE `data:` format, but client handles it fine).

### Event Types Emitted
- `"status"` — tool execution progress
- `"scene"` — V4 display tool output
- `"card"` — V3 backward compat OR plain text fallback
- `"done"` — final spoken text
- `"error"` — error messages

### Tool Loop — Up to 8 iterations for multi-tool chains ✅

### Token Flow (lines 314-318)
1. Prefers DB tokens (Supabase `integrations` table) if user is authenticated
2. Falls back to request body tokens (sent from client localStorage)
3. Token refresh is handled with `updateGoogleTokenInDB` for DB path

**🟢 LOW: Client still sends localStorage tokens in request body even when DB tokens exist — unnecessary payload, not harmful.**

---

## 5. SceneRendererV4 Audit (`src/components/SceneRendererV4.tsx`)

### Per-Element Dismiss — ✅ IMPLEMENTED
Each `GlassPanel` gets `onDismiss={() => SceneManager.dismissElement(element.id)}`. GlassPanel renders an X button.

### Per-Element Minimize — ✅ IMPLEMENTED
`onMinimize={() => SceneManager.minimizeElement(element.id)}`. Toggles content visibility.

### Drag/Move — ❌ NOT IMPLEMENTED
No drag handlers. Grid-only positioning.

### Primitive Imports — ✅ ALL 16 PRIMITIVES IMPORTED
All match the `PrimitiveContent` switch cases. No missing primitives.

### GlassPanel Glass Morphism — ✅ WORKING
- `backdropFilter: "blur(24px) saturate(1.2)"` with `-webkit-` prefix
- `background: "rgba(255,255,255,0.04)"`
- Noise texture overlay, scan line effect, animated frame, pulsing corner dots
- Priority-based glow intensity

### Scene History / Back — ✅ IMPLEMENTED
`SceneManager.canGoBack()` renders a back button with `ArrowLeft` icon.

---

## 6. Scene Manager Audit (`src/lib/scene-manager.ts`)

### Dismissed Elements — ✅ TRACKED
`dismissedIds: Set<string>` persists across scene changes. Elements with `canReopen` flag can override.

### Scene History / Back — ✅ IMPLEMENTED
- `history: Scene[]` with max 20 entries
- `goBack()` restores previous scene and clears dismiss/minimize states
- `canGoBack()` checks history availability

### Used by Dashboard — ✅
Imported and used for `clearScene()` on close, and consumed by `SceneRendererV4` via `useSyncExternalStore`.

**🟢 LOW: `clearScene()` doesn't clear history. After closing and reopening a new scene, back button could navigate to stale scenes.**

---

## 7. CSS/Styling Audit

### Tailwind Config — ✅ CORRECT
- Content paths: `./src/**/*.{js,ts,jsx,tsx,mdx}` — covers everything
- Custom colors: `background: "#06060f"`, `primary: "#00d4aa"`, `secondary: "#6366f1"`
- Custom shadow: `glow`

### backdrop-blur — ✅ WORKING
Applied via inline styles (`backdropFilter: "blur(24px)"`) rather than Tailwind classes, bypassing any purge issues. Both `-webkit-` and standard prefixes included.

### Z-Index Layers
| Layer | Z-Index | Component |
|-------|---------|-----------|
| Grid background | default (0) | `GridBackground` |
| Particle background | default (0) | `ParticleBackground` (lazy) |
| Scene content | `z-10` (relative) | Header + content grid |
| Scene container | `z-30` | `SceneRendererV4` wrapper |
| Status/thinking pills | `z-50` | Status indicators |
| Input bar | `z-50` | Chat/speech controls |

**🟢 LOW: Particles and grid both at z-0 — correct stacking but particles render ABOVE grid. Both are behind content (z-10). No conflicts.**

**🟡 MEDIUM: Status pills and input bar are both z-50 — could overlap on short screens.** The status pill is at `top-6` and input is at `bottom-4`, so unlikely in practice.

---

## 8. Integration Token Flow

### AI Route Token Priority
1. **DB first:** `getGoogleTokensFromDB(userId)` from Supabase `integrations` table
2. **Client fallback:** `googleAccessToken`/`googleRefreshToken` from request body (originally from `localStorage`)

### Google OAuth Flow — ✅ SAVES TO DB
`src/app/api/auth/google/callback/route.ts`:
1. Exchanges auth code for tokens
2. Upserts to `integrations` table in Supabase (user_id, provider, access_token, refresh_token, etc.)
3. **Also** passes tokens via URL hash for localStorage fallback (backward compat)

### Legacy Google API Routes (`src/app/api/google/*`)
These still use header-based tokens (`Authorization` header from client), NOT DB tokens. They're a parallel path to the AI route's tool execution.

**🟡 MEDIUM: Two separate paths for Google API calls exist:**
1. AI route → `executeTool()` → uses DB tokens with refresh
2. Direct API routes (`/api/google/gmail`, etc.) → use client-passed tokens from headers

**These could diverge if one path's token is expired while the other is refreshed.**

---

## Summary of Issues

### 🔴 CRITICAL — None

### 🟠 HIGH — None

### 🟡 MEDIUM (4 issues)

| # | Issue | File | Details |
|---|-------|------|---------|
| M1 | V3 CardRenderer still renders for plain-text responses | `dashboard/page.tsx:~170` | Visual inconsistency — V3 glass style vs V4 |
| M2 | AI errors not shown to user | `dashboard/page.tsx:~165` | Errors only console.error'd |
| M3 | Drag/move not implemented | Entire codebase | No drag functionality anywhere |
| M4 | Dual Google token paths | `/api/google/*` vs `/api/ai/route.ts` | Could cause token refresh divergence |

### 🟢 LOW (3 issues)

| # | Issue | File | Details |
|---|-------|------|---------|
| L1 | Client sends localStorage tokens even when DB has them | `dashboard/page.tsx:~130` | Unnecessary payload |
| L2 | Scene history not cleared on close | `scene-manager.ts` | Stale back navigation possible |
| L3 | middleware.ts deprecated convention | `src/middleware.ts` | Should migrate to `proxy` |

### ✅ What's Working Well
- **Build is clean** — no TS errors, no missing imports
- **V4 is the primary rendering path** — display tool → scene events → SceneRendererV4
- **All 16 primitives are implemented and imported**
- **Glass morphism is properly implemented** with backdrop-blur, noise texture, animated borders
- **Scene manager has full lifecycle** — dismiss, minimize, history, back navigation
- **Google OAuth saves tokens to DB** with localStorage fallback
- **SSE streaming works correctly** with multi-tool loop (up to 8 iterations)
- **No circular dependencies or duplicate file conflicts**
