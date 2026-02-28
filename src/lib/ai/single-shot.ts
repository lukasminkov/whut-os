// Single-shot display: for predictable queries, build the display scene
// server-side and skip the second Claude roundtrip entirely.
//
// Flow: detectIntent → prefetch data → buildScene → emit directly
// Instead of: detectIntent → prefetch → Claude formats → display tool

import type { PrefetchResult } from "@/lib/intent-prefetch";

interface SceneElement {
  id: string;
  type: string;
  title?: string;
  data: Record<string, unknown>;
  priority: number;
  size: string;
}

interface SingleShotScene {
  id: string;
  intent: string;
  layout: string;
  elements: SceneElement[];
  spoken: string;
}

interface ToolResult {
  result: unknown;
}

/**
 * Attempt to build a complete display scene from prefetched data,
 * bypassing the need for Claude to format it via the display tool.
 *
 * Returns null if the data isn't suitable for single-shot rendering.
 */
export function buildSingleShotScene(
  intent: string,
  toolResults: Map<string, ToolResult>,
): SingleShotScene | null {
  switch (intent) {
    case "check_email":
      return buildEmailScene(toolResults);
    case "check_calendar":
      return buildCalendarScene(toolResults);
    case "morning_briefing":
      return buildBriefingScene(toolResults);
    case "check_files":
      return buildFilesScene(toolResults);
    default:
      return null;
  }
}

function buildEmailScene(toolResults: Map<string, ToolResult>): SingleShotScene | null {
  const emailResult = toolResults.get("fetch_emails");
  if (!emailResult?.result) return null;

  const emails = emailResult.result as any;
  const emailList = Array.isArray(emails) ? emails : emails.emails || emails.messages || [];
  if (emailList.length === 0) return null;

  const unreadCount = emailList.filter((e: any) => e.unread).length;
  const elements: SceneElement[] = [];

  // Email list
  elements.push({
    id: "email-list",
    type: "list",
    title: `Inbox${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`,
    data: {
      items: emailList.slice(0, 15).map((e: any) => ({
        id: e.id,
        title: e.subject || "(no subject)",
        subtitle: e.from || e.sender || "",
        meta: formatRelativeTime(e.date),
        unread: e.unread ?? false,
        detail: e.snippet ? { description: e.snippet } : undefined,
      })),
    },
    priority: 1,
    size: "lg",
  });

  const spoken = unreadCount > 0
    ? `You have ${unreadCount} unread email${unreadCount === 1 ? "" : "s"}. Here's your inbox.`
    : `Your inbox is up to date. Here are your recent emails.`;

  return {
    id: `scene-${Date.now()}`,
    intent: "email inbox",
    layout: "focused",
    elements,
    spoken,
  };
}

function buildCalendarScene(toolResults: Map<string, ToolResult>): SingleShotScene | null {
  const calResult = toolResults.get("fetch_calendar");
  if (!calResult?.result) return null;

  const events = calResult.result as any;
  const eventList = Array.isArray(events) ? events : events.events || events.items || [];
  if (eventList.length === 0) {
    return {
      id: `scene-${Date.now()}`,
      intent: "calendar",
      layout: "focused",
      elements: [{
        id: "cal-empty",
        type: "text",
        title: "Calendar",
        data: { content: "No upcoming events on your calendar." },
        priority: 1,
        size: "md",
      }],
      spoken: "Your calendar is clear — no upcoming events.",
    };
  }

  const elements: SceneElement[] = [{
    id: "cal-list",
    type: "list",
    title: "Upcoming Events",
    data: {
      items: eventList.slice(0, 10).map((e: any, i: number) => ({
        id: e.id || `event-${i}`,
        title: e.summary || e.title || "(untitled)",
        subtitle: e.location || "",
        meta: formatEventTime(e.start),
      })),
    },
    priority: 1,
    size: "lg",
  }];

  const spoken = `You have ${eventList.length} upcoming event${eventList.length === 1 ? "" : "s"}.`;

  return {
    id: `scene-${Date.now()}`,
    intent: "schedule",
    layout: "focused",
    elements,
    spoken,
  };
}

function buildBriefingScene(toolResults: Map<string, ToolResult>): SingleShotScene | null {
  const emailResult = toolResults.get("fetch_emails");
  const calResult = toolResults.get("fetch_calendar");

  if (!emailResult?.result && !calResult?.result) return null;

  const elements: SceneElement[] = [];
  const spokenParts: string[] = [];

  // Calendar events
  if (calResult?.result) {
    const events = calResult.result as any;
    const eventList = Array.isArray(events) ? events : events.events || events.items || [];
    if (eventList.length > 0) {
      elements.push({
        id: "briefing-cal",
        type: "list",
        title: `Today's Schedule — ${eventList.length} event${eventList.length === 1 ? "" : "s"}`,
        data: {
          items: eventList.slice(0, 8).map((e: any, i: number) => ({
            id: e.id || `event-${i}`,
            title: e.summary || e.title || "(untitled)",
            subtitle: e.location || "",
            meta: formatEventTime(e.start),
          })),
        },
        priority: 1,
        size: "lg",
      });
      spokenParts.push(`${eventList.length} event${eventList.length === 1 ? "" : "s"} on your calendar`);
    }
  }

  // Emails
  if (emailResult?.result) {
    const emails = emailResult.result as any;
    const emailList = Array.isArray(emails) ? emails : emails.emails || emails.messages || [];
    const unreadCount = emailList.filter((e: any) => e.unread).length;
    if (emailList.length > 0) {
      elements.push({
        id: "briefing-email",
        type: "list",
        title: `Inbox${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`,
        data: {
          items: emailList.slice(0, 8).map((e: any) => ({
            id: e.id,
            title: e.subject || "(no subject)",
            subtitle: e.from || e.sender || "",
            meta: formatRelativeTime(e.date),
            unread: e.unread ?? false,
          })),
        },
        priority: elements.length === 0 ? 1 : 2,
        size: "lg",
      });
      spokenParts.push(`${unreadCount > 0 ? `${unreadCount} unread` : "no new"} emails`);
    }
  }

  if (elements.length === 0) return null;

  const spoken = `Good morning. You have ${spokenParts.join(" and ")}.`;

  return {
    id: `scene-${Date.now()}`,
    intent: "morning briefing",
    layout: elements.length > 1 ? "grid" : "focused",
    elements,
    spoken,
  };
}

function buildFilesScene(toolResults: Map<string, ToolResult>): SingleShotScene | null {
  const filesResult = toolResults.get("fetch_drive_files");
  if (!filesResult?.result) return null;

  const files = filesResult.result as any;
  const fileList = Array.isArray(files) ? files : files.files || [];
  if (fileList.length === 0) return null;

  return {
    id: `scene-${Date.now()}`,
    intent: "recent files",
    layout: "focused",
    elements: [{
      id: "file-list",
      type: "list",
      title: "Recent Files",
      data: {
        items: fileList.slice(0, 15).map((f: any, i: number) => ({
          id: f.id || `file-${i}`,
          title: f.name || f.title || "(untitled)",
          subtitle: f.mimeType || "",
          meta: formatRelativeTime(f.modifiedTime || f.createdTime),
        })),
      },
      priority: 1,
      size: "lg",
    }],
    spoken: `Here are your ${fileList.length} most recent files.`,
  };
}

// ── Helpers ─────────────────────────────────────────────

function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatEventTime(start: any): string {
  if (!start) return "";
  try {
    const dateStr = start.dateTime || start.date || (typeof start === "string" ? start : "");
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (start.date && !start.dateTime) return "All day";
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}
