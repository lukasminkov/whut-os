// Virtual File System Types

export interface VFSNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  mimeType?: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
  backend: "supabase" | "gdrive" | "local";
  backendId?: string; // original ID in the backend
  thumbnailUrl?: string;
}

export interface VFSListOptions {
  path: string;
  recursive?: boolean;
}

export interface VFSSearchOptions {
  query: string;
  path?: string;
  mimeType?: string;
}

export interface VFSBackend {
  name: string;
  list(options: VFSListOptions): Promise<VFSNode[]>;
  read(path: string): Promise<{ data: Blob; node: VFSNode }>;
  write(path: string, data: Blob | File, name?: string): Promise<VFSNode>;
  delete(path: string): Promise<void>;
  move(from: string, to: string): Promise<VFSNode>;
  search(options: VFSSearchOptions): Promise<VFSNode[]>;
}
