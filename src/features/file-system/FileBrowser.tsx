"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Folder, File, ChevronRight, Upload, Grid, List, Search, ArrowLeft } from "lucide-react";
import { getVFS, createSupabaseBackend, createGDriveBackend } from "./index";
import type { VFSNode } from "./types";

// Initialize VFS once
let vfsInitialized = false;
function ensureVFS() {
  if (vfsInitialized) return;
  const vfs = getVFS();
  vfs.registerBackend(createSupabaseBackend());
  try {
    vfs.registerBackend(createGDriveBackend());
    vfs.mount("/drive", "gdrive");
  } catch {
    // Google Drive not connected
  }
  vfs.mount("/", "supabase");
  vfsInitialized = true;
}

export default function FileBrowser() {
  const [currentPath, setCurrentPath] = useState("/");
  const [nodes, setNodes] = useState<VFSNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async (path: string) => {
    ensureVFS();
    setLoading(true);
    try {
      const vfs = getVFS();
      const items = await vfs.list({ path });
      setNodes(items);
    } catch (err) {
      console.error("Failed to list files:", err);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath, loadFiles]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadFiles(currentPath);
      return;
    }
    ensureVFS();
    setLoading(true);
    try {
      const vfs = getVFS();
      const results = await vfs.search({ query: searchQuery });
      setNodes(results);
    } catch {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPath, loadFiles]);

  const handleUpload = useCallback(
    async (files: FileList) => {
      ensureVFS();
      const vfs = getVFS();
      for (const file of Array.from(files)) {
        try {
          await vfs.write(currentPath, file, file.name);
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }
      loadFiles(currentPath);
    },
    [currentPath, loadFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  const navigate = useCallback((node: VFSNode) => {
    if (node.type === "folder") {
      setCurrentPath(node.path);
    }
  }, []);

  const goUp = useCallback(() => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length ? `/${parts.join("/")}` : "/");
  }, [currentPath]);

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <div
      className="flex flex-col h-full text-white"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <button onClick={goUp} disabled={currentPath === "/"} className="p-1 rounded hover:bg-white/10 disabled:opacity-30">
          <ArrowLeft size={14} />
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs text-white/50 flex-1 min-w-0">
          <button onClick={() => setCurrentPath("/")} className="hover:text-white/80">/</button>
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={10} className="text-white/20" />
              <button
                onClick={() => setCurrentPath(`/${breadcrumbs.slice(0, i + 1).join("/")}`)}
                className="hover:text-white/80 truncate"
              >
                {part}
              </button>
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
          <Search size={12} className="text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search files..."
            className="bg-transparent text-xs text-white/80 outline-none w-24"
          />
        </div>

        {/* View toggle */}
        <button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="p-1 rounded hover:bg-white/10 text-white/40">
          {viewMode === "grid" ? <List size={14} /> : <Grid size={14} />}
        </button>

        {/* Upload */}
        <button onClick={() => fileInputRef.current?.click()} className="p-1 rounded hover:bg-white/10 text-white/40">
          <Upload size={14} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      {/* Drop overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-blue-500/10 border-2 border-dashed border-blue-400/40 rounded-xl flex items-center justify-center">
          <p className="text-blue-300 text-sm font-medium">Drop files to upload</p>
        </div>
      )}

      {/* File listing */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">Loading...</div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/20 text-sm gap-2">
            <Folder size={32} />
            <p>Empty folder</p>
            <p className="text-xs">Drag & drop files here to upload</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => navigate(node)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-white/5 transition-colors group"
              >
                {node.type === "folder" ? (
                  <Folder size={28} className="text-blue-400/70 group-hover:text-blue-400" />
                ) : (
                  <File size={28} className="text-white/30 group-hover:text-white/50" />
                )}
                <span className="text-[10px] text-white/60 text-center truncate w-full">{node.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => navigate(node)}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-left transition-colors"
              >
                {node.type === "folder" ? (
                  <Folder size={14} className="text-blue-400/70 shrink-0" />
                ) : (
                  <File size={14} className="text-white/30 shrink-0" />
                )}
                <span className="text-xs text-white/70 truncate flex-1">{node.name}</span>
                {node.size && (
                  <span className="text-[10px] text-white/20">{formatSize(node.size)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
