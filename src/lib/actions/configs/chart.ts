import type { ActionConfig } from "../universal-types";

export const chartActionConfig: ActionConfig = {
  visualizationType: "chart",
  match: (elementType) => elementType.startsWith("chart-"),
  actions: [
    { id: "chart-refresh", label: "Refresh", icon: "RefreshCw", primary: true, execute: (ctx) => ctx.helpers.toast("Refreshed", "success") },
    { id: "chart-export-png", label: "Export PNG", icon: "ImageDown", execute: (ctx) => ctx.helpers.toast("Exported PNG", "success") },
    { id: "chart-export-csv", label: "Export CSV", icon: "FileSpreadsheet", execute: (ctx) => { ctx.helpers.copyToClipboard(JSON.stringify(ctx.data, null, 2)); ctx.helpers.toast("Data copied", "success"); } },
    { id: "chart-fullscreen", label: "Fullscreen", icon: "Maximize2", primary: true, execute: () => {} },
  ],
  aiActions: [
    { id: "chart-ai-explain", label: "Explain Trend", inline: true, prompt: (ctx) => `Explain this ${ctx.elementType} data trend:\n\n${JSON.stringify(ctx.data)}` },
    { id: "chart-ai-predict", label: "Predict Next Period", inline: true, prompt: (ctx) => `Predict next period for:\n\n${JSON.stringify(ctx.data)}` },
    { id: "chart-ai-anomalies", label: "Find Anomalies", inline: true, prompt: (ctx) => `Find anomalies in:\n\n${JSON.stringify(ctx.data)}` },
    { id: "chart-ai-compare", label: "Compare To...", prompt: (ctx) => `Compare this data to benchmarks:\n\n${JSON.stringify(ctx.data)}` },
  ],
  voiceCommands: [
    { pattern: /what does this mean/i, description: "What does this mean?", handler: async (_t, ctx) => { const r = await ctx.helpers.executeAIAction(`Explain this chart:\n\n${JSON.stringify(ctx.data)}`, true); ctx.helpers.setOverlayContent(r); } },
    { pattern: /why did it (drop|fall|decrease)/i, description: "Why did it drop?", handler: async (_t, ctx) => { const r = await ctx.helpers.executeAIAction(`This metric dropped. Why?\n\n${JSON.stringify(ctx.data)}`, true); ctx.helpers.setOverlayContent(r); } },
  ],
};
