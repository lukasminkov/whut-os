import { NextRequest } from "next/server";
import { AI_TOOLS_V4 } from "@/lib/tools-v4";
import { detectIntent } from "@/lib/intent-prefetch";
import { runBackgroundTasks, getTodayUsageStats } from "@/lib/background";
import { recordToolError } from "@/lib/self-improve";

import { getUser, getGoogleTokens, updateGoogleToken, loadIntegrations, loadHistory, getMessageCount, saveMessage } from "@/lib/ai/db";
import { loadMemoryContext } from "@/lib/ai/memory";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { getRelevantFeedback, getDesignPreferences, formatFeedbackForPrompt } from "@/lib/feedback";
import { selectModel } from "@/lib/ai/models";
import { executeTool, STATUS_MAP } from "@/lib/ai/tools";

// ── Main Route ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, images, context, userProfile, conversationId } = body;

  // Build user content (text or multimodal)
  let userContent: unknown = message;
  if (images?.length) {
    userContent = [
      ...(images as string[]).map((img: string) => ({
        type: "image" as const,
        source: img.startsWith("data:")
          ? { type: "base64" as const, media_type: img.split(";")[0].split(":")[1], data: img.split(",")[1] }
          : { type: "url" as const, url: img },
      })),
      { type: "text" as const, text: message },
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
    if (dbTokens) tokens = dbTokens;
  }

  const onRefresh = user ? (token: string) => updateGoogleToken(user.id, token) : undefined;

  // 3. Load context in parallel
  const [memoryCtx, integrations, usageStats, dbHistory, msgCount, feedbackEntries, designPrefs] = await Promise.all([
    user ? loadMemoryContext(user.id, message) : Promise.resolve({ memoryBlock: "", topMemories: [] as string[], relevantMemories: [] }),
    user ? loadIntegrations(user.id) : Promise.resolve([]),
    user ? getTodayUsageStats(user.id) : Promise.resolve(null),
    conversationId ? loadHistory(conversationId) : Promise.resolve([]),
    conversationId ? getMessageCount(conversationId) : Promise.resolve(0),
    user ? getRelevantFeedback(user.id, message) : Promise.resolve([]),
    user ? getDesignPreferences(user.id) : Promise.resolve(null),
  ]);

  const feedbackBlock = formatFeedbackForPrompt(feedbackEntries, designPrefs);

  const isFirstMessage = msgCount === 0;

  // 4. Save user message to DB
  if (user && conversationId) {
    saveMessage(conversationId, "user", message).catch(() => {});
  }

  // 5. Intent prediction — prefetch data for common queries
  let prefetchedBlock = "";
  const detected = detectIntent(message);
  if (detected && tokens.access) {
    try {
      const prefetchResults = await Promise.allSettled(
        detected.tools.map(toolName => executeTool(toolName, {}, tokens, user?.id, onRefresh))
      );
      const parts: string[] = [];
      for (let i = 0; i < detected.tools.length; i++) {
        const res = prefetchResults[i];
        if (res.status === "fulfilled") {
          parts.push(`### ${detected.tools[i]} result:\n${JSON.stringify(res.value.result)}`);
        }
      }
      if (parts.length > 0) {
        prefetchedBlock = `\n\n## Pre-fetched data (already retrieved — use directly, do NOT call these tools again):\n${parts.join("\n\n")}`;
      }
    } catch { /* prefetch is best-effort */ }
  }

  // 6. Build system prompt
  const enrichedContext = { ...context, userProfile: userProfile || {}, integrations };
  let systemPrompt = buildSystemPrompt({
    context: enrichedContext,
    memoryBlock: memoryCtx.memoryBlock,
    integrations,
    topMemories: memoryCtx.topMemories,
    usageStats,
    relevantMemories: memoryCtx.relevantMemories,
    feedbackBlock,
  });
  if (prefetchedBlock) systemPrompt += prefetchedBlock;

  // 7. Build messages (DB history + current)
  const messages: Array<{ role: string; content: unknown }> = [...dbHistory, { role: "user", content: userContent }];
  const { model } = selectModel(message);

  // 8. Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        let currentMessages = messages;
        let maxIterations = 5;
        let totalTokensIn = 0;
        let totalTokensOut = 0;
        let fullResponseText = "";
        let sceneData: Record<string, unknown> | null = null;
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
              model, max_tokens: 8192, stream: true,
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
          const fullContent: Array<{ type: string; id?: string; name?: string; input?: unknown; text?: string }> = [];
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
                      if (last?.type === "tool_use") last.input = (last.input as string) + ev.delta.partial_json;
                    }
                    break;
                  case "content_block_stop": {
                    if (currentText) { fullContent.push({ type: "text", text: currentText }); currentText = ""; }
                    const last = fullContent[fullContent.length - 1];
                    if (last?.type === "tool_use" && typeof last.input === "string") {
                      try { last.input = JSON.parse(last.input); } catch { last.input = {}; }
                    }
                    break;
                  }
                  case "message_delta":
                    usage.output_tokens = ev.usage?.output_tokens || 0;
                    stopReason = ev.delta?.stop_reason || stopReason;
                    break;
                }
              } catch { /* skip malformed SSE */ }
            }
          }

          totalTokensIn += usage.input_tokens;
          totalTokensOut += usage.output_tokens;

          const toolUses = fullContent.filter(b => b.type === "tool_use");
          const textBlocks = fullContent.filter(b => b.type === "text");

          // Truncation detection: if we got end_turn with only text (no tool calls),
          // and the output hit near max_tokens, the response was likely truncated
          if (stopReason === "max_tokens" && toolUses.length === 0) {
            console.warn("[AI] Response truncated (hit max_tokens). Output tokens:", usage.output_tokens);
            send({ type: "error", error: "Response was too long and got cut off. Please try a more specific question." });
            break;
          }

          // Handle display tool
          const displayCall = toolUses.find(t => t.name === "display");
          if (displayCall) {
            const input = displayCall.input as Record<string, unknown>;
            const scene = {
              id: `scene-${Date.now()}`,
              intent: (input.intent as string) || "",
              layout: (input.layout as string) || "focused",
              elements: ((input.elements as Array<Record<string, unknown>>) || []).map(el => ({
                ...el, priority: el.priority || 2, size: el.size || "md",
              })),
              spoken: (input.spoken as string) || "",
            };
            sceneData = scene;
            fullResponseText = scene.spoken;
            send({ type: "scene", scene });
            send({ type: "done", text: fullResponseText });
            break;
          }

          // Handle render_cards (legacy)
          const renderCall = toolUses.find(t => t.name === "render_cards");
          if (renderCall) {
            const input = renderCall.input as Record<string, unknown>;
            fullResponseText = (input.spoken as string) || "";
            for (const card of ((input.cards as Array<Record<string, unknown>>) || [])) send({ type: "card", card });
            send({ type: "done", text: fullResponseText });
            break;
          }

          // No tools — pure text response
          if (toolUses.length === 0) {
            fullResponseText = textBlocks.map(b => b.text).join("\n") || "I'm here. How can I help?";
            send({ type: "done", text: fullResponseText });
            break;
          }

          // Execute tools in PARALLEL
          currentMessages = [...currentMessages, { role: "assistant", content: fullContent }];

          for (const tool of toolUses) {
            toolsUsed.push(tool.name!);
            send({ type: "status", text: STATUS_MAP[tool.name!] || `Running ${tool.name}...` });
          }

          const settled = await Promise.allSettled(
            toolUses.map(tool => executeTool(tool.name!, tool.input as Record<string, unknown>, tokens, user?.id, onRefresh))
          );

          const toolResults = settled.map((res, i) => {
            const tool = toolUses[i];
            if (res.status === "fulfilled") {
              return { type: "tool_result", tool_use_id: tool.id, content: JSON.stringify(res.value.result) };
            } else {
              hadErrors = true;
              if (user) recordToolError(user.id, tool.name!, res.reason?.message || "", JSON.stringify(tool.input).slice(0, 200)).catch(() => {});
              return {
                type: "tool_result", tool_use_id: tool.id, is_error: true,
                content: JSON.stringify({ error: res.reason?.message || "Tool failed", hint: "Try an alternative approach." }),
              };
            }
          });

          // Emit OS commands to client
          for (const res of settled) {
            if (res.status === "fulfilled" && (res.value.result as Record<string, unknown>)?.os_command) {
              send({ type: "os_command", command: res.value.result });
            }
          }

          currentMessages = [...currentMessages, { role: "user", content: toolResults }];
        }

        // 9. Save assistant message to DB
        if (user && conversationId && fullResponseText) {
          // For visualization responses, include a summary of what was shown
          // so the AI has context for follow-up questions
          let historyText = fullResponseText;
          if (sceneData) {
            const elements = (sceneData as { elements?: Array<{ type?: string; data?: { title?: string } }> }).elements || [];
            if (elements.length > 0) {
              const summary = elements
                .slice(0, 8)
                .map(el => el.data?.title || el.type || "item")
                .join(", ");
              const extra = elements.length > 8 ? ` and ${elements.length - 8} more` : "";
              historyText += `\n[Showed ${elements.length} visual element(s): ${summary}${extra}]`;
            }
          }
          saveMessage(conversationId, "assistant", historyText, {
            scene_data: sceneData ?? undefined,
            model,
            tokens_in: totalTokensIn,
            tokens_out: totalTokensOut,
          }).catch(() => {});
        }

        // 10. Background tasks
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", error: msg }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
