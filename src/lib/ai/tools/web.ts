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
    case "enrich_entity": {
      const name = input.name as string;
      const type = (input.type as string) || "place";
      const location = input.location as string | undefined;
      const query = location ? `${name} ${location} ${type}` : `${name} ${type}`;

      try {
        // Search for entity info
        const searchUrl = `${BASE_URL}/api/search?q=${encodeURIComponent(query)}`;
        const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
        const searchData = await searchRes.json();

        // Search for images
        const imgUrl = `${BASE_URL}/api/images/search?q=${encodeURIComponent(name + (location ? " " + location : ""))}&count=5`;
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(8000) });
        const imgData = await imgRes.json();

        const results = searchData.results || [];
        const snippets = results.slice(0, 5).map((r: Record<string, unknown>) => r.snippet).join(" ");
        const images = (imgData.images || []).map((i: Record<string, unknown>) => i.url);
        const sourceUrl = results[0]?.url as string | undefined;

        // Extract rating pattern from snippets (e.g., "4.7/5", "4.7 stars", "rated 4.7")
        const ratingMatch = snippets.match(/(\d\.\d)\s*(?:\/\s*5|stars?|out of 5)/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

        // Extract review count
        const reviewMatch = snippets.match(/([\d,]+)\s*reviews?/i);
        const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(",", "")) : undefined;

        // Extract price pattern
        const priceMatch = snippets.match(/(\${1,4})(?:\s|$|,)/);
        const price = priceMatch ? priceMatch[1] : undefined;

        return {
          result: {
            name,
            type,
            location: location || null,
            images,
            heroImage: images[0] || null,
            rating: rating || null,
            reviewCount: reviewCount || null,
            price: price || null,
            description: results[0]?.snippet || null,
            snippets: results.slice(0, 3).map((r: Record<string, unknown>) => r.snippet),
            website: sourceUrl || null,
            sources: results.slice(0, 3).map((r: Record<string, unknown>) => ({ title: r.title, url: r.url })),
          },
          status: `Enriched "${name}"`,
        };
      } catch {
        return { result: { name, error: "Could not enrich entity" }, status: `Failed to enrich "${name}"` };
      }
    }
    default:
      return null;
  }
}
