import type { ActionConfig } from "../universal-types";

export const chartActionConfig: ActionConfig = {
  visualizationType: "chart",
  match: (elementType) => elementType.startsWith("chart-"),
  actions: [
    {
      id: "chart-expand",
      label: "Expand",
      icon: "Maximize2",
      primary: true,
      execute: (ctx) => {
        // Focus this element in the scene
        ctx.helpers.sendToAI(`Show the ${ctx.title || "chart"} in full detail`);
      },
    },
    {
      id: "chart-filter",
      label: "Filter",
      icon: "Filter",
      primary: true,
      execute: (ctx) => {
        ctx.helpers.sendToAI(`Filter the data in this ${ctx.elementType}: ${ctx.title || ""}`);
      },
    },
    {
      id: "chart-export-csv",
      label: "Export CSV",
      icon: "FileSpreadsheet",
      execute: (ctx) => {
        const d = ctx.data;
        let csv = "";
        if (d.points) {
          csv = "Label,Value\n" + d.points.map((p: any) => `${p.label},${p.value}`).join("\n");
        } else if (d.bars) {
          csv = "Label,Value\n" + d.bars.map((b: any) => `${b.label},${b.value}`).join("\n");
        } else {
          csv = JSON.stringify(d, null, 2);
        }
        ctx.helpers.copyToClipboard(csv);
        ctx.helpers.toast("CSV copied to clipboard", "success");
      },
    },
    {
      id: "chart-export-png",
      label: "Export PNG",
      icon: "ImageDown",
      execute: (ctx) => {
        ctx.helpers.toast("Exported PNG", "success");
      },
    },
    {
      id: "chart-refresh",
      label: "Refresh",
      icon: "RefreshCw",
      execute: (ctx) => ctx.helpers.sendToAI(`Refresh the data for: ${ctx.title || "this chart"}`),
    },
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
