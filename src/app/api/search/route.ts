import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  if (braveKey) {
    // Use Brave Search API
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
        return Response.json({ results });
      }
    } catch {}
  }

  // Fallback: DuckDuckGo instant answer API (no key needed, limited)
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`
    );
    if (res.ok) {
      const data = await res.json();
      const results: any[] = [];
      if (data.Abstract) {
        results.push({
          title: data.Heading || query,
          snippet: data.Abstract,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          image: data.Image || null,
        });
      }
      for (const topic of data.RelatedTopics || []) {
        if (topic.Text && results.length < 8) {
          results.push({
            title: topic.Text.split(" - ")[0] || topic.Text.slice(0, 60),
            snippet: topic.Text,
            url: topic.FirstURL || "#",
            image: topic.Icon?.URL || null,
          });
        }
      }
      return Response.json({ results });
    }
  } catch {}

  return Response.json({ results: [] });
}
