// Integration Platform — Core Types

export type AuthType = 'oauth2' | 'api_key' | 'bot_token';
export type IntegrationStatus = 'connected' | 'disconnected' | 'needs_reauth' | 'error';

export interface IntegrationTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute: (params: Record<string, unknown>, token: string) => Promise<unknown>;
  requiresApproval?: boolean; // If true, agent must get user approval before executing
}

export interface Integration {
  id: string;
  name: string;
  icon: string; // lucide icon name or SVG
  description: string;
  category: 'communication' | 'productivity' | 'commerce' | 'storage';
  authType: AuthType;
  authUrl?: string;
  scopes?: string[];
  connect: (credentials: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  disconnect: (userId: string) => Promise<void>;
  getStatus: (userId: string) => Promise<IntegrationStatus>;
  getTools: () => IntegrationTool[];
}

export interface IntegrationToken {
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  scopes?: string[];
  account_email?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: Integration['category'];
  authType: AuthType;
  authUrl: string;
  scopes: string[];
  envKeys: string[]; // Required env vars
}
