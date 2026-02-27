// OS-level tool executors (file manager, window manager, browser)

import type { ToolResult } from "../types";

export function executeOSTool(
  name: string,
  input: Record<string, unknown>,
): ToolResult | null {
  switch (name) {
    case "file_manager":
      return { result: { os_command: "file_manager", ...input }, status: "Managing files..." };
    case "window_manager":
      return { result: { os_command: "window_manager", ...input }, status: "Managing windows..." };
    case "browser_navigate":
      return { result: { os_command: "browser_navigate", ...input }, status: "Opening browser..." };
    default:
      return null;
  }
}
