import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  // Try Brave first
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
        return Response.json({ results, query });
      }
    } catch {}
  }

  // Fallback: DuckDuckGo HTML scrape (works reliably, no key needed)
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }
    );
    if (res.ok) {
      const html = await res.text();
      const results: any[] = [];

      // Parse results from DDG HTML
      const resultBlocks = html.split('class="result__body"');
      for (let i = 1; i < resultBlocks.length && results.length < 8; i++) {
        const block = resultBlocks[i];

        // Extract title
        const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</);
        const title = titleMatch?.[1]?.trim();

        // Extract URL from uddg parameter
        const urlMatch = block.match(/uddg=([^&"]+)/);
        let url = urlMatch?.[1] ? decodeURIComponent(urlMatch[1]) : null;

        // Extract snippet
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        let snippet = snippetMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";

        if (title && url && !url.includes("duckduckgo.com")) {
          results.push({ title, snippet, url, image: null });
        }
      }

      return Response.json({ results, query });
    }
  } catch {}

  return Response.json({ results: [], query });
}
