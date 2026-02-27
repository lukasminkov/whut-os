// Google tool executors

import {
  getRecentEmails, getMessage, getUpcomingEvents, getRecentDriveFiles,
  sendEmail, archiveEmail, markAsRead, refreshAccessToken,
} from "@/lib/google";
import { cached, invalidate } from "@/lib/api-cache";
import type { GoogleTokens, ToolResult } from "../types";

type RefreshFn = <T>(fn: (token: string) => Promise<T>) => Promise<T>;

function makeRefresher(tokens: GoogleTokens, userId: string | undefined, onRefresh?: (token: string) => Promise<void>): RefreshFn {
  let accessToken = tokens.access;
  return async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
    try { return await fn(accessToken); }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (tokens.refresh && msg.includes("401")) {
        const refreshed = await refreshAccessToken(tokens.refresh);
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          if (userId && onRefresh) await onRefresh(accessToken);
          return await fn(accessToken);
        }
      }
      throw err;
    }
  };
}

export async function executeGoogleTool(
  name: string, input: Record<string, unknown>,
  tokens: GoogleTokens, userId: string | undefined,
  onRefresh?: (token: string) => Promise<void>,
): Promise<ToolResult | null> {
  const withRefresh = makeRefresher(tokens, userId, onRefresh);

  switch (name) {
    case "fetch_emails": {
      const maxResults = (input.maxResults as number) || 10;
      const cacheKey = `emails:${userId || "anon"}:${maxResults}`;
      const emails = await cached(cacheKey, 60_000, () => withRefresh(t => getRecentEmails(t, maxResults)));
      return { result: { emails }, status: "Checked your emails" };
    }
    case "get_email": {
      const id = input.id as string;
      const cacheKey = `email:${userId || "anon"}:${id}`;
      const email = await cached(cacheKey, 60_000, () => withRefresh(t => getMessage(t, id)));
      // Auto-mark as read when opened
      withRefresh(t => markAsRead(t, id)).catch(() => {/* best-effort */});
      // Invalidate email list cache so unread state updates
      invalidate(`emails:${userId || "anon"}:10`);
      invalidate(`emails:${userId || "anon"}:15`);
      return { result: email as Record<string, unknown>, status: "Reading email" };
    }
    case "fetch_calendar": {
      const maxResults = (input.maxResults as number) || 10;
      const cacheKey = `calendar:${userId || "anon"}:${maxResults}`;
      const events = await cached(cacheKey, 60_000, () => withRefresh(t => getUpcomingEvents(t, maxResults)));
      const normalized = (events as Array<Record<string, unknown>>).map((e) => ({
        title: (e.summary || e.title || "Untitled") as string,
        start: ((e.start as Record<string, unknown>)?.dateTime || (e.start as Record<string, unknown>)?.date || e.start || "") as string,
        end: ((e.end as Record<string, unknown>)?.dateTime || (e.end as Record<string, unknown>)?.date || e.end || "") as string,
        location: (e.location || "") as string,
      }));
      return { result: { events: normalized }, status: "Checked your calendar" };
    }
    case "fetch_drive_files": {
      const maxResults = (input.maxResults as number) || 15;
      const cacheKey = `drive:${userId || "anon"}:${maxResults}`;
      const files = await cached(cacheKey, 60_000, () => withRefresh(t => getRecentDriveFiles(t, maxResults)));
      const normalized = (files as Array<Record<string, unknown>>).map((f) => ({
        name: f.name as string,
        type: (f.mimeType || "") as string,
        modified: f.modifiedTime ? new Date(f.modifiedTime as string).toLocaleDateString() : "",
        link: (f.webViewLink || "") as string,
      }));
      return { result: { files: normalized }, status: "Checked your files" };
    }
    case "send_email": {
      const sent = await withRefresh(t => sendEmail(t, input.to as string, input.subject as string, input.body as string));
      invalidate(`emails:${userId || "anon"}:10`);
      return { result: { success: true, messageId: (sent as Record<string, unknown>).id }, status: `Sent email to ${input.to}` };
    }
    case "archive_email": {
      await withRefresh(t => archiveEmail(t, input.id as string));
      invalidate(`emails:${userId || "anon"}:10`);
      return { result: { success: true }, status: "Archived email" };
    }
    default:
      return null;
  }
}
