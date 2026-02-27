// Virtual File System — unified access across backends
import type { VFSBackend, VFSNode, VFSListOptions, VFSSearchOptions } from "./types";

export class VirtualFileSystem {
  private backends = new Map<string, VFSBackend>();
  private mounts = new Map<string, string>(); // mount path -> backend name

  registerBackend(backend: VFSBackend): void {
    this.backends.set(backend.name, backend);
  }

  mount(path: string, backendName: string): void {
    if (!this.backends.has(backendName)) {
      throw new Error(`Backend "${backendName}" not registered`);
    }
    this.mounts.set(path, backendName);
  }

  private resolve(path: string): { backend: VFSBackend; relativePath: string } {
    // Find the longest matching mount
    let bestMount = "";
    let bestBackendName = "";
    for (const [mountPath, backendName] of this.mounts) {
      if (path.startsWith(mountPath) && mountPath.length > bestMount.length) {
        bestMount = mountPath;
        bestBackendName = backendName;
      }
    }
    if (!bestBackendName) {
      // Default to first backend
      const first = this.backends.values().next().value;
      if (!first) throw new Error("No backends registered");
      return { backend: first, relativePath: path };
    }
    const backend = this.backends.get(bestBackendName)!;
    const relativePath = path.slice(bestMount.length) || "/";
    return { backend, relativePath };
  }

  async list(options: VFSListOptions): Promise<VFSNode[]> {
    const { backend, relativePath } = this.resolve(options.path);
    return backend.list({ ...options, path: relativePath });
  }

  async read(path: string): Promise<{ data: Blob; node: VFSNode }> {
    const { backend, relativePath } = this.resolve(path);
    return backend.read(relativePath);
  }

  async write(path: string, data: Blob | File, name?: string): Promise<VFSNode> {
    const { backend, relativePath } = this.resolve(path);
    return backend.write(relativePath, data, name);
  }

  async delete(path: string): Promise<void> {
    const { backend, relativePath } = this.resolve(path);
    return backend.delete(relativePath);
  }

  async move(from: string, to: string): Promise<VFSNode> {
    const fromRes = this.resolve(from);
    const toRes = this.resolve(to);
    if (fromRes.backend !== toRes.backend) {
      // Cross-backend move: read from source, write to dest, delete source
      const { data } = await fromRes.backend.read(fromRes.relativePath);
      const node = await toRes.backend.write(toRes.relativePath, data);
      await fromRes.backend.delete(fromRes.relativePath);
      return node;
    }
    return fromRes.backend.move(fromRes.relativePath, toRes.relativePath);
  }

  async search(options: VFSSearchOptions): Promise<VFSNode[]> {
    if (options.path) {
      const { backend } = this.resolve(options.path);
      return backend.search(options);
    }
    // Search across all backends
    const results: VFSNode[] = [];
    for (const backend of this.backends.values()) {
      try {
        const r = await backend.search(options);
        results.push(...r);
      } catch {
        // Skip failed backends
      }
    }
    return results;
  }

  getMounts(): Array<{ path: string; backend: string }> {
    return Array.from(this.mounts.entries()).map(([path, backend]) => ({ path, backend }));
  }
}

// Singleton
let instance: VirtualFileSystem | null = null;
export function getVFS(): VirtualFileSystem {
  if (!instance) {
    instance = new VirtualFileSystem();
  }
  return instance;
}
