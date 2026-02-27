// Email Action Provider
// Provides Reply, Reply All, Forward, Archive actions for email detail views.

import type { Action, ActionHelpers } from "../types";
import { registerActionProvider } from "../registry";

interface EmailContext {
  id: string;
  threadId?: string;
  from: string;
  to?: string;
  subject: string;
  date?: string;
  body?: string;
  bodyType?: string;
}

function extractEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1] : fromHeader;
}

function extractAllRecipients(to: string | undefined, from: string): string[] {
  const emails = new Set<string>();
  emails.add(extractEmail(from));
  if (to) {
    to.split(",").forEach(addr => {
      const e = extractEmail(addr.trim());
      if (e) emails.add(e);
    });
  }
  return Array.from(emails);
}

function getEmailActions(ctx: Record<string, unknown>, helpers: ActionHelpers): Action[] {
  const email = ctx as unknown as EmailContext;
  const senderEmail = extractEmail(email.from);
  const replySubject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
  const fwdSubject = email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`;

  const quotedBody = `\n\n---\nOn ${email.date || "unknown date"}, ${email.from} wrote:\n${email.body || ""}`;

  const sendReply = async (to: string, subject: string, body: string) => {
    const res = await helpers.googleFetch("/api/google/gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send");
    helpers.toast?.("Email sent", "success");
    return data;
  };

  const aiDraftConfig = {
    label: "AI Draft",
    generate: async (currentValues: Record<string, string>) => {
      const res = await fetch("/api/google/gmail/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: email.from,
          to: email.to,
          subject: email.subject,
          emailBody: email.body || "",
          instructions: currentValues.body || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft");
      return { body: data.draft };
    },
  };

  return [
    {
      id: "email-reply",
      label: "Reply",
      group: "reply",
      variant: "primary",
      compose: {
        fields: [
          { name: "to", label: "To", type: "email", defaultValue: senderEmail, required: true },
          { name: "subject", label: "Subject", type: "text", defaultValue: replySubject },
          { name: "body", label: "", type: "textarea", placeholder: "Write your reply...", rows: 5, defaultValue: "" },
        ],
        submitLabel: "Send Reply",
        submitVariant: "primary",
        voiceField: "body",
        aiDraft: aiDraftConfig,
        onSubmit: async (values) => {
          await sendReply(values.to, values.subject, values.body + quotedBody);
        },
      },
    },
    {
      id: "email-reply-all",
      label: "Reply All",
      group: "reply",
      variant: "secondary",
      compose: {
        fields: [
          { name: "to", label: "To", type: "email", defaultValue: extractAllRecipients(email.to, email.from).join(", "), required: true },
          { name: "subject", label: "Subject", type: "text", defaultValue: replySubject },
          { name: "body", label: "", type: "textarea", placeholder: "Write your reply...", rows: 5, defaultValue: "" },
        ],
        submitLabel: "Send Reply All",
        submitVariant: "primary",
        voiceField: "body",
        aiDraft: aiDraftConfig,
        onSubmit: async (values) => {
          await sendReply(values.to, values.subject, values.body + quotedBody);
        },
      },
    },
    {
      id: "email-forward",
      label: "Forward",
      group: "reply",
      variant: "secondary",
      compose: {
        fields: [
          { name: "to", label: "To", type: "email", placeholder: "recipient@email.com", required: true },
          { name: "subject", label: "Subject", type: "text", defaultValue: fwdSubject },
          { name: "body", label: "", type: "textarea", placeholder: "Add a note (optional)...", rows: 3, defaultValue: "" },
        ],
        submitLabel: "Forward",
        submitVariant: "primary",
        voiceField: "body",
        onSubmit: async (values) => {
          const fwdBody = (values.body ? values.body + "\n\n" : "") +
            `---------- Forwarded message ----------\nFrom: ${email.from}\nDate: ${email.date || ""}\nSubject: ${email.subject}\nTo: ${email.to || ""}\n\n${email.body || ""}`;
          await sendReply(values.to, values.subject, fwdBody);
        },
      },
    },
    {
      id: "email-archive",
      label: "Archive",
      group: "manage",
      variant: "ghost",
      execute: async () => {
        const res = await helpers.googleFetch("/api/google/gmail", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive", id: email.id }),
        });
        if (!res.ok) {
          helpers.toast?.("Failed to archive", "error");
          return;
        }
        helpers.toast?.("Email archived", "success");
        helpers.sendToAI?.("The email has been archived. Show my inbox.");
      },
    },
  ];
}

registerActionProvider({
  contextKey: "email",
  getActions: getEmailActions,
});
