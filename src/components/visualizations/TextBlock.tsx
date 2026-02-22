"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface TextBlockProps {
  data: { content: string };
}

export default function TextBlock({ data }: TextBlockProps) {
  return (
    <motion.div
      className="rounded-2xl border border-white/[0.08] p-5"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
    >
      <div className="prose prose-invert max-w-none text-sm text-white/70 prose-headings:text-white prose-a:text-[#00d4aa] prose-strong:text-white/90 leading-relaxed">
        <ReactMarkdown>{data?.content ?? ""}</ReactMarkdown>
      </div>
    </motion.div>
  );
}
