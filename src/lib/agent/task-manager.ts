// Task Manager — Manages agent task lifecycle, queue, and execution

import type { AgentTask, AgentStep, TaskStatus, AgentConfig } from './types';
import { DEFAULT_AGENT_CONFIG } from './types';

type TaskListener = (task: AgentTask) => void;

class TaskManager {
  private tasks = new Map<string, AgentTask>();
  private listeners = new Map<string, Set<TaskListener>>();
  private globalListeners = new Set<TaskListener>();
  private config: AgentConfig = DEFAULT_AGENT_CONFIG;

  createTask(userId: string, intent: string, conversationId?: string): AgentTask {
    const task: AgentTask = {
      id: crypto.randomUUID(),
      userId,
      intent,
      status: 'planning',
      steps: [],
      currentStepIndex: 0,
      context: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conversationId,
    };
    this.tasks.set(task.id, task);
    this.emit(task);
    return task;
  }

  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  getUserTasks(userId: string): AgentTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getActiveTasks(userId: string): AgentTask[] {
    return this.getUserTasks(userId).filter(
      (t) => !['completed', 'failed', 'cancelled'].includes(t.status)
    );
  }

  setSteps(taskId: string, steps: Omit<AgentStep, 'id' | 'index' | 'status' | 'requiresApproval'>[]): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.steps = steps.map((s, i) => ({
      ...s,
      id: crypto.randomUUID(),
      index: i,
      status: 'pending',
      requiresApproval: this.needsApproval(s.toolName || ''),
    }));
    task.status = 'running';
    task.currentStepIndex = 0;
    task.updatedAt = new Date().toISOString();
    this.emit(task);
  }

  updateStep(taskId: string, stepIndex: number, update: Partial<AgentStep>): void {
    const task = this.tasks.get(taskId);
    if (!task || !task.steps[stepIndex]) return;

    Object.assign(task.steps[stepIndex], update);
    task.updatedAt = new Date().toISOString();
    this.emit(task);
  }

  advanceStep(taskId: string): AgentStep | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.currentStepIndex++;
    if (task.currentStepIndex >= task.steps.length) {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      this.emit(task);
      return null;
    }

    task.updatedAt = new Date().toISOString();
    this.emit(task);
    return task.steps[task.currentStepIndex];
  }

  requestApproval(taskId: string, stepIndex: number, preview: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'waiting_approval';
    task.steps[stepIndex].status = 'waiting_approval';
    task.steps[stepIndex].approvalPreview = preview;
    task.updatedAt = new Date().toISOString();
    this.emit(task);
  }

  approveStep(taskId: string, stepIndex: number): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'running';
    task.steps[stepIndex].status = 'running';
    task.updatedAt = new Date().toISOString();
    this.emit(task);
  }

  rejectStep(taskId: string, stepIndex: number): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.steps[stepIndex].status = 'skipped';
    task.updatedAt = new Date().toISOString();
    // Try to advance to next step
    this.advanceStep(taskId);
  }

  pauseTask(taskId: string): void {
    this.updateTaskStatus(taskId, 'paused');
  }

  resumeTask(taskId: string): void {
    this.updateTaskStatus(taskId, 'running');
  }

  cancelTask(taskId: string): void {
    this.updateTaskStatus(taskId, 'cancelled');
  }

  failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'failed';
    task.error = error;
    task.updatedAt = new Date().toISOString();
    this.emit(task);
  }

  // Listeners
  subscribe(taskId: string, listener: TaskListener): () => void {
    if (!this.listeners.has(taskId)) this.listeners.set(taskId, new Set());
    this.listeners.get(taskId)!.add(listener);
    return () => this.listeners.get(taskId)?.delete(listener);
  }

  subscribeAll(listener: TaskListener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  setConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  private needsApproval(toolName: string): boolean {
    if (this.config.neverApprove.includes(toolName)) return false;
    if (this.config.alwaysApprove.includes(toolName)) return true;
    // Default: external actions need approval
    return true;
  }

  private updateTaskStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = status;
    task.updatedAt = new Date().toISOString();
    this.emit(task);
  }

  private emit(task: AgentTask): void {
    this.listeners.get(task.id)?.forEach((l) => l(task));
    this.globalListeners.forEach((l) => l(task));
  }
}

// Singleton
export const taskManager = new TaskManager();
