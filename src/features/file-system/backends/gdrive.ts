import type { VFSBackend, VFSNode, VFSListOptions, VFSSearchOptions } from "../types";

function getTokens(): { access_token: string; refresh_token?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("whut_google_tokens");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function gdriveApi(path: string, options?: RequestInit): Promise<Response> {
  const tokens = getTokens();
  if (!tokens) throw new Error("Google Drive not connected");

  const res = await fetch(`/api/google/drive${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      "x-google-tokens": JSON.stringify(tokens),
    },
  });
  if (!res.ok) throw new Error(`Google Drive API error: ${res.status}`);
  return res;
}

function driveFileToVFS(file: {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  parents?: string[];
}, parentPath: string): VFSNode {
  const isFolder = file.mimeType === "application/vnd.google-apps.folder";
  const path = parentPath === "/" ? `/${file.name}` : `${parentPath}/${file.name}`;
  return {
    id: file.id,
    name: file.name,
    path,
    type: isFolder ? "folder" : "file",
    mimeType: file.mimeType,
    size: file.size ? Number(file.size) : undefined,
    createdAt: file.createdTime,
    updatedAt: file.modifiedTime,
    backend: "gdrive",
    backendId: file.id,
    thumbnailUrl: file.thumbnailLink,
  };
}

export function createGDriveBackend(): VFSBackend {
  return {
    name: "gdrive",

    async list({ path }: VFSListOptions): Promise<VFSNode[]> {
      const res = await gdriveApi("?action=list");
      const data = await res.json();
      const files = data.files ?? [];
      return files.map((f: Parameters<typeof driveFileToVFS>[0]) => driveFileToVFS(f, path));
    },

    async read(path: string): Promise<{ data: Blob; node: VFSNode }> {
      // For Google Drive, we need the file ID. Extract from the path or use as-is
      const res = await gdriveApi(`?action=download&fileId=${encodeURIComponent(path)}`);
      const blob = await res.blob();
      return {
        data: blob,
        node: {
          id: path,
          name: path.split("/").pop() ?? path,
          path,
          type: "file",
          backend: "gdrive",
          size: blob.size,
        },
      };
    },

    async write(_path: string, _data: Blob | File): Promise<VFSNode> {
      // Google Drive upload not yet implemented in API
      throw new Error("Google Drive write not yet implemented");
    },

    async delete(_path: string): Promise<void> {
      throw new Error("Google Drive delete not yet implemented");
    },

    async move(_from: string, _to: string): Promise<VFSNode> {
      throw new Error("Google Drive move not yet implemented");
    },

    async search({ query }: VFSSearchOptions): Promise<VFSNode[]> {
      const res = await gdriveApi(`?action=search&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const files = data.files ?? [];
      return files.map((f: Parameters<typeof driveFileToVFS>[0]) => driveFileToVFS(f, "/drive"));
    },
  };
}
