"use client";

import { useState, useRef, useCallback } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, X, Send, Loader2 } from "lucide-react";

interface FeedbackWidgetProps {
  /** The element/card container to screenshot */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Visualization type (e.g. "chart-line", "list", "detail") */
  visualizationType?: string;
  /** The user's original query that produced this viz */
  userQuery?: string;
  /** Brief summary of the AI response */
  aiResponseSummary?: string;
}

export default function FeedbackWidget({
  containerRef,
  visualizationType,
  userQuery,
  aiResponseSummary,
}: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    if (!containerRef?.current) return null;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#0a0c12",
        scale: 1,
        logging: false,
        useCORS: true,
      });
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }, [containerRef]);

  const handleSubmit = async () => {
    if (!text && !rating) return;
    setSubmitting(true);

    try {
      const screenshot = await captureScreenshot();

      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_query: userQuery,
          ai_response_summary: aiResponseSummary,
          visualization_type: visualizationType,
          screenshot_base64: screenshot,
          feedback_text: text,
          rating,
        }),
      });

      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setRating(null);
        setText("");
      }, 1500);
    } catch {
      // silent fail
    } finally {
      setSubmitting(false);
    }
  };

  // Quick rating without opening modal
  const handleQuickRating = async (r: "up" | "down") => {
    if (open) {
      setRating(prev => prev === r ? null : r);
      return;
    }
    // Submit just the rating
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_query: userQuery,
          ai_response_summary: aiResponseSummary,
          visualization_type: visualizationType,
          rating: r,
        }),
      });
    } catch {}
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#00d4aa]">
        <span>✓ Thanks!</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setOpen(!open)}
          className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
          title="Give feedback"
        >
          <MessageSquare size={13} />
        </button>
        <button
          onClick={() => handleQuickRating("up")}
          className={`p-1 rounded hover:bg-white/5 transition-colors ${
            rating === "up" ? "text-[#00d4aa]" : "text-white/30 hover:text-white/60"
          }`}
          title="Looks good"
        >
          <ThumbsUp size={12} />
        </button>
        <button
          onClick={() => handleQuickRating("down")}
          className={`p-1 rounded hover:bg-white/5 transition-colors ${
            rating === "down" ? "text-red-400" : "text-white/30 hover:text-white/60"
          }`}
          title="Needs improvement"
        >
          <ThumbsDown size={12} />
        </button>
      </div>

      {/* Feedback modal */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-72 z-50 rounded-lg border border-white/10 bg-[#0a0c12]/95 backdrop-blur-xl shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/70">Feedback</span>
            <button onClick={() => setOpen(false)} className="p-0.5 text-white/30 hover:text-white/60">
              <X size={12} />
            </button>
          </div>

          {/* Rating */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setRating(prev => prev === "up" ? null : "up")}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                rating === "up"
                  ? "bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/30"
                  : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10"
              }`}
            >
              👍 Good
            </button>
            <button
              onClick={() => setRating(prev => prev === "down" ? null : "down")}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                rating === "down"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10"
              }`}
            >
              👎 Improve
            </button>
          </div>

          {/* Text input */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What could be better? (optional)"
            className="w-full h-16 bg-white/5 border border-white/10 rounded text-xs text-white/80 placeholder-white/30 p-2 resize-none focus:outline-none focus:border-[#00d4aa]/30"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || (!text && !rating)}
            className="mt-2 w-full py-1.5 rounded text-xs font-medium bg-[#00d4aa]/20 text-[#00d4aa] hover:bg-[#00d4aa]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Send Feedback
          </button>
        </div>
      )}
    </div>
  );
}
