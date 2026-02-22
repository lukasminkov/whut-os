import { NextRequest } from "next/server";
import { AI_TOOLS, V3_SYSTEM_PROMPT } from "@/lib/tools";
import {
  getRecentEmails,
  getMessage,
  getUpcomingEvents,
  getRecentDriveFiles,
  sendEmail,
  archiveEmail,
  refreshAccessToken,
} from "@/lib/google";
import {
  SKILL_ONBOARDING,
  INTEGRATION_SKILLS,
} from "@/lib/skills";

// ── Helpers ──────────────────────────────────────────

function buildSystemPrompt(context: any) {
  const integrations = context?.integrations || [];
  const profile = context?.userProfile || {};
  const tz = context?.timezone || profile?.timezone || "UTC";
  const time = context?.time || new Date().toISOString();
  const isOnboarding = !profile?.name || ["welcome", "name", "role", "integrations"].includes(profile?.onboardingStep);

  let prompt = V3_SYSTEM_PROMPT;

  // Add onboarding skill if needed
  if (isOnboarding) {
    prompt += `\n\n${SKILL_ONBOARDING}`;
    const step = profile?.onboardingStep || "welcome";
    prompt += `\n\n## ONBOARDING MODE\nCurrent step: ${step}`;
    if (profile?.name) prompt += `\nName: ${profile.name}`;
    if (profile?.role) prompt += `\nRole: ${profile.role}`;
  }

  // Add integration skills
  for (const i of integrations) {
    const skill = INTEGRATION_SKILLS[i];
    if (skill) prompt += `\n\n${skill}`;
  }

  // User context
  prompt += `\n\n## Context\n- Time: ${time} (${tz})`;
  if (profile?.name) prompt += `\n- User: ${profile.name}`;
  if (integrations.length) prompt += `\n- Connected: ${integrations.join(", ")}`;
  else prompt += `\n- No integrations connected`;

  return prompt;
}

// Smart model selection
function selectModel(msg: string): string {
  const lower = msg.toLowerCase();
  const opusPatterns = [
    /\b(analy[sz]e|compare|evaluate|research|investigate|explain)\b/,
    /\b(strateg|plan|architect|design|brainstorm)\b/,
    /\b(write|draft|compose).{0,20}(report|proposal|document)/,
  ];
  if (opusPatterns.some(p => p.test(lower)) || lower.length > 300) return "claude-opus-4-6";
  return "claude-sonnet-4-6";
}

// Execute a tool call server-side
async function executeTool(
  name: string,
  input: any,
  tokens: { access?: string; refresh?: string },
): Promise<{ result: any; status?: string }> {
  let accessToken = tokens.access || "";

  // Helper: refresh token on 401
  const withRefresh = async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
    try {
      return await fn(accessToken);
    } catch (err: any) {
      if (tokens.refresh && err.message?.includes("401")) {
        const refreshed = await refreshAccessToken(tokens.refresh);
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          return await fn(accessToken);
        }
      }
      throw err;
    }
  };

  switch (name) {
    case "fetch_emails": {
      const emails = await withRefresh(t => getRecentEmails(t, input.maxResults || 10));
      return { result: { emails }, status: "Checked your emails" };
    }
    case "get_email": {
      const email = await withRefresh(t => getMessage(t, input.id));
      return { result: email, status: "Reading email" };
    }
    case "fetch_calendar": {
      const events = await withRefresh(t => getUpcomingEvents(t, input.maxResults || 10));
      // Normalize Google Calendar shape
      const normalized = events.map((e: any) => ({
        title: e.summary || e.title || "Untitled",
        start: e.start?.dateTime || e.start?.date || e.start || "",
        end: e.end?.dateTime || e.end?.date || e.end || "",
        location: e.location || "",
      }));
      return { result: { events: normalized }, status: "Checked your calendar" };
    }
    case "fetch_drive_files": {
      const files = await withRefresh(t => getRecentDriveFiles(t, input.maxResults || 15));
      const normalized = files.map((f: any) => ({
        name: f.name,
        type: f.mimeType || "",
        modified: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : "",
        link: f.webViewLink || "",
      }));
      return { result: { files: normalized }, status: "Checked your files" };
    }
    case "search_web": {
      const searchUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://whut.ai"}/api/search?q=${encodeURIComponent(input.query)}`;
      try {
        const res = await fetch(searchUrl);
        const data = await res.json();
        return { result: data, status: `Searched for "${input.query}"` };
      } catch {
        return { result: { results: [] }, status: "Search failed" };
      }
    }
    case "send_email": {
      const sent = await withRefresh(t => sendEmail(t, input.to, input.subject, input.body));
      return { result: { success: true, messageId: sent.id }, status: `Sent email to ${input.to}` };
    }
    case "archive_email": {
      await withRefresh(t => archiveEmail(t, input.id));
      return { result: { success: true }, status: "Archived email" };
    }
    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}

