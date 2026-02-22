"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface MarkdownBlockProps {
  data: { content: string };
}

export default function MarkdownBlock({ data }: MarkdownBlockProps) {
  return (
    <motion.div
      className="rounded-2xl border border-white/[0.06] p-5"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="prose prose-invert max-w-none text-sm text-white/70 prose-headings:text-white prose-a:text-[#00d4aa] prose-strong:text-white/90 prose-code:text-[#00d4aa]/80 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
        <ReactMarkdown>{data?.content ?? ""}</ReactMarkdown>
      </div>
    </motion.div>
  );
}
