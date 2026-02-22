"use client";

import { motion } from "framer-motion";

interface DriveFile {
  name: string;
  type: string;
  modified: string;
  link?: string;
}

interface FileListProps {
  data: { files?: DriveFile[] } | DriveFile[];
  title?: string;
}

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  document: { icon: "📄", color: "from-blue-400/25 to-blue-500/10" },
  spreadsheet: { icon: "📊", color: "from-emerald-400/25 to-emerald-500/10" },
  presentation: { icon: "📽", color: "from-amber-400/25 to-amber-500/10" },
  pdf: { icon: "📕", color: "from-rose-400/25 to-rose-500/10" },
  image: { icon: "🖼", color: "from-violet-400/25 to-violet-500/10" },
  folder: { icon: "📁", color: "from-sky-400/25 to-sky-500/10" },
  video: { icon: "🎬", color: "from-pink-400/25 to-pink-500/10" },
};

function getFileStyle(type: string) {
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(FILE_ICONS)) {
    if (key.includes(k)) return v;
  }
  return { icon: "📄", color: "from-white/10 to-white/5" };
}

export default function FileList({ data, title }: FileListProps) {
  const raw: any[] = Array.isArray(data) ? data : data?.files ?? [];
  // Normalize Google Drive API shape (mimeType → type, modifiedTime → modified, webViewLink → link)
  const files: DriveFile[] = raw.map((f: any) => ({
    name: f.name || "Untitled",
    type: f.type || mimeToType(f.mimeType) || "file",
    modified: f.modified || f.modifiedTime || "",
    link: f.link || f.webViewLink || undefined,
  }));

  return (
    <div
      className="rounded-2xl border border-white/[0.08] p-5"
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
    >
      {title && (
        <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">{title}</div>
      )}
      {files.length === 0 ? (
        <p className="text-sm text-white/30">No files to display</p>
      ) : (
        <div className="space-y-1">
          {files.map((file, i) => {
            const style = getFileStyle(file.type);
            return (
              <motion.a
                key={i}
                href={file.link ?? "#"}
                target={file.link ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                {/* File icon */}
                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-b ${style.color} flex items-center justify-center border border-white/[0.06] shrink-0 text-sm`}
                >
                  {style.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate group-hover:text-white transition-colors">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/25 capitalize">{file.type}</span>
                    <span className="text-white/10">·</span>
                    <span className="text-[10px] text-white/25">{formatModified(file.modified)}</span>
                  </div>
                </div>

                {/* External link indicator */}
                {file.link && (
                  <span className="text-white/0 group-hover:text-white/30 transition-colors text-xs shrink-0">
                    ↗
                  </span>
                )}
              </motion.a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function mimeToType(mime?: string): string {
  if (!mime) return "file";
  if (mime.includes("document") || mime.includes("word")) return "document";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "spreadsheet";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "presentation";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("image")) return "image";
  if (mime.includes("video")) return "video";
  if (mime.includes("folder")) return "folder";
  return "file";
}

function formatModified(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
