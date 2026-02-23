/**
 * WHUT OS — Advanced Self-Learning Memory System
 * 
 * Implements mem0-inspired patterns:
 * - Memory categories with importance decay
 * - Conflict resolution & superseding
 * - User context profiling
 * - Self-reflection after conversations
 */

import { createAdminClient } from "@/lib/supabase";

const EXTRACTION_MODEL = "claude-haiku-4-20250414";

// ── Memory Categories ──────────────────────────────────
export type MemoryCategory =
  | "fact"
  | "preference"
  | "goal"
  | "person"
  | "relationship"
  | "pattern"
  | "correction"
  | "instruction"
  | "company"
  | "communication_style"
  | "self_reflection";

export interface Memory {
  id?: string;
  category: MemoryCategory;
  content: string;
  importance: number;
  superseded_by?: string;
  metadata?: Record<string, any>;
}

// ── Enhanced Extraction Prompt ──────────────────────────

const EXTRACTION_PROMPT = `You are a memory extraction engine. Analyze this conversation turn and extract useful information about the user.

Return a JSON array of objects. Each object has:
- category: one of "fact", "preference", "goal", "person", "relationship", "pattern", "correction", "instruction", "company", "communication_style"
- content: concise factual statement (e.g. "User's name is Luke", "Prefers dark mode", "Works at WHUT")
- importance: 0.0 to 1.0 (1.0 = critical identity info, 0.7 = strong preference, 0.5 = useful context, 0.2 = minor detail)
- supersedes: (optional) if this CORRECTS a previous fact, describe what it replaces (e.g. "User's timezone is PST" supersedes any prior timezone)

Key things to extract:
- Name, company, role, timezone, location
- Communication style (formal/casual, brief/detailed, emoji usage)
- Preferences (tools, formats, styles)
- Goals and priorities
- People mentioned and relationships
- Corrections ("actually it's X not Y")
- Patterns (recurring topics, work habits)

If nothing worth remembering, return [].`;

