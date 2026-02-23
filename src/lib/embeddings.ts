/**
 * Vector embeddings for semantic memory search.
 * Uses OpenAI's text-embedding-3-small model.
 * Falls back gracefully if OPENAI_API_KEY is not set.
 */

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // limit input length
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

/**
 * Fallback: importance-based memory search (no embeddings needed)
 */
export async function searchMemoriesByText(
  supabase: any,
  userId: string,
  query: string,
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

/**
 * Vector similarity search using pgvector
 */
export async function searchMemoriesByVector(
  supabase: any,
  userId: string,
  queryEmbedding: number[],
  limit: number = 15
): Promise<any[]> {
  const { data } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: limit,
    match_threshold: 0.3,
  });
  return data || [];
}
