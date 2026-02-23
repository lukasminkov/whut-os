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

  // Fallback: Wikipedia API for encyclopedic results
  let wikiResults: any[] = [];
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (wikiRes.ok) {
      const [, titles, snippets, urls] = await wikiRes.json();
      if (titles?.length > 0) {
        wikiResults = titles.map((t: string, i: number) => ({
          title: t,
          snippet: snippets[i] || "",
          url: urls[i],
          image: null,
        }));
      }
    }
  } catch {}

  // Fallback: DuckDuckGo HTML scrape
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) {
      const html = await res.text();
      const results: any[] = [];
      const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.+?)<\/a>/g;
      const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>(.+?)<\/a>/g;
      const links = [...html.matchAll(linkRegex)];
      const snippets = [...html.matchAll(snippetRegex)];
      for (let i = 0; i < Math.min(links.length, 8); i++) {
        const rawUrl = links[i][1];
        const title = links[i][2]?.replace(/<[^>]+>/g, "").trim();
        const snippet = snippets[i]?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
        const urlMatch = rawUrl.match(/uddg=([^&]+)/);
        const url = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;
        if (title && url && !url.includes("duckduckgo.com")) {
          results.push({ title, snippet, url, image: null });
        }
      }
      if (results.length > 0) {
        // Merge wiki results at the top if we have them
        const merged = [...wikiResults, ...results].slice(0, 8);
        return Response.json({ results: merged, query });
      }
    }
  } catch {}

  // If only wiki results, return those
  if (wikiResults.length > 0) return Response.json({ results: wikiResults, query });

  return Response.json({ results: [], query });
}
