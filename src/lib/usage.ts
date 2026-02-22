// Usage tracking utility for WHUT OS
// Stores AI request logs in localStorage under key: whut_usage

export interface UsageEntry {
  id: string;
  timestamp: number; // Unix ms
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number; // in USD
}

export interface UsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgCostPerRequest: number;
  byModel: Record<
    string,
    {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
    }
  >;
  byDay: Record<
    string, // YYYY-MM-DD
    {
      requests: number;
      costUsd: number;
    }
  >;
}

// Pricing per million tokens (USD)
const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "claude-sonnet-4-6-20250627": { inputPerM: 3, outputPerM: 15 },
  "claude-opus-4": { inputPerM: 15, outputPerM: 75 },
  // fallback for unknown models — use sonnet pricing
  default: { inputPerM: 3, outputPerM: 15 },
};

const STORAGE_KEY = "whut_usage";
const MAX_ENTRIES = 500; // cap to avoid localStorage bloat

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["default"];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerM;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerM;
  return inputCost + outputCost;
}

/** Estimate token count from text length (~4 chars per token) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function loadEntries(): UsageEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UsageEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: UsageEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full — trim and retry
    const trimmed = entries.slice(-100);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {}
  }
}

/**
 * Track a single AI request.
 * Call this after each successful AI response.
 */
export function trackUsage(
  model: string,
  inputTokens: number,
  outputTokens: number
): UsageEntry {
  const entry: UsageEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    model,
    inputTokens,
    outputTokens,
    costUsd: calculateCost(model, inputTokens, outputTokens),
  };

  const entries = loadEntries();
  entries.push(entry);
  // Keep only the last MAX_ENTRIES
  const trimmed = entries.slice(-MAX_ENTRIES);
  saveEntries(trimmed);

  return entry;
}

/**
 * Returns the start of the current billing period (start of current month).
 */
export function getBillingPeriodStart(now?: Date): Date {
  const d = now ? new Date(now) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Returns aggregated stats.
 * @param periodStart - Unix ms; defaults to start of current month
 */
export function getUsageStats(periodStart?: number): UsageStats {
  const entries = loadEntries();
  const start = periodStart ?? getBillingPeriodStart().getTime();

  const stats: UsageStats = {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    avgCostPerRequest: 0,
    byModel: {},
    byDay: {},
  };

  for (const entry of entries) {
    if (entry.timestamp < start) continue;

    stats.totalRequests++;
    stats.totalInputTokens += entry.inputTokens;
    stats.totalOutputTokens += entry.outputTokens;
    stats.totalCostUsd += entry.costUsd;

    // By model
    if (!stats.byModel[entry.model]) {
      stats.byModel[entry.model] = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
    }
    stats.byModel[entry.model].requests++;
    stats.byModel[entry.model].inputTokens += entry.inputTokens;
    stats.byModel[entry.model].outputTokens += entry.outputTokens;
    stats.byModel[entry.model].costUsd += entry.costUsd;

    // By day
    const day = new Date(entry.timestamp).toISOString().slice(0, 10);
    if (!stats.byDay[day]) {
      stats.byDay[day] = { requests: 0, costUsd: 0 };
    }
    stats.byDay[day].requests++;
    stats.byDay[day].costUsd += entry.costUsd;
  }

  stats.avgCostPerRequest =
    stats.totalRequests > 0 ? stats.totalCostUsd / stats.totalRequests : 0;

  return stats;
}

/**
 * Returns raw log entries, newest first.
 */
export function getUsageHistory(limit = 50): UsageEntry[] {
  const entries = loadEntries();
  return entries.slice().reverse().slice(0, limit);
}

/** Format cost in USD */
export function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.0001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(4)}`;
}

/** Format large cost */
export function formatCostLarge(usd: number): string {
  if (usd === 0) return "$0.00";
  return `$${usd.toFixed(4)}`;
}

/** Format token count with K/M suffix */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
