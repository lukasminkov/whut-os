import { NextRequest } from "next/server";
import * as cheerio from "cheerio";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  // Try Serper.dev first (Google results, free tier)
  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 8 }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const results = (data.organic || []).slice(0, 8).map((r: any) => ({
          title: r.title,
          snippet: r.snippet || "",
          url: r.link,
          image: r.imageUrl || r.thumbnail || null,
        }));
        if (results.length > 0) return Response.json({ results, query });
      }
    } catch {}
  }

  // Try Brave API (if key exists)
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

  // Scrape Brave Search web interface
  try {
    const results = await scrapeBraveSearch(query);
    if (results.length > 0) {
      return Response.json({ results: results.slice(0, 8), query });
    }
  } catch (e) {
    console.error("Brave scrape failed:", e);
  }

  // Last resort: Wikipedia
  try {
    const wikiResults = await searchWikipedia(query);
    if (wikiResults.length > 0) {
      return Response.json({ results: wikiResults, query });
    }
  } catch {}

  return Response.json({ results: [], query });
}

async function scrapeBraveSearch(query: string): Promise<any[]> {
  const res = await fetch(
    `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(6000),
    }
  );

  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: any[] = [];
  const seen = new Set<string>();

  $(".snippet").each((i, el) => {
    if (results.length >= 8) return;

    const $el = $(el);

    let url = "";
    let title = "";

    const headingLink = $el.find("a.heading-serpresult, a[class*='heading-serpresult'], .result-header a").first();
    if (headingLink.length) {
      url = headingLink.attr("href") || "";
      title = headingLink.text().trim();
    }

    if (!url) {
      $el.find("a[href]").each((_, a) => {
        const href = $(a).attr("href") || "";
        if (href.startsWith("http") &&
            !href.includes("search.brave.com") &&
            !href.includes("brave.com") &&
            !href.includes("imgs.search.brave")) {
          if (!url) {
            url = href;
            title = $(a).text().trim();
          }
        }
      });
    }

    if (!url || seen.has(url)) return;
    seen.add(url);

    const titleParts = title.split(/\s{2,}/);
    if (titleParts.length > 1) {
      title = titleParts[titleParts.length - 1].trim();
    }
    if (!title || title.length < 5) {
      const arrowParts = title.split("›");
      title = arrowParts[arrowParts.length - 1].trim();
    }

    let snippet = "";
    const descEl = $el.find(".snippet-description, [class*='snippet-description']").first();
    if (descEl.length) {
      snippet = descEl.text().trim();
    }
    if (!snippet) {
      const contentEl = $el.find(".snippet-content, [class*='snippet-content']").first();
      if (contentEl.length) {
        snippet = contentEl.text().trim().substring(0, 200);
      }
    }

    let image: string | null = null;
    $el.find("img[src*='imgs.search.brave']").each((_, img) => {
      const src = $(img).attr("src") || "";
      if (!src.includes("32:32") && !src.includes("16:16")) {
        if (!image) image = src;
      }
    });

    results.push({
      title: title.substring(0, 120),
      snippet: snippet.substring(0, 250),
      url,
      image,
    });
  });

  return results;
}

async function searchWikipedia(query: string): Promise<any[]> {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&srprop=snippet`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.query?.search || []).map((r: any) => ({
    title: r.title,
    snippet: r.snippet.replace(/<[^>]+>/g, ""),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
    image: null,
  }));
}
