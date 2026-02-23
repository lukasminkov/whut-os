"use client";

import { useRef, useEffect, useState } from "react";

export default function EmailDetailCard({ data }: { data: { id?: string; from?: string; to?: string; subject?: string; date?: string; body?: string } }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(200);

  useEffect(() => {
    if (!iframeRef.current || !data?.body) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // Write the email HTML into the sandboxed iframe
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            color: rgba(255,255,255,0.8);
            background: transparent;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          a { color: #5eead4; }
          img { max-width: 100%; height: auto; }
          table { max-width: 100% !important; }
          pre, code { white-space: pre-wrap; max-width: 100%; overflow-x: auto; }
          * { max-width: 100% !important; box-sizing: border-box; }
        </style>
      </head>
      <body>${data.body}</body>
      </html>
    `);
    doc.close();

    // Auto-resize iframe to content height
    const resize = () => {
      if (doc.body) {
        const h = Math.min(doc.body.scrollHeight + 16, 400);
        setIframeHeight(Math.max(h, 60));
      }
    };
    resize();
    // Resize again after images load
    const imgs = doc.querySelectorAll("img");
    imgs.forEach((img) => img.addEventListener("load", resize));
  }, [data?.body]);

  // If body looks like plain text (no HTML tags), render directly
  const isPlainText = data?.body && !/<[a-z][\s\S]*>/i.test(data.body);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-xs text-white/30">From: <span className="text-white/60">{data?.from || "Unknown"}</span></div>
        <div className="text-xs text-white/30">To: <span className="text-white/60">{data?.to || ""}</span></div>
        <div className="text-xs text-white/30">Date: <span className="text-white/60">{data?.date || ""}</span></div>
      </div>

      {isPlainText ? (
        <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar">
          {data?.body || "No content"}
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          sandbox="allow-same-origin"
          style={{
            width: "100%",
            height: `${iframeHeight}px`,
            border: "none",
            borderRadius: "6px",
            background: "transparent",
          }}
          title="Email content"
        />
      )}
    </div>
  );
}
