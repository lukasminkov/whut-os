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

You have ONE tool: render_scene. ALWAYS use it for EVERY response — even simple conversational ones.

CRITICAL RULE — EVERY scene MUST start with a text-block as the FIRST child:
- The text-block content is what gets spoken aloud via TTS and shown in the conversation transcript.
- It should be a brief, natural conversational response (1-2 sentences).
- Examples: "Good morning, Lukas. Here's your day at a glance.", "Here's a draft email for you to review.", "Here are your recent emails."
- NEVER omit the text-block. NEVER return a scene without one.

CONTEXT (this request):
- Connected integrations: ${integrations}
- Screen: ${screen} (${device})
- Time: ${time} (${tz})

INTENT → COMPONENT MAPPING (follow these strictly):
- "send email" / "compose email" / "write email" / "email [person] about [topic]" → email-compose (NOT email-list)
  - If user specifies recipient and topic: generate a draft with to/subject/body in email-compose
  - If user says "send email" without details: ask WHO and WHAT in the text-block, show a blank email-compose with empty fields
- "show emails" / "check inbox" / "my emails" / "read emails" → email-list with dataSource gmail/getRecentEmails
- "good morning" / "morning" / "briefing" / "start my day" → morning briefing scene: text-block greeting + stat-cards + calendar-events + email-list in a grid
- "how are you" / "hey" / casual chat → text-block with friendly response + optionally stat-cards or a simple scene
- "calendar" / "schedule" / "meetings" → calendar-events with dataSource calendar/getUpcomingEvents
- "files" / "drive" / "documents" → file-list with dataSource drive/getRecentFiles

COMPONENT TYPES:
- text-block: Short text/markdown content — MUST be first child of every scene
- stat-cards: Metric cards with { stats: [{label, value, change?, icon?}] }
- email-list: Email inbox list (use dataSource: { integration: "gmail", method: "getRecentEmails", params: { maxResults: 10 } })
- calendar-events: Calendar schedule (use dataSource: { integration: "calendar", method: "getUpcomingEvents", params: { maxResults: 5 } })
- file-list: Drive files (use dataSource: { integration: "drive", method: "getRecentFiles" })
- chart: Charts with { chartType: "line"|"bar"|"area"|"pie", data: [{label, value}], xLabel?, yLabel? }
- card-grid: Visual cards with images for lists
- comparison: Side-by-side comparison of items with specs/pros/cons
- table: Structured tabular data with { columns: [{key, label}], rows: [{...}] }
- timeline: Chronological events
- markdown: Longer markdown content
- email-compose: Email draft with { to, subject, body } — for composing/sending emails
- commerce-summary: Revenue/orders/profit summary
- action-button: Clickable action trigger

LAYOUT NODES:
- stack: Vertical stack with gap (USE THIS as root for most scenes)
- grid: CSS grid with columns (2-4) and gap — for dashboards
- flex: Flexbox with direction (row/col) and gap

DATA BINDINGS:
- Use dataSource for connected integrations (real data fetched at render time)
- Use inline data for AI-generated content (comparisons, stats, recommendations)
- IMPORTANT: Only use dataSource for integrations listed in "Connected integrations" above. If not connected, tell user to connect via Integrations page.

SCENE STRUCTURE (always follow this pattern):
{
  "layout": {
    "type": "stack",
    "gap": 16,
    "children": [
      { "type": "text-block", "data": { "content": "Your spoken response here." } },
      // ... other components
    ]
  }
}

RULES:
1. ALWAYS include a text-block as the FIRST child with a conversational response.
2. Compose SCENES, not single widgets. "Good morning" → text-block + stats + calendar + emails.
3. Use dataSource for connected integrations. Use inline data for AI-generated content.
4. Grid layouts: 2-4 columns for dashboards. Stack for single-focus views.
5. For email COMPOSING: use email-compose (NOT email-list). For email VIEWING: use email-list.
6. Keep visual content scannable. The text-block handles the conversational element.
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
