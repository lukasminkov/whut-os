/**
 * WHUT OS — Self-Learning Memory System
 * 
 * Extracts facts, preferences, and goals from conversations
 * and persists them for context injection in future interactions.
 */

import { createAdminClient } from "@/lib/supabase";

const EXTRACTION_MODEL = "claude-haiku-4-20250414";

const EXTRACTION_PROMPT = `Extract any facts, preferences, or important information about the user from this conversation turn. Return as a JSON array of objects with {category, content, importance} where:
- category: one of "preference", "fact", "goal", "person", "company", "relationship", "instruction"
- content: concise factual statement (e.g. "User's name is Luke", "Prefers dark mode")
- importance: 0.0 to 1.0 (1.0 = critical personal info, 0.5 = useful context, 0.1 = minor detail)

Only include genuinely useful, non-obvious info. If nothing worth remembering, return [].`;

export interface Memory {
  category: string;
  content: string;
  importance: number;
}

/**
 * Extract memories from a conversation turn and upsert into the database.
 * Designed to be called fire-and-forget (non-blocking).
 */
export async function extractMemories(
  userId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const admin = createAdminClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!admin || !apiKey) return;

  // Handle explicit "remember" instructions
  const rememberMatch = userMessage.match(/remember\s+(?:that\s+)?(.+)/i);
  if (rememberMatch) {
    await upsertMemory(admin, userId, {
      category: "instruction",
      content: rememberMatch[1].trim(),
      importance: 0.9,
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
        model: EXTRACTION_MODEL,
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\nUser: ${userMessage}\nAssistant: ${assistantResponse}`,
        }],
      }),
    });

    if (!res.ok) return;

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const memories: Memory[] = JSON.parse(jsonMatch[0]);
    for (const mem of memories) {
      if (mem.content && mem.category) {
        await upsertMemory(admin, userId, mem);
      }
    }
  } catch (e) {
    console.error("[memory] extraction error:", e);
  }
}

/**
 * Upsert a memory: if similar content exists, reinforce it; otherwise insert new.
 */
async function upsertMemory(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  mem: Memory
): Promise<void> {
  if (!admin) return;

  // Check for similar existing memory (first 50 chars match)
  const searchTerm = mem.content.slice(0, 50).replace(/%/g, "");
  const { data: existing } = await admin
    .from("memories")
    .select("id, reinforcement_count, importance")
    .eq("user_id", userId)
    .ilike("content", `%${searchTerm}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    // Reinforce: bump count, update importance if higher
    await admin.from("memories").update({
      reinforcement_count: existing[0].reinforcement_count + 1,
      importance: Math.max(existing[0].importance, mem.importance),
      last_accessed_at: new Date().toISOString(),
    }).eq("id", existing[0].id);
  } else {
    await admin.from("memories").insert({
      user_id: userId,
      category: mem.category,
      content: mem.content,
      importance: mem.importance || 0.5,
      source: "inferred",
    });
  }
}

/**
 * Load top memories for context injection.
 * Sorted by importance * reinforcement_count, limited to top N.
 */
export async function loadUserMemories(
  userId: string,
  limit: number = 15
): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return "";

  const { data } = await admin
    .from("memories")
    .select("id, category, content, importance, reinforcement_count, last_accessed_at")
    .eq("user_id", userId)
    .order("last_accessed_at", { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return "";

  const scored = data
    .map(m => ({ ...m, score: (m.importance || 0.5) * (m.reinforcement_count || 1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Fire-and-forget: update last_accessed_at
  const ids = scored.map(m => m.id);
  admin.from("memories").update({ last_accessed_at: new Date().toISOString() }).in("id", ids).then(() => {});

  const lines = scored.map(m => `- [${m.category}] ${m.content}`).join("\n");
  return `\n\n## What You Know About This User\n${lines}`;
}
