import { NextRequest } from "next/server";
import { AI_TOOLS_V4, V4_SYSTEM_PROMPT } from "@/lib/tools-v4";
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
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase-server";
import { loadUserMemories, loadTopMemorySummary } from "@/lib/memory";
import { selectModel } from "@/lib/model-router";
import { runBackgroundTasks, getTodayUsageStats } from "@/lib/background";
import { recordToolError, detectReask } from "@/lib/self-improve";

// ── Helpers ──────────────────────────────────────────

async function getUserFromRequest(): Promise<{ id: string; email?: string } | null> {
  if (!isSupabaseServerConfigured()) return null;
  try {
    const supabase = await createServerClient();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
}

async function getGoogleTokensFromDB(userId: string): Promise<{ access?: string; refresh?: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from('integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();
  if (!data) return null;
  return { access: data.access_token, refresh: data.refresh_token || undefined };
}

async function updateGoogleTokenInDB(userId: string, newAccessToken: string) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from('integrations').update({
    access_token: newAccessToken,
    token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('provider', 'google');
}

/**
 * Load connected integrations for a user (for self-awareness).
 */
async function loadUserIntegrations(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  try {
    const { data } = await admin
      .from('integrations')
      .select('provider')
      .eq('user_id', userId);
    return (data || []).map(i => i.provider);
  } catch {
    return [];
  }
}

async function loadConversationHistory(conversationId: string): Promise<{ role: string; content: string }[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (!data) return [];
  return data.reverse().map(m => ({ role: m.role, content: m.content }));
}

/**
 * Get conversation message count (to determine if this is the first message).
 */
async function getConversationMessageCount(conversationId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  try {
    const { count } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Summarize older messages in conversation for context window management.
 */
async function getConversationSummary(conversationId: string, beforeOffset: number = 20): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return "";

  // Get older messages beyond the recent window
  const { data } = await admin
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(0, Math.max(0, beforeOffset - 21)); // Messages before the last 20

  if (!data || data.length < 3) return ""; // Not enough old messages to summarize

  // Create a quick summary from old messages
  const oldMessages = data.map(m => `${m.role}: ${(m.content || "").slice(0, 100)}`).join("\n");
  return `\n[Earlier in this conversation: ${oldMessages.slice(0, 500)}...]`;
}

function buildSystemPrompt(
  context: any,
  memoryBlock: string,
  integrations: string[],
  topMemories: string[],
  usageStats: { requests: number; totalTokens: number; costCents: number } | null,
  conversationSummary: string
) {
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

  // ── Self-Awareness: Capabilities ──
  prompt += `\n\n## Your Capabilities`;

  const integrationStatus: Record<string, { label: string; capabilities: string }> = {
    google: { label: "Google (Gmail, Calendar, Drive)", capabilities: "read emails, send emails, archive, view calendar, list files" },
    notion: { label: "Notion", capabilities: "search pages" },
    slack: { label: "Slack", capabilities: "list channels, send messages" },
    tiktok: { label: "TikTok Shop", capabilities: "view orders, analytics" },
  };

  prompt += `\nYou are connected to:`;
  for (const [key, info] of Object.entries(integrationStatus)) {
    const connected = integrations.includes(key);
    prompt += `\n- ${info.label}: ${connected ? `✓ (${info.capabilities})` : "✗ not connected"}`;
  }
  prompt += `\n- Web Search: ✓ always available`;

  prompt += `\n\nYou can display: metrics, lists, charts (line/bar/radial), images, tables, timelines, search results, rich text.`;

  // Top memories summary
  if (topMemories.length > 0) {
    prompt += `\n\nYou remember:`;
    for (const mem of topMemories) {
      prompt += `\n- ${mem}`;
    }
  }

  // Usage stats
  if (usageStats && usageStats.requests > 0) {
    prompt += `\n\nToday's usage: ${usageStats.requests} requests, ~${Math.round(usageStats.totalTokens / 1000)}K tokens, $${(usageStats.costCents / 100).toFixed(4)}`;
  }

  // ── Context ──
  prompt += `\n\n## Context\n- Time: ${time} (${tz})`;
  if (profile?.name) prompt += `\n- User: ${profile.name}`;
  if (profile?.role) prompt += `\n- Role: ${profile.role}`;

  // Conversation summary (older messages)
  if (conversationSummary) {
    prompt += `\n${conversationSummary}`;
  }

  // Full memory block
  if (memoryBlock) prompt += memoryBlock;

  // Self-improvement guidelines
  prompt += `\n\n## Guidelines
- When uncertain, say so clearly rather than guessing.
- If a tool call fails, analyze why and try an alternative approach.
- If the user corrects you, acknowledge the correction gracefully.
- Remember user preferences and adapt your communication style.`;

  return prompt;
}

async function executeTool(
  name: string,
  input: any,
  tokens: { access?: string; refresh?: string },
  userId?: string,
): Promise<{ result: any; status?: string }> {
  let accessToken = tokens.access || "";

  const withRefresh = async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
    try {
      return await fn(accessToken);
    } catch (err: any) {
      if (tokens.refresh && err.message?.includes("401")) {
        const refreshed = await refreshAccessToken(tokens.refresh);
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          if (userId) await updateGoogleTokenInDB(userId, accessToken);
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
        if (!data.results || data.results.length === 0) {
          return { result: { results: [], query: input.query, error: "No results found." }, status: `No results for "${input.query}"` };
        }

        // Auto-fetch og:images for top results
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://whut.ai";
        const imagePromises = data.results.slice(0, 6).map(async (r: any) => {
          if (r.image) return r; // already has image from search
          try {
            const imgRes = await fetch(`${baseUrl}/api/image-proxy?url=${encodeURIComponent(r.url)}`, { signal: AbortSignal.timeout(3000) });
            const imgData = await imgRes.json();
            return { ...r, image: imgData.image || null };
          } catch {
            return r;
          }
        });
        const enrichedResults = await Promise.all(imagePromises);
        return { result: { results: enrichedResults, query: input.query }, status: `Searched for "${input.query}"` };
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
    conversationId: clientConversationId,
  } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "No API key configured" }, { status: 500 });
  }

  // Get authenticated user
  const user = await getUserFromRequest();

  // Get Google tokens: prefer DB, fall back to request body
  let tokens: { access: string; refresh: string } = { access: googleAccessToken || '', refresh: googleRefreshToken || '' };
  if (user) {
    const dbTokens = await getGoogleTokensFromDB(user.id);
    if (dbTokens?.access) tokens = { access: dbTokens.access, refresh: dbTokens.refresh || '' };
  }

  // ── Parallel data loading for system prompt ──
  const [memoryBlock, topMemories, integrations, usageStats, conversationSummary] = await Promise.all([
    user ? loadUserMemories(user.id, 20, message) : Promise.resolve(""),
    user ? loadTopMemorySummary(user.id) : Promise.resolve([]),
    user ? loadUserIntegrations(user.id) : Promise.resolve([]),
    user ? getTodayUsageStats(user.id) : Promise.resolve(null),
    (user && clientConversationId) ? getConversationSummary(clientConversationId) : Promise.resolve(""),
  ]);

  // Load conversation history from DB if available
  let conversationId = clientConversationId;
  let dbHistory: { role: string; content: string }[] = [];
  let isFirstMessage = true;
  if (user && conversationId) {
    const [hist, msgCount] = await Promise.all([
      loadConversationHistory(conversationId),
      getConversationMessageCount(conversationId),
    ]);
    dbHistory = hist;
    isFirstMessage = msgCount === 0;
  }

  const enrichedContext = { ...context, userProfile: userProfile || {}, integrations };
  const systemPrompt = buildSystemPrompt(
    enrichedContext, memoryBlock, integrations, topMemories, usageStats, conversationSummary
  );

  // Combine DB history with client history, preferring DB
  const baseHistory = dbHistory.length > 0 ? dbHistory : (history || []);
  const messages = [...baseHistory, { role: "user", content: message }];

  // Smart model routing
  const { model, intent } = selectModel(message);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        let currentMessages = messages;
        let maxIterations = 3;
        let totalTokensIn = 0;
        let totalTokensOut = 0;
        let finalSpoken = "";
        let finalCards: any[] = [];
        const toolsUsed: string[] = [];
        let hadErrors = false;

        while (maxIterations-- > 0) {
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
              tools: AI_TOOLS_V4,
              messages: currentMessages,
            }),
          });

          if (!response.ok) {
            const err = await response.text();
            send({ type: "error", error: err });
            break;
          }

          const data = await response.json();
          totalTokensIn += data.usage?.input_tokens || 0;
          totalTokensOut += data.usage?.output_tokens || 0;

          const toolUses = (data.content || []).filter((b: any) => b.type === "tool_use");
          const textBlocks = (data.content || []).filter((b: any) => b.type === "text");

          const displayCall = toolUses.find((t: any) => t.name === "display");
          if (displayCall) {
            const { spoken, intent: sceneIntent, layout, elements } = displayCall.input;
            finalSpoken = spoken || "";
            const scene = {
              id: `scene-${Date.now()}`,
              intent: sceneIntent || "",
              layout: layout || "focused",
              elements: (elements || []).map((el: any) => ({
                ...el,
                priority: el.priority || 2,
                size: el.size || "md",
              })),
              spoken: finalSpoken,
            };
            finalCards = scene.elements;
            send({ type: "scene", scene });
            send({ type: "done", text: finalSpoken });
            break;
          }

          // Backward compat: render_cards
          const renderCall = toolUses.find((t: any) => t.name === "render_cards");
          if (renderCall) {
            const { spoken, cards } = renderCall.input;
            finalSpoken = spoken || "";
            finalCards = cards || [];
            for (const card of finalCards) {
              send({ type: "card", card });
            }
            send({ type: "done", text: finalSpoken });
            break;
          }

          if (toolUses.length === 0) {
            const text = textBlocks.map((b: any) => b.text).join("\n") || "I'm here. How can I help?";
            finalSpoken = text.slice(0, 300); // TTS gets a summary
            // Send as V4 scene directly (not legacy card)
            const textScene = {
              id: `scene-text-${Date.now()}`,
              intent: "",
              layout: "minimal",
              elements: [{
                id: "response",
                type: "text",
                priority: 1,
                data: { content: text, typewriter: true },
              }],
              spoken: finalSpoken,
            };
            send({ type: "scene", scene: textScene });
            send({ type: "done", text: finalSpoken });
            break;
          }

          const toolResults: any[] = [];
          currentMessages = [...currentMessages, { role: "assistant", content: data.content }];

          for (const tool of toolUses) {
            toolsUsed.push(tool.name);
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
              const { result } = await executeTool(tool.name, tool.input, tokens, user?.id);
              toolResults.push({
                type: "tool_result",
                tool_use_id: tool.id,
                content: JSON.stringify(result),
              });
            } catch (err: any) {
              hadErrors = true;
              const errorMsg = err.message || "Tool execution failed";
              toolResults.push({
                type: "tool_result",
                tool_use_id: tool.id,
                content: JSON.stringify({
                  error: errorMsg,
                  hint: "Analyze this error and try an alternative approach if possible.",
                }),
                is_error: true,
              });
              // Record error for future learning
              if (user) {
                recordToolError(user.id, tool.name, errorMsg, JSON.stringify(tool.input).slice(0, 200)).catch(() => {});
              }
            }
          }

          currentMessages = [...currentMessages, { role: "user", content: toolResults }];
        }

        // ── Background tasks (fire-and-forget, non-blocking) ──
        if (user) {
          runBackgroundTasks({
            userId: user.id,
            conversationId,
            userMessage: message,
            assistantResponse: finalSpoken,
            model,
            tokensIn: totalTokensIn,
            tokensOut: totalTokensOut,
            toolsUsed,
            hadErrors,
            isFirstMessage,
          });
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
