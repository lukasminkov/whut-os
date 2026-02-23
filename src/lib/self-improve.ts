/**
 * WHUT OS — Self-Improvement Engine
 * 
 * Implements Reflexion/Letta-inspired patterns:
 * - Error reflection and correction tracking
 * - User feedback loop detection
 * - Self-assessment after complex interactions
 * - Conversation title generation
 */

import { createAdminClient } from "@/lib/supabase";

const HAIKU_MODEL = "claude-haiku-4-20250414";

// ── Error Reflection ────────────────────────────────────

interface CorrectionEntry {
  error: string;
  context: string;
  resolution: string;
  tool_name?: string;
}

/**
 * Record a tool error and AI's analysis of what went wrong.
 */
export async function recordToolError(
  userId: string,
  toolName: string,
  error: string,
  context: string
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("corrections").insert({
    user_id: userId,
    tool_name: toolName,
    error_message: error.slice(0, 500),
    context: context.slice(0, 500),
    resolution: null, // Will be filled if AI finds a workaround
    created_at: new Date().toISOString(),
  // @ts-ignore — table might not exist yet
  } as any);
}

/**
 * Check for known corrections before making a tool call.
 */
export async function checkKnownCorrections(
  userId: string,
  toolName: string
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  try {
    const { data } = await admin
      .from("corrections")
      .select("error_message, resolution, context")
      .eq("user_id", userId)
      .eq("tool_name", toolName)
      .not("resolution", "is", null)
      .order("created_at", { ascending: false })
      .limit(3);

    if (!data || data.length === 0) return null;

    return data
      .map(c => `⚠️ Known issue with ${toolName}: ${c.error_message} → Fix: ${c.resolution}`)
      .join("\n");
  } catch {
    return null;
  }
}

/**
 * Record that a resolution worked for a previous error.
 */
export async function recordResolution(
  userId: string,
  toolName: string,
  errorPattern: string,
  resolution: string
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  try {
    // Find matching unresolved error
    const { data } = await admin
      .from("corrections")
      .select("id")
      .eq("user_id", userId)
      .eq("tool_name", toolName)
      .ilike("error_message", `%${errorPattern.slice(0, 50)}%`)
      .is("resolution", null)
      .limit(1);

    if (data && data.length > 0) {
      await admin.from("corrections").update({
        resolution: resolution.slice(0, 500),
      }).eq("id", data[0].id);
    }
  } catch {}
}

// ── User Feedback Detection ─────────────────────────────

/**
 * Check if the user is re-asking a similar question (= AI failed first time).
 */
export async function detectReask(
  userId: string,
  conversationId: string,
  currentMessage: string
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  try {
    // Get last 5 user messages in this conversation
    const { data } = await admin
      .from("messages")
      .select("content")
      .eq("conversation_id", conversationId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!data || data.length < 2) return false;

    const current = currentMessage.toLowerCase().trim();
    // Check if any recent message is very similar (>60% word overlap)
    for (const msg of data.slice(1)) { // Skip index 0 (current message might already be saved)
      const prev = (msg.content || "").toLowerCase().trim();
      if (prev.length < 5) continue;
      const currentWords = new Set(current.split(/\s+/));
      const prevWords = prev.split(/\s+/);
      const overlap = prevWords.filter((w: string) => currentWords.has(w)).length;
      const similarity = overlap / Math.max(currentWords.size, prevWords.length);
      if (similarity > 0.6) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Self-Assessment ─────────────────────────────────────

/**
 * Run a quick self-assessment after a complex interaction.
 * Uses Haiku to analyze the conversation and extract improvement insights.
 */
export async function selfAssess(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  toolsUsed: string[],
  hadErrors: boolean
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const admin = createAdminClient();
  if (!apiKey || !admin) return;

  // Only self-assess on complex interactions (tool use or errors)
  if (toolsUsed.length === 0 && !hadErrors) return;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Briefly assess this AI interaction (1-2 sentences each):

User asked: ${userMessage.slice(0, 300)}
AI responded: ${assistantResponse.slice(0, 300)}
Tools used: ${toolsUsed.join(", ") || "none"}
Had errors: ${hadErrors}

Return JSON: {"quality": "good"|"ok"|"poor", "insight": "what could be improved", "learned": "what was learned about the user"}
If interaction was straightforward, return {"quality": "good", "insight": "", "learned": ""}`,
        }],
      }),
    });

    if (!res.ok) return;
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const assessment = JSON.parse(jsonMatch[0]);
    
    // Store meaningful insights as self_reflection memories
    if (assessment.insight && assessment.quality !== "good") {
      await admin.from("memories").insert({
        user_id: userId,
        category: "self_reflection",
        content: `Self-improvement: ${assessment.insight}`,
        importance: assessment.quality === "poor" ? 0.8 : 0.4,
        source: "self_assessment",
      // @ts-ignore
      } as any);
    }
  } catch (e) {
    console.error("[self-assess] error:", e);
  }
}

// ── Conversation Title Generation ───────────────────────

/**
 * Generate a conversation title from the first message (like ChatGPT).
 */
export async function generateConversationTitle(
  conversationId: string,
  firstMessage: string
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const admin = createAdminClient();
  if (!apiKey || !admin) return;

  try {
    // Check if conversation already has a title
    const { data: conv } = await admin
      .from("conversations")
      .select("title")
      .eq("id", conversationId)
      .single();

    if (conv?.title) return; // Already has a title

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 30,
        messages: [{
          role: "user",
          content: `Generate a very short conversation title (2-5 words, no quotes) for a chat that starts with: "${firstMessage.slice(0, 200)}"`,
        }],
      }),
    });

    if (!res.ok) return;
    const data = await res.json();
    const title = (data.content?.[0]?.text || "").trim().replace(/^["']|["']$/g, "").slice(0, 100);

    if (title) {
      await admin.from("conversations").update({ title }).eq("id", conversationId);
    }
  } catch (e) {
    console.error("[title-gen] error:", e);
  }
}

// ── Conversation Search ─────────────────────────────────

/**
 * Full-text search across all conversations for a user.
 */
export async function searchConversations(
  userId: string,
  query: string,
  limit: number = 10
): Promise<{ conversationId: string; content: string; role: string; createdAt: string }[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  try {
    // Get user's conversation IDs first
    const { data: convs } = await admin
      .from("conversations")
      .select("id")
      .eq("user_id", userId);

    if (!convs || convs.length === 0) return [];

    const convIds = convs.map(c => c.id);

    // Search messages in those conversations
    const { data } = await admin
      .from("messages")
      .select("conversation_id, content, role, created_at")
      .in("conversation_id", convIds)
      .ilike("content", `%${query.replace(/%/g, "")}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data || []).map(m => ({
      conversationId: m.conversation_id,
      content: m.content,
      role: m.role,
      createdAt: m.created_at,
    }));
  } catch {
    return [];
  }
}
