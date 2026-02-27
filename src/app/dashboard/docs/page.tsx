"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  FileText,
  Folder,
  Star,
  Search,
  Loader2,
  Trash2,
  Clock,
  ArrowLeft,
} from "lucide-react";
import DocumentEditor from "@/components/DocumentEditor";

interface DocMeta {
  id: string;
  title: string;
  folder: string;
  tags: string[];
  is_favorite: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface DocFull extends DocMeta {
  content: Record<string, unknown>;
  content_text: string;
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState<DocFull | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/documents${params}`);
      const data = await res.json();
      setDocs(data.documents || []);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const openDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/documents?id=${id}`);
      const data = await res.json();
      setActiveDoc(data.document);
    } catch (err) {
      console.error("Failed to open document:", err);
    }
  };

  const createDoc = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      const data = await res.json();
      setActiveDoc(data.document);
      fetchDocs();
    } catch (err) {
      console.error("Failed to create document:", err);
    } finally {
      setCreating(false);
    }
  };

  const saveDoc = useCallback(
    async (json: Record<string, unknown>, text: string) => {
      if (!activeDoc) return;
      setSaving(true);
      try {
        const res = await fetch("/api/documents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: activeDoc.id,
            content: json,
            content_text: text,
          }),
        });
        const data = await res.json();
        if (data.document) {
          setActiveDoc((prev) => (prev ? { ...prev, ...data.document } : null));
        }
      } catch (err) {
        console.error("Failed to save:", err);
      } finally {
        setSaving(false);
      }
    },
    [activeDoc]
  );

  const updateTitle = async (title: string) => {
    if (!activeDoc) return;
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeDoc.id, title }),
    });
    setActiveDoc((prev) => (prev ? { ...prev, title } : null));
    setDocs((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? { ...d, title } : d))
    );
  };

  const deleteDoc = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (activeDoc?.id === id) setActiveDoc(null);
  };

  const toggleFavorite = async (id: string) => {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_favorite: !doc.is_favorite }),
    });
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_favorite: !d.is_favorite } : d))
    );
  };

  // Editor view
  if (activeDoc) {
    return (
      <div className="min-h-screen text-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.04]">
          <button
            onClick={() => {
              setActiveDoc(null);
              fetchDocs();
            }}
            className="p-1.5 text-white/30 hover:text-white/60 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={activeDoc.title}
            onChange={(e) =>
              setActiveDoc((prev) =>
                prev ? { ...prev, title: e.target.value } : null
              )
            }
            onBlur={(e) => updateTitle(e.target.value)}
            className="flex-1 text-sm font-medium bg-transparent border-none outline-none text-white placeholder:text-white/20"
            placeholder="Untitled document"
          />
          <div className="flex items-center gap-2 text-[10px] text-white/20">
            {saving && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {activeDoc.word_count > 0 && (
              <span>{activeDoc.word_count} words</span>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="max-w-3xl mx-auto py-8">
          <DocumentEditor
            content={activeDoc.content}
            onUpdate={saveDoc}
            onAIRequest={(text) => {
              // Could open AI chat with selection context
              console.log("AI request with:", text);
            }}
          />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen px-8 py-10 text-white max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            Documents
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {docs.length} document{docs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={createDoc}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 text-xs bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/20 rounded-lg hover:bg-[#00d4aa]/30 transition-colors disabled:opacity-40"
        >
          {creating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          New Document
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#00d4aa]/30"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 text-white/20 animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <FileText className="h-10 w-10 mb-3" />
          <p className="text-sm">No documents yet</p>
          <button
            onClick={createDoc}
            className="mt-4 text-xs text-[#00d4aa] hover:underline"
          >
            Create your first document
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Favorites */}
          {docs.some((d) => d.is_favorite) && (
            <div className="mb-4">
              <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-2">
                Favorites
              </h3>
              {docs
                .filter((d) => d.is_favorite)
                .map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    onOpen={() => openDoc(doc.id)}
                    onDelete={() => deleteDoc(doc.id)}
                    onToggleFavorite={() => toggleFavorite(doc.id)}
                  />
                ))}
            </div>
          )}

          {/* All docs */}
          <div>
            {docs.some((d) => d.is_favorite) && (
              <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-2">
                All Documents
              </h3>
            )}
            {docs
              .filter((d) => !d.is_favorite)
              .map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onOpen={() => openDoc(doc.id)}
                  onDelete={() => deleteDoc(doc.id)}
                  onToggleFavorite={() => toggleFavorite(doc.id)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocRow({
  doc,
  onOpen,
  onDelete,
  onToggleFavorite,
}: {
  doc: DocMeta;
  onOpen: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-3 rounded-xl border border-white/[0.04] p-4 transition-all hover:bg-white/[0.04] hover:border-white/[0.08] cursor-pointer"
      onClick={onOpen}
    >
      <FileText className="h-4 w-4 text-white/20 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          {doc.title || "Untitled"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/20 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(doc.updated_at)}
          </span>
          {doc.word_count > 0 && (
            <span className="text-[10px] text-white/20">
              {doc.word_count} words
            </span>
          )}
        </div>
      </div>
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onToggleFavorite}
          className={`p-1.5 rounded transition-colors ${
            doc.is_favorite
              ? "text-amber-400"
              : "text-white/20 hover:text-amber-400"
          }`}
        >
          <Star className="h-3 w-3" fill={doc.is_favorite ? "currentColor" : "none"} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-white/20 hover:text-red-400 rounded transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
