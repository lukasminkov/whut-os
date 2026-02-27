// Agentic Execution System — Core Types

export type TaskStatus = 'pending' | 'planning' | 'running' | 'waiting_approval' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting_approval';

export interface AgentStep {
  id: string;
  index: number;
  description: string;
  toolName?: string;
  toolParams?: Record<string, unknown>;
  integrationId?: string;
  status: StepStatus;
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  requiresApproval: boolean;
  approvalPreview?: string; // Human-readable preview of what will happen
}

export interface AgentTask {
  id: string;
  userId: string;
  intent: string; // Original user request
  status: TaskStatus;
  steps: AgentStep[];
  currentStepIndex: number;
  context: Record<string, unknown>; // Accumulated context from step results
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  conversationId?: string;
}

export interface ApprovalRequest {
  taskId: string;
  stepId: string;
  stepIndex: number;
  description: string;
  preview: string;
  toolName: string;
  toolParams: Record<string, unknown>;
}

export interface AgentConfig {
  /** Actions that always require approval */
  alwaysApprove: string[];
  /** Actions that never require approval */
  neverApprove: string[];
  /** Max steps per task */
  maxSteps: number;
  /** Max concurrent tasks */
  maxConcurrentTasks: number;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  alwaysApprove: [
    'send_email',
    'slack_send_message',
    'telegram_send_message',
    'telegram_send_document',
    'create_calendar_event',
    'update_calendar_event',
    'delete_calendar_event',
    'notion_create_page',
    'notion_update_page',
    'notion_append_blocks',
    'create_drive_document',
    'archive_email',
  ],
  neverApprove: [
    'fetch_emails',
    'get_email',
    'fetch_calendar',
    'fetch_drive_files',
    'slack_list_channels',
    'slack_list_users',
    'slack_read_messages',
    'slack_search_messages',
    'notion_search',
    'notion_get_page',
    'notion_query_database',
    'telegram_get_updates',
    'telegram_get_chat',
    'search_web',
    'read_page',
  ],
  maxSteps: 20,
  maxConcurrentTasks: 5,
};
