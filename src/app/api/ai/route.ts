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
import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase-server";

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

async function loadMemories(userId: string): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return '';
  // Fetch more than needed, then sort by importance * reinforcement in JS
  const { data } = await admin
    .from('memories')
    .select('id, category, content, importance, reinforcement_count, last_accessed_at')
    .eq('user_id', userId)
    .order('last_accessed_at', { ascending: false })
    .limit(50);
  if (!data || data.length === 0) return '';
  // Score and take top 15
  const scored = data
    .map(m => ({ ...m, score: (m.importance || 0.5) * (m.reinforcement_count || 1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  // Update last_accessed_at for retrieved memories
  const ids = scored.map(m => (m as any).id).filter(Boolean);
  if (ids.length > 0) {
    admin.from('memories').update({ last_accessed_at: new Date().toISOString() }).in('id', ids).then(() => {});
  }
  const lines = scored.map(m => `- [${m.category}] ${m.content}`).join('\n');
  return `\n\n## What You Know About This User\n${lines}`;
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

async function saveMessages(
  conversationId: string,
  userMsg: string,
  assistantMsg: string,
  cardsJson: any,
  model: string,
  tokensIn?: number,
  tokensOut?: number,
) {
  const admin = createAdminClient();
  if (!admin || !conversationId) return;
  // Save user message
  await admin.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: userMsg,
  });
  // Save assistant message
  await admin.from('messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantMsg,
    cards_json: cardsJson,
    model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
  });
  // Update conversation
  await admin.from('conversations').update({
    last_message_at: new Date().toISOString(),
  }).eq('id', conversationId);
}

async function extractAndSaveMemories(userId: string, userMsg: string, assistantMsg: string) {
  const admin = createAdminClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!admin || !apiKey) return;

  // Check for explicit "remember" instruction
  const rememberMatch = userMsg.match(/remember\s+(?:that\s+)?(.+)/i);
  if (rememberMatch) {
    await admin.from('memories').insert({
      user_id: userId,
      category: 'instruction',
      content: rememberMatch[1].trim(),
      importance: 0.9,
      source: 'explicit',
    });
    return;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-20250414",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Extract any facts, preferences, or important information about the user from this conversation turn. Return as a JSON array of objects with {category, content, importance} where category is one of: preference, fact, relationship, instruction. importance is 0-1. Only include genuinely useful, non-obvious info. If nothing worth remembering, return [].

User: ${userMsg}
Assistant: ${assistantMsg}`,
        }],
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;
    const memories = JSON.parse(jsonMatch[0]);
    for (const mem of memories) {
      if (mem.content && mem.category) {
        // Check if similar memory already exists
        const { data: existing } = await admin.from('memories')
          .select('id, reinforcement_count')
          .eq('user_id', userId)
          .ilike('content', `%${mem.content.slice(0, 50)}%`)
          .limit(1);
        if (existing && existing.length > 0) {
          // Reinforce existing memory
          await admin.from('memories').update({
            reinforcement_count: existing[0].reinforcement_count + 1,
            last_accessed_at: new Date().toISOString(),
          }).eq('id', existing[0].id);
        } else {
          await admin.from('memories').insert({
            user_id: userId,
            category: mem.category,
            content: mem.content,
            importance: mem.importance || 0.5,
            source: 'inferred',
          });
        }
      }
    }
  } catch (e) {
    console.error('Memory extraction error:', e);
  }
}

async function trackUsageInDB(userId: string, model: string, tokensIn: number, tokensOut: number, conversationId?: string) {
  const admin = createAdminClient();
  if (!admin) return;
  // Calculate cost (approximate)
  const costPer1kIn = model.includes('opus') ? 0.015 : 0.003;
  const costPer1kOut = model.includes('opus') ? 0.075 : 0.015;
  const costCents = ((tokensIn / 1000) * costPer1kIn + (tokensOut / 1000) * costPer1kOut) * 100;
  await admin.from('usage').insert({
    user_id: userId,
    model,
    input_tokens: tokensIn,
    output_tokens: tokensOut,
    cost_cents: costCents,
    conversation_id: conversationId || null,
  });
}

function buildSystemPrompt(context: any, memoryBlock: string) {
  const integrations = context?.integrations || [];
  const profile = context?.userProfile || {};
  const tz = context?.timezone || profile?.timezone || "UTC";
  const time = context?.time || new Date().toISOString();
  const isOnboarding = !profile?.name || ["welcome", "name", "role", "integrations"].includes(profile?.onboardingStep);

  let prompt = V3_SYSTEM_PROMPT;

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

  prompt += `\n\n## Context\n- Time: ${time} (${tz})`;
  if (profile?.name) prompt += `\n- User: ${profile.name}`;
  if (integrations.length) prompt += `\n- Connected: ${integrations.join(", ")}`;
  else prompt += `\n- No integrations connected`;

  if (memoryBlock) prompt += memoryBlock;

  return prompt;
}

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
          // Update DB with new token
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
          return { result: { results: [], query: input.query, error: "No results found. Provide best answer from knowledge." }, status: `No results for "${input.query}"` };
        }
        return { result: data, status: `Searched for "${input.query}"` };
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

  // Get authenticated user (if Supabase configured)
  const user = await getUserFromRequest();

  // Get Google tokens: prefer DB, fall back to request body
  let tokens: { access: string; refresh: string } = { access: googleAccessToken || '', refresh: googleRefreshToken || '' };
  if (user) {
    const dbTokens = await getGoogleTokensFromDB(user.id);
    if (dbTokens?.access) tokens = { access: dbTokens.access, refresh: dbTokens.refresh || '' };
  }

  // Load memories from DB
  const memoryBlock = user ? await loadMemories(user.id) : '';

  // Load conversation history from DB if available
  let conversationId = clientConversationId;
  let dbHistory: { role: string; content: string }[] = [];
  if (user && conversationId) {
    dbHistory = await loadConversationHistory(conversationId);
  }

  const enrichedContext = { ...context, userProfile: userProfile || {} };
  const systemPrompt = buildSystemPrompt(enrichedContext, memoryBlock);

  // Combine DB history with client history, preferring DB
  const baseHistory = dbHistory.length > 0 ? dbHistory : (history || []);
  const messages = [...baseHistory, { role: "user", content: message }];
  const model = selectModel(message);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        let currentMessages = messages;
        let maxIterations = 8;
        let totalTokensIn = 0;
        let totalTokensOut = 0;
        let finalSpoken = "";
        let finalCards: any[] = [];

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
          totalTokensIn += data.usage?.input_tokens || 0;
          totalTokensOut += data.usage?.output_tokens || 0;

          const toolUses = (data.content || []).filter((b: any) => b.type === "tool_use");
          const textBlocks = (data.content || []).filter((b: any) => b.type === "text");

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
            finalSpoken = text.slice(0, 200);
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
            send({ type: "done", text: finalSpoken });
            break;
          }

          const toolResults: any[] = [];
          currentMessages = [...currentMessages, { role: "assistant", content: data.content }];

          for (const tool of toolUses) {
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
              toolResults.push({
                type: "tool_result",
                tool_use_id: tool.id,
                content: JSON.stringify({ error: err.message || "Tool execution failed" }),
                is_error: true,
              });
            }
          }

          currentMessages = [...currentMessages, { role: "user", content: toolResults }];
        }

        // ── Post-response async tasks (don't block the stream) ──
        if (user) {
          // Save messages to DB
          if (conversationId) {
            saveMessages(conversationId, message, finalSpoken, finalCards, model, totalTokensIn, totalTokensOut).catch(console.error);
          }
          // Track usage
          trackUsageInDB(user.id, model, totalTokensIn, totalTokensOut, conversationId).catch(console.error);
          // Extract memories (async, fire-and-forget)
          extractAndSaveMemories(user.id, message, finalSpoken).catch(console.error);
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
