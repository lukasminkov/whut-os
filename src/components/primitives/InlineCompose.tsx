"use client";

import { useState } from "react";
import type { ComposeConfig } from "@/lib/actions";

interface InlineComposeProps {
  config: ComposeConfig;
  onClose: () => void;
}

export default function InlineCompose({ config, onClose }: InlineComposeProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const field of config.fields) {
      init[field.name] = field.defaultValue || "";
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await config.onSubmit(values);
      onClose();
    } catch (err) {
      console.error("Compose submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50">Compose</span>
        <button
          onClick={onClose}
          className="text-xs text-white/30 hover:text-white/60 cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2">
        {config.fields
          .filter((f) => f.type !== "hidden")
          .map((field) => (
            <div key={field.name}>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm text-white/80 outline-none resize-none mt-0.5"
                  rows={3}
                  placeholder={field.placeholder}
                  value={values[field.name] || ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  autoFocus={field.name === config.voiceField || field.type === "textarea"}
                />
              ) : (
                <input
                  type={field.type}
                  className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm text-white/80 outline-none mt-0.5"
                  placeholder={field.placeholder}
                  value={values[field.name] || ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
      </div>
      <div className="flex justify-end mt-2 gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1 text-xs text-white/40 hover:text-white/60 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-3 py-1 text-xs bg-[#00d4aa]/20 text-[#00d4aa] rounded-md hover:bg-[#00d4aa]/30 cursor-pointer disabled:opacity-50"
        >
          {submitting ? "..." : config.submitLabel || "Send"}
        </button>
      </div>
    </div>
  );
}
