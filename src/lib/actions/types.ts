// Generic Action System — Types
// Actions are contextual operations that appear on visualizations.
// Each visualization type can register action providers that inspect
// the data/context and return available actions.

import type { ReactNode } from "react";

export type ActionVariant = "primary" | "secondary" | "danger" | "ghost";

export interface Action {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: ActionVariant;
  /** If true, clicking opens an inline compose/input panel */
  compose?: ComposeConfig;
  /** Direct action — called on click when no compose */
  execute?: () => void | Promise<void>;
  /** Loading state */
  loading?: boolean;
  disabled?: boolean;
  /** Group actions under a separator */
  group?: string;
}

export interface ComposeConfig {
  /** Pre-filled fields */
  fields: ComposeField[];
  /** Submit button label */
  submitLabel: string;
  submitVariant?: ActionVariant;
  /** Called when user submits */
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  /** Optional voice input on a specific field */
  voiceField?: string;
  /** Optional AI draft generation */
  aiDraft?: {
    label: string;
    generate: (currentValues: Record<string, string>) => Promise<Record<string, string>>;
  };
}

export interface ComposeField {
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "hidden";
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  /** Number of rows for textarea */
  rows?: number;
}

/**
 * An ActionProvider inspects a visualization's data + context and returns
 * available actions. Providers are registered per context key.
 */
export interface ActionProvider {
  /** The context key this provider handles (e.g. "email") */
  contextKey: string;
  /** Returns actions given the context data and a token accessor */
  getActions: (
    contextData: Record<string, unknown>,
    helpers: ActionHelpers,
  ) => Action[];
}

export interface ActionHelpers {
  /** Make authenticated Google API call */
  googleFetch: (url: string, init?: RequestInit) => Promise<Response>;
  /** Send message to AI chat */
  sendToAI?: (message: string) => void;
  /** Show toast notification */
  toast?: (message: string, type?: "success" | "error") => void;
}
