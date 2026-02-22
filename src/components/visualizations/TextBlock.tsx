"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface TextBlockProps {
  data: { content: string };
}

export default function TextBlock({ data }: TextBlockProps) {
  return (
    <motion.div
      className="prose prose-invert max-w-none text-sm text-white/70 prose-headings:text-white prose-a:text-[#00d4aa] prose-strong:text-white/90"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ReactMarkdown>{data?.content ?? ""}</ReactMarkdown>
    </motion.div>
  );
}
