// AI module shared types

export interface GoogleTokens {
  access: string;
  refresh: string;
}

export interface ToolResult {
  result: Record<string, unknown>;
  status?: string;
}

export interface AIRequestContext {
  userProfile?: Record<string, unknown>;
  timezone?: string;
  time?: string;
  integrations?: string[];
  [key: string]: unknown;
}

export interface StreamEvent {
  type: "text_delta" | "scene" | "done" | "error" | "status" | "card" | "os_command";
  text?: string;
  scene?: Record<string, unknown>;
  error?: string;
  card?: Record<string, unknown>;
  command?: Record<string, unknown>;
}

export interface UsageStats {
  requests: number;
  totalTokens: number;
  costCents: number;
}

export interface MemoryEntry {
  fact?: string;
  content?: string;
}
