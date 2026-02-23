import { NextRequest } from "next/server";
import { AI_TOOLS_V4, V4_SYSTEM_PROMPT } from "@/lib/tools-v4";
import {
  getRecentEmails, getMessage, getUpcomingEvents, getRecentDriveFiles,
  sendEmail, archiveEmail, refreshAccessToken,
} from "@/lib/google";
import { SKILL_ONBOARDING, INTEGRATION_SKILLS } from "@/lib/skills";
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase-server";
import { loadUserMemories, loadTopMemorySummary } from "@/lib/memory";
import { selectModel } from "@/lib/model-router";
import { runBackgroundTasks, getTodayUsageStats } from "@/lib/background";
import { recordToolError } from "@/lib/self-improve";
import { searchMemoriesSemantic } from "@/lib/embeddings";

// ── Helpers ──────────────────────────────────────────

async function getUser(): Promise<{ id: string; email?: string } | null> {
  if (!isSupabaseServerConfigured()) return null;
  try {
    const supabase = await createServerClient();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email } : null;
  } catch { return null; }
}

async function getGoogleTokens(userId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from('integrations')
    .select('access_token, refresh_token')
    .eq('user_id', userId).eq('provider', 'google').single();
  return data ? { access: data.access_token, refresh: data.refresh_token || "" } : null;
}

async function updateGoogleToken(userId: string, token: string) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from('integrations').update({
    access_token: token,
    token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('provider', 'google');
}

async function loadIntegrations(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from('integrations').select('provider').eq('user_id', userId);
  return (data || []).map(i => i.provider);
}

async function loadHistory(conversationId: string): Promise<{ role: string; content: string }[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ? data.reverse().map(m => ({ role: m.role, content: m.content })) : [];
}

async function getMessageCount(conversationId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const { count } = await admin.from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);
  return count || 0;
}

async function saveMessage(conversationId: string, role: string, content: string, extra?: { scene_data?: any; model?: string; tokens_in?: number; tokens_out?: number }) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from('messages').insert({
    conversation_id: conversationId,
    role,
    content,
    scene_data: extra?.scene_data || null,
    model: extra?.model || null,
    tokens_in: extra?.tokens_in || null,
    tokens_out: extra?.tokens_out || null,
  });
  await admin.from('conversations').update({
    last_message_at: new Date().toISOString(),
  }).eq('id', conversationId);
}

// ── System Prompt Builder ────────────────────────────

function buildSystemPrompt(opts: {
  context: any; memoryBlock: string; integrations: string[];
  topMemories: string[]; usageStats: any; relevantMemories: any[];
}) {
  const { context, memoryBlock, integrations, topMemories, usageStats, relevantMemories } = opts;
  const profile = context?.userProfile || {};
  const tz = context?.timezone || profile?.timezone || "UTC";
  const time = context?.time || new Date().toISOString();
  const isOnboarding = !profile?.name || ["welcome", "name", "role", "integrations"].includes(profile?.onboardingStep);

  let prompt = V4_SYSTEM_PROMPT;

  if (isOnboarding) {
    prompt += `\n\n${SKILL_ONBOARDING}`;
    const step = profile?.onboardingStep || "welcome";
    prompt += `\n\n## ONBOARDING MODE\nCurrent step: ${step}`;
    if (profile?.name) prompt += `\nName: ${profile.name}`;
    if (profile?.role) prompt += `\nRole: ${profile.role}`;
  }

  for (const i of integrations) {
    const skill = INTEGRATION_SKILLS[i];
    if (skill) prompt += `\n\n${skill}`;
  }

  prompt += `\n\n## Your Capabilities\nYou are connected to:`;
  const caps: Record<string, { label: string; desc: string }> = {
    google: { label: "Google (Gmail, Calendar, Drive)", desc: "read emails, send emails, archive, view calendar, list files" },
    notion: { label: "Notion", desc: "search pages" },
    slack: { label: "Slack", desc: "list channels, send messages" },
    tiktok: { label: "TikTok Shop", desc: "view orders, analytics" },
  };
  for (const [key, info] of Object.entries(caps)) {
    prompt += `\n- ${info.label}: ${integrations.includes(key) ? `✓ (${info.desc})` : "✗ not connected"}`;
  }
  prompt += `\n- Web Search: ✓ always available`;
  prompt += `\n\nYou can display: metrics, lists, charts (line/bar/radial), images, tables, timelines, search results, rich text.`;

  if (topMemories.length > 0) {
    prompt += `\n\nYou remember:`;
    for (const mem of topMemories) prompt += `\n- ${mem}`;
  }

  if (usageStats?.requests > 0) {
    prompt += `\n\nToday's usage: ${usageStats.requests} requests, ~${Math.round(usageStats.totalTokens / 1000)}K tokens, $${(usageStats.costCents / 100).toFixed(4)}`;
  }

  prompt += `\n\n## Context\n- Time: ${time} (${tz})`;
  if (profile?.name) prompt += `\n- User: ${profile.name}`;
  if (profile?.role) prompt += `\n- Role: ${profile.role}`;

  if (relevantMemories.length > 0) {
    prompt += `\n\n## Relevant memories:\n` + relevantMemories.map((m: any) => `- ${m.fact || m.content}`).join("\n");
  }

  if (memoryBlock) prompt += memoryBlock;

  prompt += `\n\n## Guidelines
- When uncertain, say so clearly rather than guessing.
- If a tool call fails, analyze why and try an alternative approach.
- If the user corrects you, acknowledge the correction gracefully.
- Remember user preferences and adapt your communication style.`;

  return prompt;
}

