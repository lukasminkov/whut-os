import type { ActionConfig } from "../universal-types";

export const metricActionConfig: ActionConfig = {
  visualizationType: "metric",
  match: (elementType) => elementType === "metric",
  actions: [
    { id: "metric-drill", label: "Drill Down", icon: "ArrowDownToLine", primary: true, execute: (ctx) => ctx.helpers.sendToAI(`Drill down into ${ctx.data?.label}: show breakdown`) },
    { id: "metric-export", label: "Export", icon: "Download", execute: (ctx) => { ctx.helpers.copyToClipboard(JSON.stringify(ctx.data, null, 2)); ctx.helpers.toast("Copied", "success"); } },
    { id: "metric-alert", label: "Set Alert", icon: "Bell", primary: true, execute: (ctx) => ctx.helpers.sendToAI(`Set alert for ${ctx.data?.label}`) },
    { id: "metric-compare", label: "Compare Period", icon: "ArrowLeftRight", execute: (ctx) => ctx.helpers.sendToAI(`Compare ${ctx.data?.label} to last period`) },
  ],
  aiActions: [
    { id: "metric-ai-explain", label: "Explain Change", inline: true, prompt: (ctx) => `Explain this metric:\n\n${ctx.data?.label}: ${ctx.data?.value} (${ctx.data?.change ? ctx.data.change + "%" : "no change"}, trend: ${ctx.data?.trend || "unknown"})` },
    { id: "metric-ai-forecast", label: "Forecast", inline: true, prompt: (ctx) => `Forecast next period:\n\n${JSON.stringify(ctx.data)}` },
    { id: "metric-ai-root-cause", label: "Find Root Cause", inline: true, prompt: (ctx) => `Root cause analysis:\n\n${JSON.stringify(ctx.data)}` },
    { id: "metric-ai-report", label: "Generate Report", prompt: (ctx) => `Executive report for:\n\n${JSON.stringify(ctx.data)}` },
  ],
  voiceCommands: [
    { pattern: /why\s+is\s+(this|it)\s+(up|down|flat)/i, description: "Why is this up?", handler: async (t, ctx) => { const r = await ctx.helpers.executeAIAction(`Explain why ${ctx.data?.label} is trending: ${t}\n\n${JSON.stringify(ctx.data)}`, true); ctx.helpers.setOverlayContent(r); } },
    { pattern: /compare\s+to\s+last\s+(.+)/i, description: "Compare to last month", handler: (t, ctx) => ctx.helpers.sendToAI(`Compare ${ctx.data?.label} to ${t.match(/last\s+(.+)/i)?.[1]}`) },
  ],
};
