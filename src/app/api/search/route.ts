import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  // Try Brave first
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  if (braveKey) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`,
        { headers: { "X-Subscription-Token": braveKey, Accept: "application/json" } }
      );
      if (res.ok) {
        const data = await res.json();
        const results = (data.web?.results || []).slice(0, 8).map((r: any) => ({
          title: r.title,
          snippet: r.description,
          url: r.url,
          image: r.thumbnail?.src || null,
        }));
        if (results.length > 0) return Response.json({ results, query });
      }
    } catch {}
  }

  // Try Google Custom Search (if configured)
  const googleKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleCx = process.env.GOOGLE_SEARCH_CX;
  if (googleKey && googleCx) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=8`
      );
      if (res.ok) {
        const data = await res.json();
        const results = (data.items || []).slice(0, 8).map((r: any) => ({
          title: r.title,
          snippet: r.snippet,
          url: r.link,
          image: r.pagemap?.cse_thumbnail?.[0]?.src || r.pagemap?.cse_image?.[0]?.src || null,
        }));
        if (results.length > 0) return Response.json({ results, query });
      }
    } catch {}
  }

  // Fallback: SearXNG public instances
  const searxngInstances = [
    "https://search.sapti.me",
    "https://searx.be",
    "https://search.bus-hit.me",
  ];
  for (const instance of searxngInstances) {
    try {
      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general&pageno=1`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const results = (data.results || []).slice(0, 8).map((r: any) => ({
          title: r.title,
          snippet: r.content || "",
          url: r.url,
          image: r.thumbnail || r.img_src || null,
        }));
        if (results.length > 0) return Response.json({ results, query });
      }
    } catch {}
  }

  // Fallback: DuckDuckGo Lite HTML scrape
  try {
    const res = await fetch(
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.ok) {
      const html = await res.text();
      const results: any[] = [];

      // DDG Lite uses a table-based layout
      const linkMatches = html.matchAll(/<a[^>]+rel="nofollow"[^>]+href="([^"]+)"[^>]*class="result-link"[^>]*>([^<]+)<\/a>/g);
      const snippetMatches = html.matchAll(/<td class="result-snippet">([^<]*(?:<[^>]+>[^<]*)*)<\/td>/g);

      const links = [...linkMatches];
      const snippets = [...snippetMatches];

      for (let i = 0; i < Math.min(links.length, 8); i++) {
        const url = links[i][1];
        const title = links[i][2]?.trim();
        const snippet = snippets[i]?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
        if (title && url && !url.includes("duckduckgo.com")) {
          results.push({ title, snippet, url, image: null });
        }
      }

      if (results.length > 0) return Response.json({ results, query });
    }
  } catch {}

  return Response.json({ results: [], query });
}
