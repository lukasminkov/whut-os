// Context-adaptive accent colors based on scene intent

export interface IntentTheme {
  accent: string;       // CSS rgb values like "0, 212, 170"
  accentHex: string;    // e.g. "#00d4aa"
  glow: string;         // rgba glow color
  bgTint: string;       // very subtle background tint
}

const THEMES: Record<string, IntentTheme> = {
  // Communication: blue-cyan
  communication: {
    accent: "56, 189, 248",
    accentHex: "#38bdf8",
    glow: "rgba(56,189,248,0.15)",
    bgTint: "rgba(56,189,248,0.02)",
  },
  // Productivity: amber-gold
  productivity: {
    accent: "245, 158, 11",
    accentHex: "#f59e0b",
    glow: "rgba(245,158,11,0.15)",
    bgTint: "rgba(245,158,11,0.02)",
  },
  // Analysis: green-emerald (default)
  analysis: {
    accent: "0, 212, 170",
    accentHex: "#00d4aa",
    glow: "rgba(0,212,170,0.15)",
    bgTint: "rgba(0,212,170,0.02)",
  },
  // Creative: purple-violet
  creative: {
    accent: "167, 139, 250",
    accentHex: "#a78bfa",
    glow: "rgba(167,139,250,0.15)",
    bgTint: "rgba(167,139,250,0.02)",
  },
};

const DEFAULT_THEME = THEMES.analysis;

// Keywords that map to intent categories
const INTENT_KEYWORDS: Record<string, string[]> = {
  communication: ["email", "mail", "message", "chat", "inbox", "reply", "send", "compose", "contact", "slack", "telegram"],
  productivity: ["calendar", "schedule", "task", "todo", "reminder", "meeting", "event", "agenda", "plan", "deadline"],
  creative: ["write", "draft", "compose", "create", "design", "blog", "article", "content", "story", "poem"],
  analysis: ["search", "find", "analyze", "compare", "data", "chart", "stock", "weather", "research", "news", "price"],
};

export function getIntentTheme(intent?: string): IntentTheme {
  if (!intent) return DEFAULT_THEME;
  const lower = intent.toLowerCase();

  for (const [category, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return THEMES[category] || DEFAULT_THEME;
    }
  }
  return DEFAULT_THEME;
}

/**
 * Apply the intent theme to the document as CSS custom properties.
 * This allows zero-cost color propagation to all components.
 */
export function applyIntentTheme(theme: IntentTheme) {
  const root = document.documentElement;
  root.style.setProperty("--accent-rgb", theme.accent);
  root.style.setProperty("--accent-hex", theme.accentHex);
  root.style.setProperty("--accent-glow", theme.glow);
  root.style.setProperty("--accent-bg-tint", theme.bgTint);
}