// ── Main Route (SSE Streaming) ──────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    message,
    history,
    googleAccessToken,
    googleRefreshToken,
    context,
    userProfile,
  } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "No API key configured" }, { status: 500 });
  }

  const enrichedContext = { ...context, userProfile: userProfile || {} };
  const systemPrompt = buildSystemPrompt(enrichedContext);
  const messages = [...(history || []), { role: "user", content: message }];
  const model = selectModel(message);
  const tokens = { access: googleAccessToken, refresh: googleRefreshToken };

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        let currentMessages = messages;
        let maxIterations = 8; // Prevent infinite tool loops

        while (maxIterations-- > 0) {
          // Call Claude
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: 4096,
              system: systemPrompt,
              tools: AI_TOOLS,
              messages: currentMessages,
            }),
          });

          if (!response.ok) {
            const err = await response.text();
            send({ type: "error", error: err });
            break;
          }

          const data = await response.json();

          // Check if we got tool_use blocks
          const toolUses = (data.content || []).filter((b: any) => b.type === "tool_use");
          const textBlocks = (data.content || []).filter((b: any) => b.type === "text");

          // If render_cards is called, that's our final output
          const renderCall = toolUses.find((t: any) => t.name === "render_cards");
          if (renderCall) {
            const { spoken, cards } = renderCall.input;
            // Stream cards one by one
            for (const card of cards || []) {
              send({ type: "card", card });
            }
            send({ type: "done", text: spoken || "" });
            break;
          }

          // If no tool calls at all, generate a fallback response
          if (toolUses.length === 0) {
            const text = textBlocks.map((b: any) => b.text).join("\n") || "I'm here. How can I help?";
            // Wrap as a content card
            send({
              type: "card",
              card: {
                id: "text-" + Date.now(),
                type: "content",
                title: "Response",
                data: { text },
                size: "medium",
                priority: 1,
                interactive: false,
              },
            });
            send({ type: "done", text: text.slice(0, 200) });
            break;
          }

          // Execute tool calls and feed results back
          const toolResults: any[] = [];

          // Add assistant's response to messages
          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: data.content },
          ];

          for (const tool of toolUses) {
            // Stream status
            const statusMap: Record<string, string> = {
              fetch_emails: "Checking your emails...",
              fetch_calendar: "Looking at your calendar...",
              fetch_drive_files: "Browsing your files...",
              search_web: `Searching for "${tool.input.query || ""}..."`,
              send_email: "Sending email...",
              get_email: "Reading email...",
              archive_email: "Archiving...",
            };
            send({ type: "status", text: statusMap[tool.name] || `Running ${tool.name}...` });

            try {
              const { result } = await executeTool(tool.name, tool.input, tokens);
              toolResults.push({
                type: "tool_result",
                tool_use_id: tool.id,
                content: JSON.stringify(result),
              });
            } catch (err: any) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: tool.id,
                content: JSON.stringify({ error: err.message || "Tool execution failed" }),
                is_error: true,
              });
            }
          }

          // Add tool results to messages for next iteration
          currentMessages = [
            ...currentMessages,
            { role: "user", content: toolResults },
          ];
        }
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", error: err.message }) + "\n")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
