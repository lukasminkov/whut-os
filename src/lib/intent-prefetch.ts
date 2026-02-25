// Intent prediction for common queries — prefetch data to eliminate a Claude round-trip

export interface PrefetchResult {
  intent: string;
  data: Record<string, any>;
  tools: string[];
}

const INTENT_PATTERNS: { pattern: RegExp; intent: string; tools: string[] }[] = [
  {
    pattern: /\b(good morning|morning briefing|what'?s my day|how'?s my day|daily briefing|start my day|brief me)\b/i,
    intent: "morning_briefing",
    tools: ["fetch_emails", "fetch_calendar"],
  },
  {
    pattern: /\b(check.*(email|mail|inbox)|show.*(email|mail|inbox)|any.*(email|mail)|new.*(email|mail)|unread)\b/i,
    intent: "check_email",
    tools: ["fetch_emails"],
  },
  {
    pattern: /\b(what'?s on my calendar|my schedule|my meetings|upcoming events|today'?s.*calendar|calendar.*today)\b/i,
    intent: "check_calendar",
    tools: ["fetch_calendar"],
  },
  {
    pattern: /\b(show.*finances|financial|revenue|money|earnings|how.*doing financially)\b/i,
    intent: "finances",
    tools: ["fetch_emails", "fetch_calendar"],
  },
  {
    pattern: /\b(my files|recent files|drive files|documents|show.*files)\b/i,
    intent: "check_files",
    tools: ["fetch_drive_files"],
  },
];

/**
 * Detect if a user message matches a common intent pattern.
 * Returns the matched intent and which tools to prefetch, or null.
 */
export function detectIntent(message: string): { intent: string; tools: string[] } | null {
  for (const { pattern, intent, tools } of INTENT_PATTERNS) {
    if (pattern.test(message)) return { intent, tools };
  }
  return null;
}
