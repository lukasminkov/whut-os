"use client";

import { useEffect, useState, useCallback } from "react";
import { useGoogleAuth } from "@/hooks/useGoogle";

interface Email {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  important: boolean;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  shared: boolean;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
}

export function useGoogleData() {
  const { isConnected, fetchGoogle } = useGoogleAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState({ emails: false, drive: false, calendar: false });

  const loadEmails = useCallback(async () => {
    if (!isConnected) return;
    setLoading(l => ({ ...l, emails: true }));
    try {
      const data = await fetchGoogle("/api/google/gmail");
      if (data.emails) setEmails(data.emails);
    } catch { /* ignore */ }
    setLoading(l => ({ ...l, emails: false }));
  }, [isConnected, fetchGoogle]);

  const loadDrive = useCallback(async () => {
    if (!isConnected) return;
    setLoading(l => ({ ...l, drive: true }));
    try {
      const data = await fetchGoogle("/api/google/drive");
      if (data.files) setDriveFiles(data.files);
    } catch { /* ignore */ }
    setLoading(l => ({ ...l, drive: false }));
  }, [isConnected, fetchGoogle]);

  const loadCalendar = useCallback(async () => {
    if (!isConnected) return;
    setLoading(l => ({ ...l, calendar: true }));
    try {
      const data = await fetchGoogle("/api/google/calendar");
      if (data.events) setCalendarEvents(data.events);
    } catch { /* ignore */ }
    setLoading(l => ({ ...l, calendar: false }));
  }, [isConnected, fetchGoogle]);

  useEffect(() => {
    if (isConnected) {
      loadEmails();
      loadDrive();
      loadCalendar();
    }
  }, [isConnected, loadEmails, loadDrive, loadCalendar]);

  return { emails, driveFiles, calendarEvents, loading, isConnected, refresh: { loadEmails, loadDrive, loadCalendar } };
}

// Helper to format relative time
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatEventTime(event: CalendarEvent): string {
  const dt = event.start.dateTime || event.start.date;
  if (!dt) return "";
  const d = new Date(dt);
  if (event.start.date && !event.start.dateTime) {
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function driveIcon(mimeType: string): string {
  if (mimeType.includes("spreadsheet")) return "📊";
  if (mimeType.includes("document")) return "📝";
  if (mimeType.includes("presentation")) return "📽️";
  if (mimeType.includes("folder")) return "📁";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("image")) return "🖼️";
  return "📎";
}

// Extracted from name like "John Doe <john@example.com>"
function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return from.split("@")[0];
}

export function EmailsList({ emails, onSelect }: { emails: Email[]; onSelect?: (e: Email) => void }) {
  if (!emails.length) return <div className="text-xs text-white/30 py-4 text-center">No emails loaded</div>;
  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
      {emails.map((mail) => (
        <button
          key={mail.id}
          onClick={() => onSelect?.(mail)}
          className="w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className={`text-sm truncate max-w-[180px] ${mail.unread ? "font-semibold text-white" : "text-white/70"}`}>
              {senderName(mail.from)}
            </span>
            <span className="text-[10px] text-white/40 shrink-0 ml-2">{relativeTime(mail.date)}</span>
          </div>
          <div className={`mt-0.5 text-xs truncate ${mail.unread ? "text-white/60" : "text-white/40"}`}>{mail.subject}</div>
          <div className="mt-1 flex items-center gap-1.5">
            {mail.unread && <span className="h-1.5 w-1.5 rounded-full bg-[#00d4aa]" />}
            {mail.important && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
          </div>
        </button>
      ))}
    </div>
  );
}

export function DriveFilesList({ files }: { files: DriveFile[] }) {
  if (!files.length) return <div className="text-xs text-white/30 py-4 text-center">No files loaded</div>;
  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
      {files.map((file) => (
        <a
          key={file.id}
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{driveIcon(file.mimeType)}</span>
            <span className="text-sm text-white/80 truncate">{file.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-white/30">
            <span>{relativeTime(file.modifiedTime)}</span>
            {file.shared && <span className="text-[#00d4aa]/60">Shared</span>}
          </div>
        </a>
      ))}
    </div>
  );
}

export function CalendarEventsList({ events }: { events: CalendarEvent[] }) {
  if (!events.length) return <div className="text-xs text-white/30 py-4 text-center">No upcoming events</div>;
  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
      {events.map((event) => (
        <a
          key={event.id}
          href={event.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-all"
        >
          <div className="text-sm text-white/80">{event.summary || "Untitled"}</div>
          <div className="mt-1 text-[10px] text-[#00d4aa]/70">{formatEventTime(event)}</div>
          {event.location && <div className="mt-0.5 text-[10px] text-white/30 truncate">{event.location}</div>}
        </a>
      ))}
    </div>
  );
}
