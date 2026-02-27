// Feedback system — storage & retrieval for personal RLHF loop

import { createAdminClient } from "./supabase";

export interface FeedbackEntry {
  id: string;
  created_at: string;
  user_query: string;
  ai_response_summary: string;
  visualization_type: string;
  feedback_text: string;
  rating: "up" | "down";
}

/**
 * Fetch relevant feedback for injection into AI prompt.
 * Filters by visualization type match or keyword overlap with the current query.
 */
export async function getRelevantFeedback(
  userId: string,
  currentQuery: string,
  vizType?: string,
  limit = 12
): Promise<FeedbackEntry[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  // Strategy: fetch recent feedback, prefer matching viz types
  let query = supabase
    .from("feedback")
    .select("id, created_at, user_query, ai_response_summary, visualization_type, feedback_text, rating")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data, error } = await query;
  if (error || !data) return [];

  // Score by relevance
  const queryWords = new Set(currentQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const scored = data.map((entry: FeedbackEntry) => {
    let score = 0;
    // Viz type match
    if (vizType && entry.visualization_type === vizType) score += 3;
    // Keyword overlap
    const entryText = `${entry.user_query} ${entry.feedback_text}`.toLowerCase();
    for (const w of queryWords) {
      if (entryText.includes(w)) score += 1;
    }
    // Recency bonus (newer = higher)
    const age = Date.now() - new Date(entry.created_at).getTime();
    if (age < 86400000) score += 2; // last 24h
    else if (age < 604800000) score += 1; // last week
    return { ...entry, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Get the distilled design preferences summary for a user.
 */
export async function getDesignPreferences(userId: string): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("design_preferences")
    .select("summary")
    .eq("user_id", userId)
    .single();

  return data?.summary || null;
}

/**
 * Format feedback entries for injection into AI system prompt.
 */
export function formatFeedbackForPrompt(entries: FeedbackEntry[], designPrefs: string | null): string {
  if (!entries.length && !designPrefs) return "";

  let block = "\n\n## User Design Preferences & Past Feedback\n";
  block += "Use this to adapt your visual output to the user's preferences.\n";

  if (designPrefs) {
    block += `\n### Distilled Preferences:\n${designPrefs}\n`;
  }

  if (entries.length > 0) {
    block += "\n### Recent Feedback:\n";
    for (const e of entries) {
      const emoji = e.rating === "up" ? "👍" : "👎";
      block += `- ${emoji} [${e.visualization_type || "general"}] "${e.feedback_text}"`;
      if (e.user_query) block += ` (on query: "${e.user_query.slice(0, 80)}")`;
      block += "\n";
    }
  }

  return block;
}
