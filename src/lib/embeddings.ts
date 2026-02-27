/**
 * Memory search using Postgres full-text search (tsvector).
 * No external API keys needed — runs entirely in Supabase/Postgres.
 * 
 * Note: Despite the filename, this does NOT use vector embeddings.
 * Uses Postgres FTS with ts_rank for relevance scoring, falling back
 * to importance-based retrieval if the RPC function doesn't exist.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface MemoryRecord {
  id: string;
  user_id: string;
  fact: string;
  category: string;
  importance: number;
  reinforcement_count: number;
  superseded_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Search memories by full-text relevance using Postgres ts_rank
 */
export async function searchMemoriesSemantic(
  supabase: SupabaseClient | null,
  userId: string,
  query: string,
  limit: number = 15,
): Promise<MemoryRecord[]> {
  if (!supabase) return [];

  try {
    const { data } = await supabase.rpc("search_memories", {
      search_query: query,
      match_user_id: userId,
      match_count: limit,
    });

    if (data && data.length > 0) return data as MemoryRecord[];
  } catch {
    // RPC function may not exist yet — fall through to fallback
  }

  return searchMemoriesByImportance(supabase, userId, limit);
}

/**
 * Fallback: importance-based memory retrieval (no search needed)
 */
export async function searchMemoriesByImportance(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 15,
): Promise<MemoryRecord[]> {
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .is("superseded_by", null)
    .order("importance", { ascending: false })
    .limit(limit);
  return (data || []) as MemoryRecord[];
}