// ── Tool Execution ──────────────────────────────────

async function executeTool(
  name: string, input: any,
  tokens: { access: string; refresh: string },
  userId?: string,
): Promise<{ result: any; status?: string }> {
  let accessToken = tokens.access || "";

  const withRefresh = async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
    try { return await fn(accessToken); }
    catch (err: any) {
      if (tokens.refresh && err.message?.includes("401")) {
        const refreshed = await refreshAccessToken(tokens.refresh);
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          if (userId) await updateGoogleToken(userId, accessToken);
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
        name: f.name, type: f.mimeType || "",
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
        if (!data.results?.length) {
          return { result: { results: [], query: input.query, error: "No results found." }, status: `No results for "${input.query}"` };
        }
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://whut.ai";
        const enriched = await Promise.all(data.results.slice(0, 6).map(async (r: any) => {
          if (r.image) return r;
          try {
            const imgRes = await fetch(`${baseUrl}/api/image-proxy?url=${encodeURIComponent(r.url)}`, { signal: AbortSignal.timeout(3000) });
            const imgData = await imgRes.json();
            return { ...r, image: imgData.image || null };
          } catch { return r; }
        }));
        return { result: { results: enriched, query: input.query }, status: `Searched for "${input.query}"` };
      } catch {
        return { result: { results: [], query: input.query, error: "Search unavailable." }, status: "Search failed" };
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
    case "read_page": {
      const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://whut.ai"}/api/read-page?url=${encodeURIComponent(input.url)}`;
      try {
        const res = await fetch(pageUrl, { signal: AbortSignal.timeout(10000) });
        return { result: await res.json(), status: `Reading ${new URL(input.url).hostname}...` };
      } catch {
        return { result: { error: "Could not read page" }, status: "Read failed" };
      }
    }
    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}

// ── Main Route ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, images, context, userProfile, conversationId } = body;

  // Build user content (text or multimodal)
  let userContent: any = message;
  if (images?.length) {
    userContent = [
      ...images.map((img: string) => ({
        type: "image",
        source: img.startsWith("data:")
          ? { type: "base64" as const, media_type: img.split(";")[0].split(":")[1], data: img.split(",")[1] }
          : { type: "url" as const, url: img },
      })),
      { type: "text", text: message },
    ];
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "No API key configured" }, { status: 500 });

  // 1. Authenticate
  const user = await getUser();

  // 2. Get tokens
  let tokens = { access: "", refresh: "" };
  if (user) {
    const dbTokens = await getGoogleTokens(user.id);
    if (dbTokens) tokens = { access: dbTokens.access, refresh: dbTokens.refresh };
  }

  // 3. Load context in parallel
  const [memoryBlock, topMemories, integrations, usageStats, relevantMemories, dbHistory, msgCount] = await Promise.all([
    user ? loadUserMemories(user.id, 20, message) : Promise.resolve(""),
    user ? loadTopMemorySummary(user.id) : Promise.resolve([]),
    user ? loadIntegrations(user.id) : Promise.resolve([]),
    user ? getTodayUsageStats(user.id) : Promise.resolve(null),
    user ? searchMemoriesSemantic(createAdminClient(), user.id, message, 10) : Promise.resolve([]),
    conversationId ? loadHistory(conversationId) : Promise.resolve([]),
    conversationId ? getMessageCount(conversationId) : Promise.resolve(0),
  ]);

  const isFirstMessage = msgCount === 0;

  // 4. Save user message to DB
  if (user && conversationId) {
    saveMessage(conversationId, "user", message).catch(() => {});
  }

  // 5. Build system prompt
  const enrichedContext = { ...context, userProfile: userProfile || {}, integrations };
  const systemPrompt = buildSystemPrompt({
    context: enrichedContext, memoryBlock, integrations, topMemories, usageStats, relevantMemories,
  });

  // 6. Build messages (DB history + current)
  const messages = [...dbHistory, { role: "user", content: userContent }];
  const { model } = selectModel(message);

  // 7. Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        let currentMessages = messages;
        let maxIterations = 5;
        let totalTokensIn = 0;
        let totalTokensOut = 0;
        let fullResponseText = "";
        let sceneData: any = null;
        const toolsUsed: string[] = [];
        let hadErrors = false;

        while (maxIterations-- > 0) {
          const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model, max_tokens: 4096, stream: true,
              system: systemPrompt, tools: AI_TOOLS_V4,
              messages: currentMessages,
            }),
          });

          if (!claudeResponse.ok) {
            send({ type: "error", error: await claudeResponse.text() });
            break;
          }

          // Parse SSE
          const reader = claudeResponse.body!.getReader();
          const dec = new TextDecoder();
          let buf = "";
          let fullContent: any[] = [];
          let currentText = "";
          let usage = { input_tokens: 0, output_tokens: 0 };
          let stopReason = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const d = line.slice(6);
              if (d === "[DONE]") continue;
              try {
                const ev = JSON.parse(d);
                switch (ev.type) {
                  case "message_start":
                    usage.input_tokens = ev.message?.usage?.input_tokens || 0;
                    break;
                  case "content_block_start":
                    if (ev.content_block?.type === "text") currentText = "";
                    else if (ev.content_block?.type === "tool_use") {
                      fullContent.push({ type: "tool_use", id: ev.content_block.id, name: ev.content_block.name, input: "" });
                    }
                    break;
                  case "content_block_delta":
                    if (ev.delta?.type === "text_delta") {
                      currentText += ev.delta.text;
                      send({ type: "text_delta", text: ev.delta.text });
                    } else if (ev.delta?.type === "input_json_delta") {
                      const last = fullContent[fullContent.length - 1];
                      if (last?.type === "tool_use") last.input += ev.delta.partial_json;
                    }
                    break;
                  case "content_block_stop":
                    if (currentText) { fullContent.push({ type: "text", text: currentText }); currentText = ""; }
                    const last = fullContent[fullContent.length - 1];
                    if (last?.type === "tool_use" && typeof last.input === "string") {
                      try { last.input = JSON.parse(last.input); } catch { last.input = {}; }
                    }
                    break;
                  case "message_delta":
                    usage.output_tokens = ev.usage?.output_tokens || 0;
                    stopReason = ev.delta?.stop_reason || stopReason;
                    break;
                }
              } catch {}
            }
          }

          totalTokensIn += usage.input_tokens;
          totalTokensOut += usage.output_tokens;

          const toolUses = fullContent.filter((b: any) => b.type === "tool_use");
          const textBlocks = fullContent.filter((b: any) => b.type === "text");

          // Handle display tool
          const displayCall = toolUses.find((t: any) => t.name === "display");
          if (displayCall) {
            const { spoken, intent, layout, elements } = displayCall.input;
            const scene = {
              id: `scene-${Date.now()}`, intent: intent || "", layout: layout || "focused",
              elements: (elements || []).map((el: any) => ({ ...el, priority: el.priority || 2, size: el.size || "md" })),
              spoken: spoken || "",
            };
            sceneData = scene;
            fullResponseText = spoken || "";
            send({ type: "scene", scene });
            send({ type: "done", text: fullResponseText });
            break;
          }

          // Handle render_cards (legacy)
          const renderCall = toolUses.find((t: any) => t.name === "render_cards");
          if (renderCall) {
            const { spoken, cards } = renderCall.input;
            fullResponseText = spoken || "";
            for (const card of (cards || [])) send({ type: "card", card });
            send({ type: "done", text: fullResponseText });
            break;
          }

          // No tools — pure text response
          if (toolUses.length === 0) {
            fullResponseText = textBlocks.map((b: any) => b.text).join("\n") || "I'm here. How can I help?";
            send({ type: "done", text: fullResponseText });
            break;
          }

          // Execute tools and loop
          currentMessages = [...currentMessages, { role: "assistant", content: fullContent }];
          const toolResults: any[] = [];

          for (const tool of toolUses) {
            toolsUsed.push(tool.name);
            const statusMap: Record<string, string> = {
              fetch_emails: "Checking your emails...",
              fetch_calendar: "Looking at your calendar...",
              fetch_drive_files: "Browsing your files...",
              search_web: `Searching for "${tool.input.query || ""}"...`,
              send_email: "Sending email...",
              get_email: "Reading email...",
              archive_email: "Archiving...",
              read_page: "Reading page...",
            };
            send({ type: "status", text: statusMap[tool.name] || `Running ${tool.name}...` });

            try {
              const { result } = await executeTool(tool.name, tool.input, tokens, user?.id);
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: JSON.stringify(result) });
            } catch (err: any) {
              hadErrors = true;
              toolResults.push({
                type: "tool_result", tool_use_id: tool.id, is_error: true,
                content: JSON.stringify({ error: err.message || "Tool failed", hint: "Try an alternative approach." }),
              });
              if (user) recordToolError(user.id, tool.name, err.message || "", JSON.stringify(tool.input).slice(0, 200)).catch(() => {});
            }
          }

          currentMessages = [...currentMessages, { role: "user", content: toolResults }];
        }

        // 8. Save assistant message to DB
        if (user && conversationId && fullResponseText) {
          saveMessage(conversationId, "assistant", fullResponseText, {
            scene_data: sceneData,
            model,
            tokens_in: totalTokensIn,
            tokens_out: totalTokensOut,
          }).catch(() => {});
        }

        // 9. Background tasks
        if (user) {
          runBackgroundTasks({
            userId: user.id,
            conversationId,
            userMessage: message,
            assistantResponse: fullResponseText,
            model,
            tokensIn: totalTokensIn,
            tokensOut: totalTokensOut,
            toolsUsed,
            hadErrors,
            isFirstMessage,
          });
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", error: err.message }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
