import type { ActionConfig } from "../universal-types";

export const messageActionConfig: ActionConfig = {
  visualizationType: "message",
  match: (elementType, data) => {
    if (elementType === "list" && /slack|telegram|message|chat/i.test(data?.title || "")) return true;
    if (elementType === "detail" && data?.context?.message) return true;
    return false;
  },
  actions: [
    { id: "msg-reply", label: "Reply", icon: "Reply", primary: true, execute: (ctx) => ctx.helpers.sendToAI(`Reply to: "${ctx.title}"`) },
    { id: "msg-react", label: "React", icon: "SmilePlus", primary: true, execute: (ctx) => ctx.helpers.toast("Reaction picker", "info") },
    { id: "msg-thread", label: "Thread", icon: "MessageSquare", execute: (ctx) => ctx.helpers.sendToAI(`Open thread for: "${ctx.title}"`) },
    { id: "msg-forward", label: "Forward", icon: "Forward", execute: (ctx) => ctx.helpers.sendToAI("Forward this message") },
    { id: "msg-pin", label: "Pin", icon: "Pin", execute: (ctx) => ctx.helpers.toast("Pinned", "success") },
  ],
  aiActions: [
    { id: "msg-ai-draft", label: "Draft Response", inline: true, prompt: (ctx) => `Draft response to:\n\n${JSON.stringify(ctx.data)}` },
    { id: "msg-ai-summarize", label: "Summarize Thread", inline: true, prompt: (ctx) => `Summarize thread:\n\n${JSON.stringify(ctx.data)}` },
    { id: "msg-ai-translate", label: "Translate", inline: true, prompt: (ctx) => `Translate:\n\n${JSON.stringify(ctx.data)}` },
  ],
  voiceCommands: [
    { pattern: /^reply\s+saying\s+(.+)/i, description: "Reply saying...", handler: (t, ctx) => { const m = t.match(/^reply\s+saying\s+(.+)/i); ctx.helpers.sendToAI(`Reply saying: "${m?.[1]}"`); } },
    { pattern: /summarize\s+(this\s+)?thread/i, description: "Summarize this thread", handler: async (_t, ctx) => { const r = await ctx.helpers.executeAIAction(`Summarize:\n\n${JSON.stringify(ctx.data)}`, true); ctx.helpers.setOverlayContent(r); } },
  ],
};
