import type { ActionConfig } from "../universal-types";

export const emailActionConfig: ActionConfig = {
  visualizationType: "email",
  match: (elementType, data) => {
    if (elementType === "detail" && data?.context?.email) return true;
    if (elementType === "list" && data?.title?.toLowerCase().includes("email")) return true;
    if (elementType === "list" && data?.title?.toLowerCase().includes("inbox")) return true;
    return false;
  },
  actions: [
    { id: "email-reply", label: "Reply", icon: "Reply", primary: true, execute: (ctx) => ctx.helpers.sendToAI(`Reply to this email: "${ctx.data?.title || "this email"}"`) },
    { id: "email-reply-all", label: "Reply All", icon: "ReplyAll", execute: (ctx) => ctx.helpers.sendToAI(`Reply all to: "${ctx.data?.title || "this email"}"`) },
    { id: "email-forward", label: "Forward", icon: "Forward", execute: (ctx) => ctx.helpers.sendToAI(`Forward this email`) },
    { id: "email-archive", label: "Archive", icon: "Archive", primary: true, execute: (ctx) => ctx.helpers.toast("Email archived", "success") },
    { id: "email-delete", label: "Delete", icon: "Trash2", destructive: true, execute: (ctx) => ctx.helpers.toast("Email deleted", "success") },
    { id: "email-unread", label: "Mark Unread", icon: "MailOpen", execute: (ctx) => ctx.helpers.toast("Marked unread", "success") },
  ],
  aiActions: [
    { id: "email-ai-draft", label: "Draft Reply", inline: true, prompt: (ctx) => `Draft a professional reply to this email:\n\nSubject: ${ctx.data?.title || ""}\n\n${ctx.data?.sections?.[0]?.content || JSON.stringify(ctx.data)}` },
    { id: "email-ai-summarize", label: "Summarize Thread", inline: true, prompt: (ctx) => `Summarize this email thread concisely:\n\n${JSON.stringify(ctx.data)}` },
    { id: "email-ai-actions", label: "Extract Action Items", inline: true, prompt: (ctx) => `Extract action items from:\n\n${JSON.stringify(ctx.data)}` },
    { id: "email-ai-translate", label: "Translate", inline: true, prompt: (ctx) => `Translate this email:\n\n${ctx.data?.sections?.[0]?.content || JSON.stringify(ctx.data)}` },
  ],
  voiceCommands: [
    { pattern: /^reply\s+saying\s+(.+)/i, description: "Reply saying...", handler: (t, ctx) => { const m = t.match(/^reply\s+saying\s+(.+)/i); ctx.helpers.sendToAI(`Reply saying: "${m?.[1]}"`); } },
    { pattern: /^archive\s+this/i, description: "Archive this", handler: (_t, ctx) => ctx.helpers.toast("Email archived", "success") },
    { pattern: /^forward\s+to\s+(.+)/i, description: "Forward to [person]", handler: (t, ctx) => { const m = t.match(/^forward\s+to\s+(.+)/i); ctx.helpers.sendToAI(`Forward to ${m?.[1]}`); } },
  ],
};
