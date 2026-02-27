// Web tool executors (search, read page)

import type { ToolResult } from "../types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://whut.ai";

export async function executeWebTool(
  name: string,
  input: Record<string, unknown>,
): Promise<ToolResult | null> {
  switch (name) {
    case "search_web": {
      const query = input.query as string;
      const searchUrl = `${BASE_URL}/api/search?q=${encodeURIComponent(query)}`;
      try {
        const res = await fetch(searchUrl);
        const data = await res.json();
        if (!data.results?.length) {
          return { result: { results: [], query, error: "No results found." }, status: `No results for "${query}"` };
        }
        const enriched = await Promise.all(data.results.slice(0, 6).map(async (r: Record<string, unknown>) => {
          if (r.image) return r;
          try {
            const imgRes = await fetch(`${BASE_URL}/api/image-proxy?url=${encodeURIComponent(r.url as string)}`, { signal: AbortSignal.timeout(3000) });
            const imgData = await imgRes.json();
            return { ...r, image: imgData.image || null };
          } catch { return r; }
        }));
        return { result: { results: enriched, query }, status: `Searched for "${query}"` };
      } catch {
        return { result: { results: [], query, error: "Search unavailable." }, status: "Search failed" };
      }
    }
    case "read_page": {
      const url = input.url as string;
      const pageUrl = `${BASE_URL}/api/read-page?url=${encodeURIComponent(url)}`;
      try {
        const res = await fetch(pageUrl, { signal: AbortSignal.timeout(10000) });
        return { result: await res.json(), status: `Reading ${new URL(url).hostname}...` };
      } catch {
        return { result: { error: "Could not read page" }, status: "Read failed" };
      }
    }
    default:
      return null;
  }
}
