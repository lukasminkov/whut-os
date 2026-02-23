"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { TextData } from "@/lib/scene-v4-types";

function TypewriterText({ content }: { content: string }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      if (idx.current < content.length) {
        setDisplayed(content.slice(0, ++idx.current));
      } else {
        clearInterval(interval);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [content]);

  const isTyping = displayed.length < content.length;

  return (
    <div className="prose prose-invert prose-sm max-w-none text-white/70 prose-headings:text-white/90 prose-a:text-[#00d4aa] prose-strong:text-white/80">
      <ReactMarkdown>{displayed}</ReactMarkdown>
      {isTyping && (
        <span
          className="inline-block w-[2px] h-[14px] ml-0.5 align-middle animate-pulse"
          style={{
            backgroundColor: "#00d4aa",
            boxShadow: "0 0 8px rgba(0,212,170,0.6), 0 0 16px rgba(0,212,170,0.3)",
          }}
        />
      )}
      {/* Glow on the last few characters */}
      <style jsx>{`
        .prose p:last-child {
          text-shadow: ${isTyping ? "0 0 8px rgba(0,212,170,0.3)" : "none"};
          transition: text-shadow 0.3s;
        }
      `}</style>
    </div>
  );
}

interface TextPrimitiveProps {
  data: TextData;
}

export default function TextPrimitive({ data }: TextPrimitiveProps) {
  if (data.typewriter) {
    return <TypewriterText content={data.content} />;
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none text-white/70 prose-headings:text-white/90 prose-a:text-[#00d4aa] prose-strong:text-white/80">
      <ReactMarkdown>{data.content}</ReactMarkdown>
    </div>
  );
}
