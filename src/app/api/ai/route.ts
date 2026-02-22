import { NextRequest } from "next/server";
import { renderSceneTool, wrapV1Block } from "@/lib/scene-types";
import { sendEmail, refreshAccessToken } from "@/lib/google";

// Legacy tools kept for backward compat detection only
const V1_TOOL_NAMES = [
  "render_cards",
  "render_comparison",
  "render_stats",
  "render_chart",
  "render_timeline",
  "render_table",
  "render_email_compose",
];

function buildSystemPrompt(context?: {
  integrations?: string[];
  screen?: { width: number; height: number };
  time?: string;
  timezone?: string;
}) {
  const integrations = context?.integrations?.length
    ? context.integrations.join(", ")
    : "none";
  const screen = context?.screen
    ? `${context.screen.width}x${context.screen.height}`
    : "unknown";
  const device =
    context?.screen && context.screen.width < 768
      ? "mobile"
      : context?.screen && context.screen.width < 1024
        ? "tablet"
        : "desktop";
  const time = context?.time || new Date().toISOString();
  const tz = context?.timezone || "UTC";

  return `You are WHUT OS — a voice-first AI operating system with a glass morphism dark UI.

You have ONE tool: render_scene. ALWAYS use it for visual responses.

A scene is a spatial layout tree of components. You decide:
- What components to show
- How to arrange them (grid/flex/stack layout nodes)
- What data to display (inline data or dataSource bindings for connected integrations)
- What actions are available

CONTEXT (this request):
- Connected integrations: ${integrations}
- Screen: ${screen} (${device})
- Time: ${time} (${tz})

COMPONENT TYPES:
- stat-cards: Metric cards with label/value/change/icon
- email-list: Email inbox list (use dataSource: gmail/getRecentEmails)
- calendar-events: Calendar schedule (use dataSource: calendar/getUpcomingEvents)
- file-list: Drive files (use dataSource: drive/getRecentFiles)
- chart: Line/bar/area/pie charts with data arrays
- card-grid: Visual cards with images for lists (destinations, products, etc.)
- comparison: Side-by-side comparison of items with specs/pros/cons
- table: Structured tabular data with columns and rows
- timeline: Chronological events
- text-block: Short text/markdown content
- markdown: Longer markdown content
- email-compose: Email draft (to/subject/body) for user to review and send
- form: Dynamic form with fields and an action
- commerce-summary: Revenue/orders/profit summary
- action-button: Clickable action trigger

LAYOUT NODES:
- grid: CSS grid with columns (1-4) and gap
- flex: Flexbox with direction (row/col) and gap
- stack: Vertical stack with gap (shorthand for flex col)

DATA BINDINGS:
- Use dataSource for connected integrations (real data fetched at render time)
  Example: { "integration": "gmail", "method": "getRecentEmails", "params": { "maxResults": 10 } }
- Use inline data for AI-generated content (comparisons, recommendations, stats you compose)

DESIGN:
- WHUT OS uses a glass morphism dark theme — components render as translucent frosted-glass cards
- Consider visual hierarchy and spacing; use grid columns for dashboards, stack for focused views
- Keep text minimal — visuals do the heavy lifting
- For imageQuery fields, use descriptive terms for good photos

ACTIONS (server-side, in actions array):
- send_email: { to, subject, body } — executes before scene renders
- create_event: { summary, start, end, description } — future
- search_drive: { query } — future

RULES:
1. Compose SCENES, not single widgets. "Good morning" → stats + calendar + emails in a grid.
2. Use dataSource for connected integrations. Use inline data for AI-generated content.
3. Grid layouts: 2-4 columns for dashboards. Stack for single-focus views.
4. Keep it scannable. No walls of text. Visual hierarchy matters.
5. For email sending: use email-compose component so user can review before sending.
6. If user hasn't connected Google, tell them to connect via Integrations page.
7. Be direct, knowledgeable, and visually expressive. You ARE the OS.`;
}

export async function POST(req: NextRequest) {
  const {
    message,
    history,
    googleAccessToken,
    googleRefreshToken,
    context,
  } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No API key configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildSystemPrompt(context);
  const messages = [...(history || []), { role: "user", content: message }];

  try {
    // Call Claude with the single render_scene tool
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: [renderSceneTool],
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Execute server-side actions from render_scene tool calls
    const actionResults: Record<string, any> = {};
    for (const block of data.content || []) {
      if (block.type === "tool_use" && block.name === "render_scene") {
        const actions = block.input?.actions || [];
        for (const action of actions) {
          if (action.type === "send_email" && action.params) {
            const { to, subject, body } = action.params;
            if (to && subject && body) {
              let token = googleAccessToken;
              try {
                const result = await sendEmail(token, to, subject, body);
                actionResults["send_email"] = { success: true, messageId: result.id };
              } catch (err: any) {
                // Try refresh
                if (googleRefreshToken && err.message?.includes("401")) {
                  try {
                    const refreshed = await refreshAccessToken(googleRefreshToken);
                    if (refreshed.access_token) {
                      const result = await sendEmail(refreshed.access_token, to, subject, body);
                      actionResults["send_email"] = { success: true, messageId: result.id };
                    }
                  } catch {
                    actionResults["send_email"] = { success: false, error: "Token refresh failed" };
                  }
                } else {
                  actionResults["send_email"] = { success: false, error: err.message };
                }
              }
            }
          }
          // create_event and search_drive can be added here
        }
      }
    }

    // Parse content blocks into response format
    // Supports both V2 (render_scene) and V1 (old tool names) for backward compat
    const blocks: any[] = [];
    for (const block of data.content || []) {
      if (block.type === "text" && block.text) {
        blocks.push({ type: "text", content: block.text });
      } else if (block.type === "tool_use") {
        if (block.name === "render_scene") {
          // V2: scene graph
          blocks.push({
            type: "render_scene",
            data: block.input,
            actionResults,
          });
        } else if (V1_TOOL_NAMES.includes(block.name)) {
          // V1 backward compat: wrap old tool output in a scene node
          const sceneNode = wrapV1Block(block.name, block.input);
          blocks.push({
            type: "render_scene",
            data: {
              layout: { type: "stack", gap: 12, children: [sceneNode] },
            },
          });
          // Also emit old format for existing VisualizationEngine
          blocks.push({ type: block.name, data: block.input });
        }
      }
    }

    // Extract scene from blocks for top-level access
    const sceneBlock = blocks.find((b: any) => b.type === "render_scene");
    const scene = sceneBlock ? sceneBlock.data : undefined;

    return new Response(JSON.stringify({ blocks, scene }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
