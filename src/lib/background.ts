/**
 * WHUT OS — Background Task Runner
 * 
 * Queues non-blocking tasks after each AI response:
 * - Memory extraction
 * - Self-reflection
 * - Conversation title generation
 * - Usage tracking
 * 
 * All tasks are fire-and-forget with individual error isolation.
 */

import { extractMemories } from "@/lib/memory";
import { selfAssess, generateConversationTitle } from "@/lib/self-improve";
import { createAdminClient } from "@/lib/supabase";

interface BackgroundContext {
  userId: string;
  conversationId?: string;
  userMessage: string;
  assistantResponse: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  toolsUsed: string[];
  hadErrors: boolean;
  isFirstMessage: boolean;
}

/**
 * Safe wrapper — catches errors so one failing task doesn't affect others.
 */
function safe(name: string, fn: () => Promise<void>): Promise<void> {
  return fn().catch(err => {
    console.error(`[background/${name}] error:`, err?.message || err);
  });
}

/**
 * Run all background tasks after an AI response.
 * This is fire-and-forget — call without await.
 */
export function runBackgroundTasks(ctx: BackgroundContext): void {
  // Don't await — this runs in the background
  Promise.all([
    // 1. Memory extraction
    safe("memory", () =>
      extractMemories(ctx.userId, ctx.userMessage, ctx.assistantResponse)
    ),

    // 2. Self-assessment (only for complex interactions)
    safe("self-assess", () =>
      selfAssess(ctx.userId, ctx.userMessage, ctx.assistantResponse, ctx.toolsUsed, ctx.hadErrors)
    ),

    // 3. Conversation title generation (only for first message)
    safe("title", () => {
      if (ctx.conversationId && ctx.isFirstMessage) {
        return generateConversationTitle(ctx.conversationId, ctx.userMessage);
      }
      return Promise.resolve();
    }),

    // 4. Usage tracking
    safe("usage", () =>
      trackUsageInDB(ctx.userId, ctx.model, ctx.tokensIn, ctx.tokensOut, ctx.conversationId)
    ),

    // 5. Save messages
    safe("messages", () => {
      if (ctx.conversationId) {
        return saveMessagesToDB(
          ctx.conversationId, ctx.userMessage, ctx.assistantResponse,
          null, ctx.model, ctx.tokensIn, ctx.tokensOut
        );
      }
      return Promise.resolve();
    }),
  ]).catch(() => {}); // Final safety net
}

async function trackUsageInDB(
  userId: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  conversationId?: string
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const costPer1kIn = model.includes("opus") ? 0.005 : model.includes("haiku") ? 0.00025 : 0.003;
  const costPer1kOut = model.includes("opus") ? 0.025 : model.includes("haiku") ? 0.00125 : 0.015;
  const costCents = ((tokensIn / 1000) * costPer1kIn + (tokensOut / 1000) * costPer1kOut) * 100;

  await admin.from("usage").insert({
    user_id: userId,
    model,
    input_tokens: tokensIn,
    output_tokens: tokensOut,
    cost_cents: costCents,
    conversation_id: conversationId || null,
  });
}

async function saveMessagesToDB(
  conversationId: string,
  userMsg: string,
  assistantMsg: string,
  cardsJson: any,
  model: string,
  tokensIn?: number,
  tokensOut?: number
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: userMsg,
  });

  await admin.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: assistantMsg,
    cards_json: cardsJson,
    model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
  });

  await admin.from("conversations").update({
    last_message_at: new Date().toISOString(),
  }).eq("id", conversationId);
}

/**
 * Get today's usage stats for the user (for self-awareness in system prompt).
 */
export async function getTodayUsageStats(userId: string): Promise<{
  requests: number;
  totalTokens: number;
  costCents: number;
} | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await admin
      .from("usage")
      .select("input_tokens, output_tokens, cost_cents")
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString());

    if (!data || data.length === 0) return { requests: 0, totalTokens: 0, costCents: 0 };

    return {
      requests: data.length,
      totalTokens: data.reduce((s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0), 0),
      costCents: data.reduce((s, r) => s + (r.cost_cents || 0), 0),
    };
  } catch {
    return null;
  }
}
