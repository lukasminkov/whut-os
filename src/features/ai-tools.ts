// AI Tool definitions for OS-level features (file_manager, window_manager, browser)

export const FILE_MANAGER_TOOL = {
  name: "file_manager",
  description: `Manage the user's files. Actions:
- list: List files in a directory. Params: { path: string }
- search: Search files by name. Params: { query: string }
- write: Save/upload content. Params: { path: string, content: string, filename?: string }
- delete: Delete a file. Params: { path: string }
- move: Move/rename a file. Params: { from: string, to: string }

Mount points: "/" = Supabase storage (user uploads), "/drive" = Google Drive.
Use this when the user asks to save, find, upload, list, or manage files.`,
  input_schema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string" as const,
        enum: ["list", "search", "write", "delete", "move"],
        description: "File operation to perform",
      },
      path: { type: "string" as const, description: "File/directory path" },
      query: { type: "string" as const, description: "Search query (for search action)" },
      content: { type: "string" as const, description: "File content to write (for write action)" },
      filename: { type: "string" as const, description: "Filename (for write action)" },
      from: { type: "string" as const, description: "Source path (for move action)" },
      to: { type: "string" as const, description: "Destination path (for move action)" },
    },
    required: ["action"],
  },
};

export const WINDOW_MANAGER_TOOL = {
  name: "window_manager",
  description: `Control the workspace windows. Actions:
- open: Open a new window. Params: { window_type: "chat"|"scene"|"files"|"browser"|"document"|"settings", title?: string }
- close: Close a window. Params: { window_id: string }
- focus: Bring a window to front. Params: { window_id: string }
- minimize: Minimize a window. Params: { window_id: string }
- maximize: Maximize a window. Params: { window_id: string }
- tile: Tile all open windows evenly. No params.
- list: List all open windows. No params.

Use this when the user asks to open, close, arrange, or manage windows.`,
  input_schema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string" as const,
        enum: ["open", "close", "focus", "minimize", "maximize", "tile", "list"],
        description: "Window operation to perform",
      },
      window_type: {
        type: "string" as const,
        enum: ["chat", "scene", "files", "browser", "document", "settings"],
        description: "Type of window to open (for open action)",
      },
      window_id: { type: "string" as const, description: "Window ID (for close/focus/minimize/maximize)" },
      title: { type: "string" as const, description: "Window title override" },
    },
    required: ["action"],
  },
};

export const BROWSER_TOOL = {
  name: "browser_navigate",
  description: `Control the embedded browser. Actions:
- open: Open a URL in the browser. Params: { url: string }
- search: Search Google. Params: { query: string }
- new_tab: Open a new tab with optional URL. Params: { url?: string }

Use this when the user asks to browse, search the web, or open a website.
This opens an actual browser window in the OS, not just a search result card.`,
  input_schema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string" as const,
        enum: ["open", "search", "new_tab"],
        description: "Browser action",
      },
      url: { type: "string" as const, description: "URL to navigate to" },
      query: { type: "string" as const, description: "Search query (for search action)" },
    },
    required: ["action"],
  },
};

export const OS_TOOLS = [FILE_MANAGER_TOOL, WINDOW_MANAGER_TOOL, BROWSER_TOOL];
