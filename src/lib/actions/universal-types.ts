// Universal Action System — Types for all visualization types

export type VisualizationType =
  | "email"
  | "chart"
  | "calendar"
  | "file"
  | "document"
  | "metric"
  | "integration"
  | "message"
  | "table"
  | "search"
  | "image"
  | "timeline"
  | "text";

export interface UniversalAction {
  id: string;
  label: string;
  icon: string;
  primary?: boolean;
  destructive?: boolean;
  execute: (context: ActionContext) => void | Promise<void>;
  hidden?: (context: ActionContext) => boolean;
}

export interface AIAction {
  id: string;
  label: string;
  icon?: string;
  prompt: (context: ActionContext) => string;
  inline?: boolean;
}

export interface VoiceCommand {
  pattern: RegExp;
  description: string;
  handler: (transcript: string, context: ActionContext) => void | Promise<void>;
}

export interface ActionContext {
  visualizationType: VisualizationType;
  elementId: string;
  elementType: string;
  data: any;
  title?: string;
  helpers: ActionContextHelpers;
}

export interface ActionContextHelpers {
  sendToAI: (message: string) => void;
  toast: (message: string, type?: "success" | "error" | "info") => void;
  executeAIAction: (prompt: string, inline?: boolean) => Promise<string>;
  googleFetch: (url: string, init?: RequestInit) => Promise<Response>;
  setOverlayContent: (content: string | null) => void;
  copyToClipboard: (text: string) => void;
}

export interface ActionConfig {
  visualizationType: VisualizationType;
  match: (elementType: string, data: any) => boolean;
  actions: UniversalAction[];
  aiActions: AIAction[];
  voiceCommands: VoiceCommand[];
}
