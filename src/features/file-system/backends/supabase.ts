import { createClient } from "@/lib/supabase";
import type { VFSBackend, VFSNode, VFSListOptions, VFSSearchOptions } from "../types";

const BUCKET = "user-files";

function toVFSNode(obj: { name: string; id?: string; metadata?: Record<string, string>; created_at?: string; updated_at?: string }, parentPath: string, isFolder: boolean): VFSNode {
  const path = parentPath === "/" ? `/${obj.name}` : `${parentPath}/${obj.name}`;
  return {
    id: obj.id ?? path,
    name: obj.name,
    path,
    type: isFolder ? "folder" : "file",
    mimeType: obj.metadata?.mimetype,
    size: obj.metadata?.size ? Number(obj.metadata.size) : undefined,
    createdAt: obj.created_at,
    updatedAt: obj.updated_at,
    backend: "supabase",
    backendId: obj.id,
  };
}

function storagePath(vfsPath: string): string {
  // Strip leading slash for Supabase storage
  return vfsPath.startsWith("/") ? vfsPath.slice(1) : vfsPath;
}

export function createSupabaseBackend(): VFSBackend {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase not configured");

  return {
    name: "supabase",

    async list({ path }: VFSListOptions): Promise<VFSNode[]> {
      const sp = storagePath(path) || "";
      const { data, error } = await supabase.storage.from(BUCKET).list(sp, {
        limit: 200,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`Supabase list error: ${error.message}`);
      if (!data) return [];

      return data
        .filter((item) => item.name !== ".emptyFolderPlaceholder")
        .map((item) => {
          const isFolder = !item.metadata || Object.keys(item.metadata).length === 0;
          return toVFSNode(item, path, isFolder);
        });
    },

    async read(path: string): Promise<{ data: Blob; node: VFSNode }> {
      const sp = storagePath(path);
      const { data, error } = await supabase.storage.from(BUCKET).download(sp);
      if (error || !data) throw new Error(`Supabase read error: ${error?.message ?? "no data"}`);
      const node: VFSNode = {
        id: sp,
        name: sp.split("/").pop() ?? sp,
        path,
        type: "file",
        backend: "supabase",
        size: data.size,
      };
      return { data, node };
    },

    async write(path: string, file: Blob | File, name?: string): Promise<VFSNode> {
      const sp = storagePath(path);
      const finalPath = name ? (sp ? `${sp}/${name}` : name) : sp;
      const { error } = await supabase.storage.from(BUCKET).upload(finalPath, file, { upsert: true });
      if (error) throw new Error(`Supabase write error: ${error.message}`);
      return {
        id: finalPath,
        name: finalPath.split("/").pop() ?? finalPath,
        path: `/${finalPath}`,
        type: "file",
        backend: "supabase",
        size: file.size,
      };
    },

    async delete(path: string): Promise<void> {
      const sp = storagePath(path);
      const { error } = await supabase.storage.from(BUCKET).remove([sp]);
      if (error) throw new Error(`Supabase delete error: ${error.message}`);
    },

    async move(from: string, to: string): Promise<VFSNode> {
      const sfrom = storagePath(from);
      const sto = storagePath(to);
      const { error } = await supabase.storage.from(BUCKET).move(sfrom, sto);
      if (error) throw new Error(`Supabase move error: ${error.message}`);
      return {
        id: sto,
        name: sto.split("/").pop() ?? sto,
        path: `/${sto}`,
        type: "file",
        backend: "supabase",
      };
    },

    async search({ query }: VFSSearchOptions): Promise<VFSNode[]> {
      // Supabase storage doesn't have search — list root recursively and filter
      const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 500 });
      if (error || !data) return [];
      const q = query.toLowerCase();
      return data
        .filter((f) => f.name.toLowerCase().includes(q))
        .map((f) => toVFSNode(f, "/", false));
    },
  };
}
