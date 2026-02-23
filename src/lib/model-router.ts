/**
 * WHUT OS — Intent-Based Smart Model Router
 * 
 * Routes to the optimal model based on message intent:
 * - Quick factual → Haiku (cheapest, fastest)
 * - Standard conversation → Sonnet
 * - Complex reasoning → Opus
 * - Background tasks → Haiku
 */

const HAIKU = "claude-haiku-4-20250414";
const SONNET = "claude-sonnet-4-6";
const OPUS = "claude-opus-4-6";

type Intent = "quick_fact" | "standard" | "complex" | "creative";

/**
 * Fast local classification (no API call needed for obvious cases).
 * Returns null if uncertain — then we'd use Haiku to classify.
 */
function localClassify(message: string): Intent | null {
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;

  // Very short messages are quick facts
  if (wordCount <= 5 && !lower.includes("?")) return "standard";
  if (wordCount <= 3) return "quick_fact";

  // Quick fact patterns
  const quickPatterns = [
    /^(what|who|when|where|how much|how many|how old)\b.{0,50}\?$/i,
    /^(is|are|was|were|do|does|did|can|will)\b.{0,40}\?$/i,
    /^(define|meaning of|what'?s)\b/i,
    /^(hi|hello|hey|thanks|thank you|ok|okay|sure|yes|no|bye)\b/i,
  ];
  if (quickPatterns.some(p => p.test(lower))) return "quick_fact";

  // Complex patterns
  const complexPatterns = [
    /\b(analy[sz]e|compare|evaluate|investigate|assess)\b/i,
    /\b(strateg|architect|design system|refactor)\b/i,
    /\b(write|draft|compose).{0,30}(report|proposal|document|essay|article)/i,
    /\b(explain in detail|deep dive|comprehensive)\b/i,
    /\b(pros and cons|trade.?offs|implications)\b/i,
    /\b(debug|troubleshoot|diagnose)\b/i,
  ];
  if (complexPatterns.some(p => p.test(lower)) || wordCount > 100) return "complex";

  // Creative patterns
  const creativePatterns = [
    /\b(brainstorm|creative|ideate|come up with)\b/i,
    /\b(write|draft|compose).{0,20}(story|poem|song|script)/i,
  ];
  if (creativePatterns.some(p => p.test(lower))) return "complex"; // Use Opus for creative too

  // Everything else is standard
  return "standard";
}

/**
 * Select the optimal model for a user message.
 * Uses fast local classification — no API call overhead.
 */
export function selectModel(message: string): { model: string; intent: Intent } {
  const intent = localClassify(message) || "standard";
  
  const modelMap: Record<Intent, string> = {
    quick_fact: SONNET, // Haiku is too dumb for tool use; use Sonnet but it's still fast
    standard: SONNET,
    complex: OPUS,
    creative: OPUS,
  };

  return { model: modelMap[intent], intent };
}

/**
 * Get the background task model (always Haiku — cheap and fast).
 */
export function getBackgroundModel(): string {
  return HAIKU;
}

/**
 * Model display names for UI.
 */
export function modelDisplayName(model: string): string {
  if (model.includes("haiku")) return "Haiku";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("opus")) return "Opus";
  return model;
}
