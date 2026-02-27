"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  Pause,
  Play,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import type { AgentTask, AgentStep } from "@/lib/agent/types";
import { taskManager } from "@/lib/agent/task-manager";

function StepIcon({ status }: { status: AgentStep["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-[#00d4aa]" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-[#00d4aa] animate-spin" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    case "waiting_approval":
      return <ShieldCheck className="h-4 w-4 text-amber-400 animate-pulse" />;
    case "skipped":
      return <X className="h-4 w-4 text-white/20" />;
    default:
      return <Circle className="h-4 w-4 text-white/20" />;
  }
}

function StepRow({
  step,
  taskId,
  isActive,
}: {
  step: AgentStep;
  taskId: string;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 py-2 px-3 rounded-lg transition-all ${
        isActive ? "bg-white/[0.04]" : ""
      }`}
    >
      <StepIcon status={step.status} />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            step.status === "completed"
              ? "text-white/50"
              : isActive
                ? "text-white"
                : "text-white/40"
          }`}
        >
          {step.description}
        </p>
        {step.status === "waiting_approval" && step.approvalPreview && (
          <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-200/80 mb-2">
              {step.approvalPreview}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => taskManager.approveStep(taskId, step.index)}
                className="px-3 py-1 text-xs bg-[#00d4aa]/20 text-[#00d4aa] rounded-lg hover:bg-[#00d4aa]/30 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => taskManager.rejectStep(taskId, step.index)}
                className="px-3 py-1 text-xs bg-white/5 text-white/50 rounded-lg hover:bg-white/10 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}
        {step.error && (
          <p className="text-xs text-red-400 mt-1">{step.error}</p>
        )}
      </div>
      {step.toolName && (
        <span className="text-[10px] text-white/20 font-mono shrink-0">
          {step.toolName}
        </span>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: AgentTask }) {
  const [expanded, setExpanded] = useState(
    !["completed", "failed", "cancelled"].includes(task.status)
  );

  const statusColor = {
    planning: "text-blue-400",
    running: "text-[#00d4aa]",
    waiting_approval: "text-amber-400",
    paused: "text-white/40",
    completed: "text-[#00d4aa]/60",
    failed: "text-red-400",
    cancelled: "text-white/20",
    pending: "text-white/30",
  }[task.status];

  const progress =
    task.steps.length > 0
      ? Math.round(
          (task.steps.filter((s) => s.status === "completed").length /
            task.steps.length) *
            100
        )
      : 0;

  return (
    <div className="border border-white/[0.06] rounded-xl bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Zap className={`h-4 w-4 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{task.intent}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] capitalize ${statusColor}`}>
              {task.status.replace("_", " ")}
            </span>
            {task.steps.length > 0 && (
              <span className="text-[10px] text-white/20">
                {task.steps.filter((s) => s.status === "completed").length}/
                {task.steps.length} steps
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {task.steps.length > 0 && (
          <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00d4aa] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-1">
          {task.status === "running" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                taskManager.pauseTask(task.id);
              }}
              className="p-1 hover:bg-white/5 rounded"
            >
              <Pause className="h-3 w-3 text-white/30" />
            </button>
          )}
          {task.status === "paused" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                taskManager.resumeTask(task.id);
              }}
              className="p-1 hover:bg-white/5 rounded"
            >
              <Play className="h-3 w-3 text-white/30" />
            </button>
          )}
          {!["completed", "failed", "cancelled"].includes(task.status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                taskManager.cancelTask(task.id);
              }}
              className="p-1 hover:bg-white/5 rounded"
            >
              <X className="h-3 w-3 text-white/30" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="h-3 w-3 text-white/20" />
          ) : (
            <ChevronDown className="h-3 w-3 text-white/20" />
          )}
        </div>
      </div>

      {/* Steps */}
      {expanded && task.steps.length > 0 && (
        <div className="border-t border-white/[0.04] p-2 space-y-0.5">
          {task.steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              taskId={task.id}
              isActive={step.index === task.currentStepIndex}
            />
          ))}
        </div>
      )}

      {task.error && (
        <div className="border-t border-red-500/10 p-3">
          <p className="text-xs text-red-400">{task.error}</p>
        </div>
      )}
    </div>
  );
}

export default function TaskTracker({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);

  useEffect(() => {
    setTasks(taskManager.getUserTasks(userId));
    const unsub = taskManager.subscribeAll((task) => {
      if (task.userId === userId) {
        setTasks(taskManager.getUserTasks(userId));
      }
    });
    return unsub;
  }, [userId]);

  if (tasks.length === 0) return null;

  const activeTasks = tasks.filter(
    (t) => !["completed", "failed", "cancelled"].includes(t.status)
  );
  const pastTasks = tasks.filter((t) =>
    ["completed", "failed", "cancelled"].includes(t.status)
  );

  return (
    <div className="space-y-3">
      {activeTasks.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-2 px-1">
            Active Tasks
          </h3>
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
      {pastTasks.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-2 px-1">
            Recent Tasks
          </h3>
          <div className="space-y-2">
            {pastTasks.slice(0, 5).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
