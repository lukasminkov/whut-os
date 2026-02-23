import { NextRequest } from "next/server";
import * as cheerio from "cheerio";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return Response.json({ error: "Missing url" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok)
      return Response.json({ error: "Failed to fetch", status: res.status });

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noise
    $(
      "script, style, nav, footer, header, .ad, .sidebar, .menu, .nav, .cookie, .popup, .modal, iframe, noscript"
    ).remove();

    // Get title
    const title = $("title").text().trim() || $("h1").first().text().trim();

    // Get main content (try article, main, then body)
    let content = "";
    const selectors = [
      "article",
      "main",
      "[role='main']",
      ".post-content",
      ".article-content",
      ".entry-content",
      "body",
    ];
    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 200) {
        content = el.text().trim();
        break;
      }
    }

    if (!content) content = $("body").text().trim();

    // Clean up whitespace
    content = content.replace(/\s+/g, " ").trim();

    // Truncate to ~4000 chars
    if (content.length > 4000) {
      content = content.slice(0, 4000) + "...";
    }

    // Get og:image
    const image =
      $('meta[property="og:image"]').attr("content") || null;

    return Response.json({ title, content, image, url });
  } catch (e: any) {
    return Response.json({ error: e.message || "Failed to read page" });
  }
}
