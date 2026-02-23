/**
 * Memory search using Postgres full-text search (tsvector).
 * No external API keys needed — runs entirely in Supabase/Postgres.
 */

/**
 * Search memories by full-text relevance using Postgres ts_rank
 */
export async function searchMemoriesSemantic(
  supabase: any,
  userId: string,
  query: string,
  limit: number = 15
): Promise<any[]> {
  // Use Supabase RPC for full-text search with ranking
  const { data } = await supabase.rpc("search_memories", {
    search_query: query,
    match_user_id: userId,
    match_count: limit,
  });

  if (data && data.length > 0) return data;

  // Fallback: importance-based if FTS returns nothing (e.g., function not yet created)
  return searchMemoriesByImportance(supabase, userId, limit);
}

/**
 * Fallback: importance-based memory retrieval (no search needed)
 */
export async function searchMemoriesByImportance(
  supabase: any,
  userId: string,
  limit: number = 15
): Promise<any[]> {
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .is("superseded_by", null)
    .order("importance", { ascending: false })
    .limit(limit);
  return data || [];
}
