import type { ActionConfig } from "../universal-types";

export const documentActionConfig: ActionConfig = {
  visualizationType: "document",
  match: (elementType, data) => {
    if (elementType === "text" && (data?.content?.length || 0) > 200) return true;
    if (elementType === "detail" && data?.context?.document) return true;
    return false;
  },
  actions: [
    { id: "doc-export", label: "Export PDF", icon: "FileDown", primary: true, execute: (ctx) => ctx.helpers.toast("Exporting PDF...", "info") },
    { id: "doc-share", label: "Share", icon: "Share2", primary: true, execute: (ctx) => ctx.helpers.sendToAI(`Share document: "${ctx.title}"`) },
    { id: "doc-history", label: "Version History", icon: "History", execute: (ctx) => ctx.helpers.toast("Opening history...", "info") },
    { id: "doc-print", label: "Print", icon: "Printer", execute: () => window.print() },
  ],
  aiActions: [
    { id: "doc-ai-continue", label: "Continue Writing", inline: true, prompt: (ctx) => `Continue writing:\n\n${ctx.data?.content || JSON.stringify(ctx.data)}` },
    { id: "doc-ai-tone", label: "Improve Tone", inline: true, prompt: (ctx) => `Improve tone:\n\n${ctx.data?.content || JSON.stringify(ctx.data)}` },
    { id: "doc-ai-shorten", label: "Shorten", inline: true, prompt: (ctx) => `Shorten:\n\n${ctx.data?.content || JSON.stringify(ctx.data)}` },
    { id: "doc-ai-translate", label: "Translate", inline: true, prompt: (ctx) => `Translate:\n\n${ctx.data?.content || JSON.stringify(ctx.data)}` },
    { id: "doc-ai-grammar", label: "Fix Grammar", inline: true, prompt: (ctx) => `Fix grammar:\n\n${ctx.data?.content || JSON.stringify(ctx.data)}` },
  ],
  voiceCommands: [
    { pattern: /make.+more\s+formal/i, description: "Make this more formal", handler: async (_t, ctx) => { const r = await ctx.helpers.executeAIAction(`Rewrite formally:\n\n${ctx.data?.content || ""}`, true); ctx.helpers.setOverlayContent(r); } },
    { pattern: /translate\s+to\s+(.+)/i, description: "Translate to German", handler: async (t, ctx) => { const m = t.match(/translate\s+to\s+(.+)/i); const r = await ctx.helpers.executeAIAction(`Translate to ${m?.[1]}:\n\n${ctx.data?.content || ""}`, true); ctx.helpers.setOverlayContent(r); } },
  ],
};
