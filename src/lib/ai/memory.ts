// Memory injection for AI system prompt

import { loadUserMemories, loadTopMemorySummary } from "@/lib/memory";
import { searchMemoriesSemantic } from "@/lib/embeddings";
import { createAdminClient } from "@/lib/supabase";

export async function loadMemoryContext(userId: string, message: string) {
  const [memoryBlock, topMemories, relevantMemories] = await Promise.all([
    loadUserMemories(userId, 20, message),
    loadTopMemorySummary(userId),
    searchMemoriesSemantic(createAdminClient(), userId, message, 10),
  ]);

  return { memoryBlock, topMemories, relevantMemories };
}

export { loadUserMemories, loadTopMemorySummary };