const FEEDBACK_PATTERNS = [
  /\b(no|wrong|incorrect|that'?s not right|not what I (?:meant|asked)|actually)\b/i,
  /\b(I (?:already|just) (?:told|said|mentioned))\b/i,
  /\b(try again|redo|fix)\b/i,
];

const REPHRASE_PATTERNS = [
  /\b(I mean|what I meant|let me rephrase|to clarify)\b/i,
];

/**
 * Detect if this message is negative feedback (user correcting the AI)
 */
export function detectNegativeFeedback(message: string): boolean {
  return FEEDBACK_PATTERNS.some(p => p.test(message));
}

/**
 * Detect if user is rephrasing (indicates AI didn't understand first time)
 */
export function detectRephrase(message: string): boolean {
  return REPHRASE_PATTERNS.some(p => p.test(message));
}

/**
 * Extract memories from a conversation turn and upsert into the database.
 * Enhanced with conflict resolution and category support.
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

  // Handle explicit "forget" instructions
  const forgetMatch = userMessage.match(/forget\s+(?:that\s+|about\s+)?(.+)/i);
  if (forgetMatch) {
    await supersedeMemory(admin, userId, forgetMatch[1].trim(), "User requested removal");
    return;
  }

  // Track negative feedback as a correction memory
  if (detectNegativeFeedback(userMessage)) {
    await upsertMemory(admin, userId, {
      category: "correction",
      content: `User corrected AI: "${userMessage.slice(0, 200)}"`,
      importance: 0.7,
    });
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
        max_tokens: 800,
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

    const memories: any[] = JSON.parse(jsonMatch[0]);
    for (const mem of memories) {
      if (!mem.content || !mem.category) continue;

      // If this memory supersedes something, mark old ones
      if (mem.supersedes) {
        await supersedeMemory(admin, userId, mem.supersedes, mem.content);
      }

      await upsertMemory(admin, userId, {
        category: mem.category,
        content: mem.content,
        importance: mem.importance || 0.5,
      });
    }
  } catch (e) {
    console.error("[memory] extraction error:", e);
  }
}

/**
 * Upsert a memory with conflict resolution.
 * If similar content exists, reinforce; otherwise insert.
 */
async function upsertMemory(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  mem: Memory
): Promise<void> {
  const searchTerm = mem.content.slice(0, 50).replace(/%/g, "").replace(/'/g, "''");
  const { data: existing } = await admin
    .from("memories")
    .select("id, reinforcement_count, importance, superseded_by")
    .eq("user_id", userId)
    .is("superseded_by", null) // Only match active memories
    .ilike("content", `%${searchTerm}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    await admin.from("memories").update({
      reinforcement_count: (existing[0].reinforcement_count || 1) + 1,
      importance: Math.max(existing[0].importance || 0.5, mem.importance),
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
 * Mark old memories as superseded when user corrects information.
 */
async function supersedeMemory(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  oldContent: string,
  newContent: string
): Promise<void> {
  const searchTerm = oldContent.slice(0, 40).replace(/%/g, "");
  const { data } = await admin
    .from("memories")
    .select("id")
    .eq("user_id", userId)
    .is("superseded_by", null)
    .ilike("content", `%${searchTerm}%`)
    .limit(5);

  if (data && data.length > 0) {
    for (const m of data) {
      await admin.from("memories").update({
        superseded_by: newContent.slice(0, 200),
        importance: 0, // effectively dead
      }).eq("id", m.id);
    }
  }
}

/**
 * Apply importance decay to memories.
 * Memories lose importance over time unless reinforced.
 * Called periodically or on load.
 */
function applyImportanceDecay(
  memories: any[],
  now: Date = new Date()
): any[] {
  return memories.map(m => {
    const lastAccessed = new Date(m.last_accessed_at || m.created_at || now);
    const daysSince = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    
    // Decay factor: lose ~10% importance per week of non-access
    // But reinforced memories decay slower
    const reinforcement = Math.min(m.reinforcement_count || 1, 10);
    const decayRate = 0.015 / reinforcement; // Higher reinforcement = slower decay
    const decayFactor = Math.max(0.1, 1 - (decayRate * daysSince));
    
    return {
      ...m,
      effectiveImportance: (m.importance || 0.5) * decayFactor * Math.sqrt(reinforcement),
    };
  });
}

/**
 * Load top memories for context injection.
 * Enhanced with decay, category grouping, and relevance.
 */
export async function loadUserMemories(
  userId: string,
  limit: number = 20,
  topicHint?: string
): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return "";

  const { data } = await admin
    .from("memories")
    .select("id, category, content, importance, reinforcement_count, last_accessed_at, created_at")
    .eq("user_id", userId)
    .is("superseded_by", null) // Only active memories
    .order("last_accessed_at", { ascending: false })
    .limit(100);

  if (!data || data.length === 0) return "";

  // Apply importance decay
  const withDecay = applyImportanceDecay(data);

  // If there's a topic hint, boost relevant memories
  if (topicHint) {
    const topicLower = topicHint.toLowerCase();
    for (const m of withDecay) {
      if (m.content.toLowerCase().includes(topicLower)) {
        m.effectiveImportance *= 1.5;
      }
    }
  }

  const sorted = withDecay
    .sort((a, b) => b.effectiveImportance - a.effectiveImportance)
    .slice(0, limit);

  // Update last_accessed_at (fire-and-forget)
  const ids = sorted.map(m => m.id);
  admin.from("memories").update({ last_accessed_at: new Date().toISOString() }).in("id", ids).then(() => {});

  // Group by category for cleaner display
  const groups: Record<string, string[]> = {};
  for (const m of sorted) {
    const cat = m.category || "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m.content);
  }

  const lines: string[] = [];
  const categoryLabels: Record<string, string> = {
    fact: "📋 Facts",
    preference: "⭐ Preferences",
    goal: "🎯 Goals",
    person: "👤 People",
    relationship: "🤝 Relationships",
    pattern: "🔄 Patterns",
    correction: "✏️ Corrections",
    instruction: "📌 Instructions",
    company: "🏢 Company",
    communication_style: "💬 Communication Style",
  };

  for (const [cat, items] of Object.entries(groups)) {
    if (cat === "correction" || cat === "self_reflection") continue; // Don't show these to user
    const label = categoryLabels[cat] || cat;
    lines.push(`${label}:`);
    for (const item of items) {
      lines.push(`  - ${item}`);
    }
  }

  return lines.length > 0
    ? `\n\n## What You Know About This User\n${lines.join("\n")}`
    : "";
}

/**
 * Load user's top 5 memories as a quick summary (for system prompt capabilities section)
 */
export async function loadTopMemorySummary(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("memories")
    .select("content, importance, reinforcement_count")
    .eq("user_id", userId)
    .is("superseded_by", null)
    .in("category", ["fact", "preference", "goal", "company", "instruction"])
    .order("importance", { ascending: false })
    .limit(5);

  return (data || []).map(m => m.content);
}
