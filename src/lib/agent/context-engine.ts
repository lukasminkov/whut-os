// Context Engine — Maintains workspace awareness across sessions
// NOTE: Real-time screen state is tracked by screenContextStore (src/lib/screen-context/).
// This engine handles persistent/session-level context (actions, preferences, integrations).
// The two systems complement each other: this = session history, screenContext = live UI state.

export interface WorkspaceContext {
  activeView: string; // Current page/route
  recentActions: ContextAction[];
  openDocuments: string[];
  userPreferences: Record<string, unknown>;
  sessionStartedAt: string;
  lastInteractionAt: string;
  connectedIntegrations: string[];
}

export interface ContextAction {
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const MAX_RECENT_ACTIONS = 50;
const STORAGE_KEY = 'whut_workspace_context';

class ContextEngine {
  private context: WorkspaceContext;

  constructor() {
    this.context = this.load();
  }

  getContext(): WorkspaceContext {
    return { ...this.context };
  }

  /** Get a summary string for AI system prompt injection */
  getSummaryForAI(): string {
    const c = this.context;
    const parts: string[] = [];
    if (c.activeView) parts.push(`User is on: ${c.activeView}`);
    if (c.connectedIntegrations.length) {
      parts.push(`Connected integrations: ${c.connectedIntegrations.join(', ')}`);
    }
    if (c.openDocuments.length) {
      parts.push(`Open documents: ${c.openDocuments.join(', ')}`);
    }
    const recent = c.recentActions.slice(0, 5);
    if (recent.length) {
      parts.push(`Recent actions: ${recent.map((a) => a.description).join('; ')}`);
    }
    return parts.join('\n');
  }

  setActiveView(view: string): void {
    this.context.activeView = view;
    this.context.lastInteractionAt = new Date().toISOString();
    this.save();
  }

  addAction(type: string, description: string, metadata?: Record<string, unknown>): void {
    this.context.recentActions.unshift({
      type,
      description,
      timestamp: new Date().toISOString(),
      metadata,
    });
    if (this.context.recentActions.length > MAX_RECENT_ACTIONS) {
      this.context.recentActions = this.context.recentActions.slice(0, MAX_RECENT_ACTIONS);
    }
    this.context.lastInteractionAt = new Date().toISOString();
    this.save();
  }

  openDocument(docId: string): void {
    if (!this.context.openDocuments.includes(docId)) {
      this.context.openDocuments.push(docId);
      this.save();
    }
  }

  closeDocument(docId: string): void {
    this.context.openDocuments = this.context.openDocuments.filter((d) => d !== docId);
    this.save();
  }

  setPreference(key: string, value: unknown): void {
    this.context.userPreferences[key] = value;
    this.save();
  }

  getPreference<T = unknown>(key: string): T | undefined {
    return this.context.userPreferences[key] as T | undefined;
  }

  setConnectedIntegrations(ids: string[]): void {
    this.context.connectedIntegrations = ids;
    this.save();
  }

  private load(): WorkspaceContext {
    if (typeof window === 'undefined') {
      return this.defaultContext();
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.defaultContext(), ...parsed };
      }
    } catch {}
    return this.defaultContext();
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.context));
    } catch {}
  }

  private defaultContext(): WorkspaceContext {
    return {
      activeView: 'dashboard',
      recentActions: [],
      openDocuments: [],
      userPreferences: {},
      sessionStartedAt: new Date().toISOString(),
      lastInteractionAt: new Date().toISOString(),
      connectedIntegrations: [],
    };
  }
}

export const contextEngine = new ContextEngine();
