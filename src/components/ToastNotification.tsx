"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Zap, Calendar, Mail, Clock, AlertCircle } from "lucide-react";
import type { Notification, NotificationType } from "@/lib/notifications";
import { notificationStore } from "@/lib/notifications";

const ICON_MAP: Record<NotificationType, typeof Bell> = {
  integration: Zap,
  agent_task: Zap,
  calendar: Calendar,
  email: Mail,
  reminder: Clock,
  system: AlertCircle,
};

const COLOR_MAP: Record<NotificationType, string> = {
  integration: "text-[#00d4aa]",
  agent_task: "text-[#00d4aa]",
  calendar: "text-blue-400",
  email: "text-white/60",
  reminder: "text-amber-400",
  system: "text-white/50",
};

interface Toast extends Notification {
  dismissAt: number;
}

export default function ToastNotification() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsub = notificationStore.onToast((notification) => {
      const toast: Toast = {
        ...notification,
        dismissAt: Date.now() + 5000,
      };
      setToasts((prev) => [toast, ...prev].slice(0, 5));

      // Auto-dismiss
      setTimeout(() => dismiss(notification.id), 5000);
    });
    return unsub;
  }, [dismiss]);

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICON_MAP[toast.type] || Bell;
          const color = COLOR_MAP[toast.type] || "text-white/50";

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="pointer-events-auto max-w-sm bg-black/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {toast.title}
                  </p>
                  {toast.description && (
                    <p className="text-xs text-white/40 mt-0.5">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="text-white/20 hover:text-white/50 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
