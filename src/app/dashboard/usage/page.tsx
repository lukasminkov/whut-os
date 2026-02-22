"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getUsageStats,
  getUsageHistory,
  getBillingPeriodStart,
  formatCost,
  formatCostLarge,
  formatTokens,
  type UsageStats,
  type UsageEntry,
} from "@/lib/usage";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBillingPeriodLabel(): string {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}

/** Build array of all days in current month up to today, with usage values. */
function buildDailyBars(
  byDay: Record<string, { requests: number; costUsd: number }>,
  metric: "requests" | "cost"
): { label: string; value: number; dateKey: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const bars: { label: string; value: number; dateKey: string }[] = [];

  for (let d = 1; d <= today; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayData = byDay[dateKey];
    const value =
      metric === "requests"
        ? (dayData?.requests ?? 0)
        : (dayData?.costUsd ?? 0);
    bars.push({ label: String(d), value, dateKey });
  }

  return bars;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-[10px] uppercase tracking-[0.35em] text-white/40">
        {label}
      </span>
      <span
        className={`text-2xl font-semibold tracking-tight ${
          accent ? "text-[#00d4aa]" : "text-white"
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-white/30">{sub}</span>}
    </div>
  );
}

function ModelTable({
  byModel,
}: {
  byModel: UsageStats["byModel"];
}) {
  const models = Object.entries(byModel);
  if (models.length === 0) {
    return (
      <p className="text-sm text-white/30 py-4 text-center">
        No model data yet
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/35 uppercase tracking-[0.25em]">
            <th className="text-left py-2 pr-4 font-medium">Model</th>
            <th className="text-right py-2 px-4 font-medium">Requests</th>
            <th className="text-right py-2 px-4 font-medium">Input</th>
            <th className="text-right py-2 px-4 font-medium">Output</th>
            <th className="text-right py-2 pl-4 font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {models.map(([model, data]) => (
            <tr
              key={model}
              className="border-t border-white/[0.05] text-white/70 hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-3 pr-4 font-mono text-[11px] text-white/80">
                {model}
              </td>
              <td className="py-3 px-4 text-right">{data.requests}</td>
              <td className="py-3 px-4 text-right text-cyan-400/80">
                {formatTokens(data.inputTokens)}
              </td>
              <td className="py-3 px-4 text-right text-purple-400/80">
                {formatTokens(data.outputTokens)}
              </td>
              <td className="py-3 pl-4 text-right text-[#00d4aa]">
                {formatCost(data.costUsd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DailyChart({
  byDay,
  metric,
  onMetricChange,
}: {
  byDay: UsageStats["byDay"];
  metric: "requests" | "cost";
  onMetricChange: (m: "requests" | "cost") => void;
}) {
  const bars = buildDailyBars(byDay, metric);
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const today = new Date().getDate().toString();

  return (
    <div>
      {/* Metric toggle */}
      <div className="flex items-center gap-2 mb-5">
        {(["requests", "cost"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onMetricChange(m)}
            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
              metric === m
                ? "bg-white/[0.1] text-white"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            {m === "requests" ? "Requests" : "Cost"}
          </button>
        ))}
      </div>

      {/* Bars */}
      <div className="flex items-end gap-[3px] h-28">
        {bars.map((bar) => {
          const heightPct = maxVal > 0 ? (bar.value / maxVal) * 100 : 0;
          const isToday = bar.label === today;
          return (
            <div
              key={bar.dateKey}
              className="group relative flex flex-col items-center flex-1"
              style={{ minWidth: 0 }}
            >
              {/* Tooltip */}
              <div
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                style={{
                  background: "rgba(10,10,20,0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "4px 8px",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {bar.dateKey}:{" "}
                {metric === "requests"
                  ? `${bar.value} req`
                  : formatCost(bar.value)}
              </div>

              {/* Bar fill */}
              <div
                className="w-full rounded-sm transition-all duration-300"
                style={{
                  height: `${Math.max(heightPct, bar.value > 0 ? 4 : 1)}%`,
                  background: isToday
                    ? "rgba(0,212,170,0.7)"
                    : bar.value > 0
                    ? "rgba(0,212,170,0.25)"
                    : "rgba(255,255,255,0.04)",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels (every 5 days) */}
      <div className="flex items-start gap-[3px] mt-1">
        {bars.map((bar) => {
          const show =
            bar.label === "1" ||
            Number(bar.label) % 5 === 0 ||
            bar.label === new Date().getDate().toString();
          return (
            <div
              key={bar.dateKey}
              className="flex-1 text-center"
              style={{ minWidth: 0 }}
            >
              <span
                className={`text-[9px] ${
                  bar.label === today ? "text-[#00d4aa]" : "text-white/25"
                }`}
              >
                {show ? bar.label : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsageLog({ entries }: { entries: UsageEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-white/25">
        No requests yet. Start chatting with WHUT OS to see usage here.
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.03] transition-colors gap-3"
        >
          <div className="text-[10px] text-white/35 w-28 shrink-0">
            {formatDate(entry.timestamp)}
          </div>
          <div className="font-mono text-[10px] text-white/50 truncate flex-1">
            {entry.model}
          </div>
          <div className="text-[10px] text-cyan-400/70 w-16 text-right shrink-0">
            {formatTokens(entry.inputTokens)} in
          </div>
          <div className="text-[10px] text-purple-400/70 w-16 text-right shrink-0">
            {formatTokens(entry.outputTokens)} out
          </div>
          <div className="text-[10px] text-[#00d4aa] w-16 text-right shrink-0 font-medium">
            {formatCost(entry.costUsd)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [history, setHistory] = useState<UsageEntry[]>([]);
  const [chartMetric, setChartMetric] = useState<"requests" | "cost">(
    "requests"
  );

  const refresh = useCallback(() => {
    const periodStart = getBillingPeriodStart().getTime();
    setStats(getUsageStats(periodStart));
    setHistory(getUsageHistory(50));
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh every 30 s (for live sessions)
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const billingLabel = getBillingPeriodLabel();

  const glassCard = {
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div
      className="min-h-screen overflow-y-auto px-6 py-8 md:px-10 md:py-10"
      style={{ color: "white" }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              Usage
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Billing period:{" "}
              <span className="text-white/60">{billingLabel}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/35">
              Total cost this period
            </div>
            <div className="text-3xl font-semibold text-[#00d4aa] mt-1">
              {stats ? formatCostLarge(stats.totalCostUsd) : "—"}
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Requests"
            value={stats ? String(stats.totalRequests) : "—"}
            sub="this period"
          />
          <StatCard
            label="Input Tokens"
            value={stats ? formatTokens(stats.totalInputTokens) : "—"}
            sub="prompt"
          />
          <StatCard
            label="Output Tokens"
            value={stats ? formatTokens(stats.totalOutputTokens) : "—"}
            sub="completion"
          />
          <StatCard
            label="Avg Cost / Req"
            value={stats ? formatCost(stats.avgCostPerRequest) : "—"}
            accent
          />
        </div>

        {/* ── Model Breakdown ── */}
        <div className="rounded-2xl p-6" style={glassCard}>
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">
            Model Breakdown
          </h2>
          {stats ? (
            <ModelTable byModel={stats.byModel} />
          ) : (
            <p className="text-sm text-white/25">Loading...</p>
          )}
        </div>

        {/* ── Daily Chart ── */}
        <div className="rounded-2xl p-6" style={glassCard}>
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">
            Daily Activity
          </h2>
          {stats ? (
            <DailyChart
              byDay={stats.byDay}
              metric={chartMetric}
              onMetricChange={setChartMetric}
            />
          ) : (
            <p className="text-sm text-white/25">Loading...</p>
          )}
        </div>

        {/* ── Recent Log ── */}
        <div className="rounded-2xl p-6" style={glassCard}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40">
              Recent Requests
            </h2>
            {history.length > 0 && (
              <span className="text-[10px] text-white/25">
                Last {history.length}
              </span>
            )}
          </div>

          {/* Log header */}
          {history.length > 0 && (
            <div className="flex items-center justify-between py-1 px-3 mb-1 gap-3">
              <div className="text-[9px] uppercase tracking-[0.25em] text-white/20 w-28 shrink-0">
                Time
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-white/20 flex-1">
                Model
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-white/20 w-16 text-right shrink-0">
                Input
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-white/20 w-16 text-right shrink-0">
                Output
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-white/20 w-16 text-right shrink-0">
                Cost
              </div>
            </div>
          )}

          <UsageLog entries={history} />
        </div>

        {/* ── Pricing Reference ── */}
        <div className="rounded-2xl p-5" style={{ ...glassCard, background: "rgba(255,255,255,0.015)" }}>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-white/25 mb-3">
            Pricing Reference
          </h2>
          <div className="space-y-2 text-xs text-white/30">
            <div className="flex items-center justify-between">
              <span className="font-mono">claude-sonnet-4-20250514</span>
              <span>$3 / M input · $15 / M output</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono">claude-opus-4</span>
              <span>$15 / M input · $75 / M output</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
