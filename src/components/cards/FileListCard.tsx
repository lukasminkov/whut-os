"use client";
import { motion } from "framer-motion";

interface DriveFile {
  name: string;
  type?: string;
  modified?: string;
  link?: string;
}

const ICONS: Record<string, string> = {
  document: "📄", spreadsheet: "📊", presentation: "📑", folder: "📁",
  pdf: "📕", image: "🖼️", video: "🎬", default: "📄",
};

function fileIcon(type?: string) {
  if (!type) return ICONS.default;
  const t = type.toLowerCase();
  if (t.includes("spreadsheet") || t.includes("excel")) return ICONS.spreadsheet;
  if (t.includes("presentation") || t.includes("slide")) return ICONS.presentation;
  if (t.includes("folder")) return ICONS.folder;
  if (t.includes("pdf")) return ICONS.pdf;
  if (t.includes("image") || t.includes("photo")) return ICONS.image;
  if (t.includes("video")) return ICONS.video;
  return ICONS.document;
}

export default function FileListCard({ data }: { data: { files: DriveFile[] } }) {
  const files = data?.files || [];
  return (
    <div className="space-y-0.5 max-h-[350px] overflow-y-auto custom-scrollbar">
      {files.length === 0 && <p className="text-xs text-white/30 text-center py-4">No files found</p>}
      {files.map((f, i) => (
        <motion.a
          key={i}
          href={f.link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <span className="text-lg">{fileIcon(f.type)}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white/70 truncate">{f.name}</div>
            {f.modified && <div className="text-[10px] text-white/25">{f.modified}</div>}
          </div>
        </motion.a>
      ))}
    </div>
  );
}
