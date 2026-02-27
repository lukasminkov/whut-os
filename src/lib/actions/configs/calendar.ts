import type { ActionConfig } from "../universal-types";

export const calendarActionConfig: ActionConfig = {
  visualizationType: "calendar",
  match: (elementType, data) => {
    if (elementType === "timeline") return true;
    if (elementType === "list" && /calendar|schedule|agenda/i.test(data?.title || "")) return true;
    if (elementType === "detail" && data?.context?.calendar) return true;
    return false;
  },
  actions: [
    { id: "cal-edit", label: "Edit", icon: "Pencil", primary: true, execute: (ctx) => ctx.helpers.sendToAI(`Edit event: "${ctx.title}"`) },
    { id: "cal-rsvp", label: "RSVP", icon: "CheckCircle", primary: true, execute: (ctx) => ctx.helpers.toast("RSVP sent", "success") },
    { id: "cal-join", label: "Join Meeting", icon: "Video", primary: true, execute: (ctx) => ctx.helpers.toast("Opening meeting...", "info") },
    { id: "cal-notes", label: "Add Notes", icon: "StickyNote", execute: (ctx) => ctx.helpers.sendToAI(`Add notes to: "${ctx.title}"`) },
    { id: "cal-delete", label: "Delete", icon: "Trash2", destructive: true, execute: (ctx) => ctx.helpers.toast("Event deleted", "success") },
  ],
  aiActions: [
    { id: "cal-ai-briefing", label: "Prepare Briefing", inline: true, prompt: (ctx) => `Prepare a meeting briefing:\n\n${JSON.stringify(ctx.data)}` },
    { id: "cal-ai-reschedule", label: "Suggest Reschedule", inline: true, prompt: (ctx) => `Suggest reschedule times:\n\n${JSON.stringify(ctx.data)}` },
    { id: "cal-ai-agenda", label: "Draft Agenda", inline: true, prompt: (ctx) => `Draft agenda for:\n\n${JSON.stringify(ctx.data)}` },
  ],
  voiceCommands: [
    { pattern: /reschedule\s+to\s+(.+)/i, description: "Reschedule to tomorrow", handler: (t, ctx) => { const m = t.match(/reschedule\s+to\s+(.+)/i); ctx.helpers.sendToAI(`Reschedule "${ctx.title}" to ${m?.[1]}`); } },
    { pattern: /cancel\s+this/i, description: "Cancel this", handler: (_t, ctx) => ctx.helpers.sendToAI(`Cancel: "${ctx.title}"`) },
    { pattern: /who.*(attending|invited)/i, description: "Who's attending?", handler: async (_t, ctx) => { const r = await ctx.helpers.executeAIAction(`List attendees:\n\n${JSON.stringify(ctx.data)}`, true); ctx.helpers.setOverlayContent(r); } },
  ],
};
