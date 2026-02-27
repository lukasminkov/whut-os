// Unified tool executor

import type { GoogleTokens, ToolResult } from "../types";
import { executeGoogleTool } from "./google";
import { executeWebTool } from "./web";
import { executeOSTool } from "./os";

const GOOGLE_TOOLS = new Set(["fetch_emails", "get_email", "fetch_calendar", "fetch_drive_files", "send_email", "archive_email"]);
const WEB_TOOLS = new Set(["search_web", "read_page"]);
const OS_TOOLS = new Set(["file_manager", "window_manager", "browser_navigate"]);

export const STATUS_MAP: Record<string, string> = {
  fetch_emails: "Checking your emails...",
  fetch_calendar: "Looking at your calendar...",
  fetch_drive_files: "Browsing your files...",
  search_web: "Searching the web...",
  send_email: "Sending email...",
  get_email: "Reading email...",
  archive_email: "Archiving...",
  read_page: "Reading page...",
  file_manager: "Managing files...",
  window_manager: "Managing windows...",
  browser_navigate: "Opening browser...",
};

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  tokens: GoogleTokens,
  userId?: string,
  onRefresh?: (token: string) => Promise<void>,
): Promise<ToolResult> {
  if (GOOGLE_TOOLS.has(name)) {
    const result = await executeGoogleTool(name, input, tokens, userId, onRefresh);
    if (result) return result;
  }
  if (WEB_TOOLS.has(name)) {
    const result = await executeWebTool(name, input);
    if (result) return result;
  }
  if (OS_TOOLS.has(name)) {
    const result = executeOSTool(name, input);
    if (result) return result;
  }
  return { result: { error: `Unknown tool: ${name}` } };
}
