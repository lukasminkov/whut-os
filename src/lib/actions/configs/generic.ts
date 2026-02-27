import type { ActionConfig } from "../universal-types";

export const fileActionConfig: ActionConfig = {
  visualizationType: "file",
  match: (elementType, data) => {
    if (elementType === "list" && /file|drive|folder/i.test(data?.title || "")) return true;
    if (elementType === "detail" && data?.context?.file) return true;
    return false;
  },
  actions: [
    { id: "file-download", label: "Download", icon: "Download", primary: true, execute: (ctx) => ctx.helpers.toast("Downloading...", "info") },
    { id: "file-share", label: "Share", icon: "Share2", primary: true, execute: (ctx) => ctx.helpers.sendToAI(`Share: "${ctx.title}"`) },
    { id: "file-move", label: "Move", icon: "FolderInput", execute: (ctx) => ctx.helpers.sendToAI(`Move: "${ctx.title}"`) },
    { id: "file-rename", label: "Rename", icon: "Type", execute: (ctx) => ctx.helpers.sendToAI(`Rename: "${ctx.title}"`) },
    { id: "file-delete", label: "Delete", icon: "Trash2", destructive: true, execute: (ctx) => ctx.helpers.toast("Deleted", "success") },
  ],
  aiActions: [
    { id: "file-ai-summarize", label: "Summarize", inline: true, prompt: (ctx) => `Summarize:\n\n${JSON.stringify(ctx.data)}` },
    { id: "file-ai-keypoints", label: "Key Points", inline: true, prompt: (ctx) => `Key points:\n\n${JSON.stringify(ctx.data)}` },
  ],
  voiceCommands: [
    { pattern: /share.+(with|to)\s+(.+)/i, description: "Share with [person]", handler: (t, ctx) => { const m = t.match(/share.+(with|to)\s+(.+)/i); ctx.helpers.sendToAI(`Share "${ctx.title}" with ${m?.[2]}`); } },
  ],
};

export const tableActionConfig: ActionConfig = {
  visualizationType: "table" as any,
  match: (elementType) => elementType === "table",
  actions: [
    { id: "table-export", label: "Export CSV", icon: "FileSpreadsheet", primary: true, execute: (ctx) => { const { columns, rows } = ctx.data || {}; if (columns && rows) { const csv = [columns.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n"); ctx.helpers.copyToClipboard(csv); ctx.helpers.toast("CSV copied", "success"); } } },
    { id: "table-fullscreen", label: "Fullscreen", icon: "Maximize2", primary: true, execute: () => {} },
  ],
  aiActions: [
    { id: "table-ai-analyze", label: "Analyze Data", inline: true, prompt: (ctx) => `Analyze table:\n\n${JSON.stringify(ctx.data)}` },
  ],
  voiceCommands: [],
};

export const searchActionConfig: ActionConfig = {
  visualizationType: "search" as any,
  match: (elementType) => elementType === "search-results",
  actions: [
    { id: "search-copy", label: "Copy Links", icon: "Copy", primary: true, execute: (ctx) => { const links = (ctx.data?.results || []).map((r: any) => r.url).join("\n"); ctx.helpers.copyToClipboard(links); ctx.helpers.toast("Links copied", "success"); } },
  ],
  aiActions: [
    { id: "search-ai-summarize", label: "Summarize Results", inline: true, prompt: (ctx) => `Summarize search results for "${ctx.data?.query}":\n\n${JSON.stringify(ctx.data?.results)}` },
  ],
  voiceCommands: [],
};

export const imageActionConfig: ActionConfig = {
  visualizationType: "image" as any,
  match: (elementType) => elementType === "image",
  actions: [
    { id: "img-download", label: "Download", icon: "Download", primary: true, execute: (ctx) => { if (ctx.data?.src) window.open(ctx.data.src, "_blank"); } },
    { id: "img-copy", label: "Copy URL", icon: "Copy", execute: (ctx) => { if (ctx.data?.src) { ctx.helpers.copyToClipboard(ctx.data.src); ctx.helpers.toast("URL copied", "success"); } } },
  ],
  aiActions: [
    { id: "img-ai-describe", label: "Describe Image", inline: true, prompt: (ctx) => `Describe: ${ctx.data?.alt || ctx.data?.caption || ctx.data?.src}` },
  ],
  voiceCommands: [],
};
