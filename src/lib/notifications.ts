// Real-time Notifications System
// Uses Supabase for persistence and realtime subscriptions

export type NotificationType = 'integration' | 'agent_task' | 'calendar' | 'email' | 'reminder' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  description: string;
  read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  description: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

// Client-side notification store with toast support
type NotificationListener = (notification: Notification) => void;

class NotificationStore {
  private listeners = new Set<NotificationListener>();
  private toastListeners = new Set<NotificationListener>();

  onNotification(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onToast(listener: NotificationListener): () => void {
    this.toastListeners.add(listener);
    return () => this.toastListeners.delete(listener);
  }

  emit(notification: Notification): void {
    this.listeners.forEach((l) => l(notification));
    this.toastListeners.forEach((l) => l(notification));
  }
}

export const notificationStore = new NotificationStore();
