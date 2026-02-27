import { NextRequest } from "next/server";
import * as cheerio from "cheerio";

// ---------------------------------------------------------------------------
// Domain allowlist – add domains users are allowed to browse through proxy
// ---------------------------------------------------------------------------
const ALLOWED_DOMAINS = new Set([
  "google.com",
  "www.google.com",
  "google.at",
  "www.google.at",
  "wikipedia.org",
  "en.wikipedia.org",
  "de.wikipedia.org",
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "news.ycombinator.com",
  "ycombinator.com",
  "github.com",
  "stackoverflow.com",
  "developer.mozilla.org",
  "medium.com",
  "dev.to",
  "bbc.com",
  "www.bbc.com",
  "bbc.co.uk",
  "www.bbc.co.uk",
  "cnn.com",
  "www.cnn.com",
  "reuters.com",
  "www.reuters.com",
  "nytimes.com",
  "www.nytimes.com",
  "theguardian.com",
  "www.theguardian.com",
  "arxiv.org",
  "docs.google.com",
  "duckduckgo.com",
  "www.duckduckgo.com",
  "search.brave.com",
]);

function isAllowedUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    // Check domain and parent domain
    const host = u.hostname.toLowerCase();
    if (ALLOWED_DOMAINS.has(host)) return true;
    // Check if subdomain of allowed domain
    for (const d of ALLOWED_DOMAINS) {
      if (host.endsWith(`.${d}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (per-process)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// URL rewriting helpers
// ---------------------------------------------------------------------------
function toAbsolute(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

function rewriteHtml(html: string, targetUrl: string): string {
  const $ = cheerio.load(html);

  // Add <base> so the browser resolves remaining relative URLs
  $("head").prepend(`<base href="${targetUrl}" />`);

  // Rewrite common attributes to absolute
  const attrMap: Record<string, string[]> = {
    src: ["img", "script", "iframe", "source", "video", "audio", "embed"],
    href: ["a", "link"],
    action: ["form"],
    poster: ["video"],
    srcset: ["img", "source"],
  };

  for (const [attr, tags] of Object.entries(attrMap)) {
    for (const tag of tags) {
      $(tag).each((_, el) => {
        const val = $(el).attr(attr);
        if (!val || val.startsWith("data:") || val.startsWith("javascript:")) return;
        if (attr === "srcset") {
          // srcset has multiple entries
          const rewritten = val
            .split(",")
            .map((entry) => {
              const parts = entry.trim().split(/\s+/);
              if (parts[0]) parts[0] = toAbsolute(parts[0], targetUrl);
              return parts.join(" ");
            })
            .join(", ");
          $(el).attr(attr, rewritten);
        } else {
          $(el).attr(attr, toAbsolute(val, targetUrl));
        }
      });
    }
  }

  // Rewrite CSS url() references in inline styles
  $("[style]").each((_, el) => {
    const style = $(el).attr("style");
    if (style) {
      $(el).attr(
        "style",
        style.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (_, url) => {
          return `url('${toAbsolute(url, targetUrl)}')`;
        })
      );
    }
  });

  return $.html();
}

// ---------------------------------------------------------------------------
// Reader mode: extract readable content
// ---------------------------------------------------------------------------
function extractReadableContent(html: string, targetUrl: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, .ad, .sidebar, .menu, .nav, .cookie, .popup, .modal, iframe, noscript, svg").remove();

  const title = $("title").text().trim() || $("h1").first().text().trim() || "";

  // Try article or main content
  let content = $("article").html() || $("main").html() || $("[role='main']").html();
  if (!content || content.length < 200) {
    content = $("body").html() || "";
  }

  // Clean up the content
  const $c = cheerio.load(content);
  $c("script, style, nav, footer, .ad, .sidebar").remove();

  // Rewrite images to absolute
  $c("img").each((_, el) => {
    const src = $c(el).attr("src");
    if (src) $c(el).attr("src", toAbsolute(src, targetUrl));
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #1a1a2e; color: #e0e0e0;
      max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem;
      line-height: 1.7; font-size: 16px;
    }
    h1 { font-size: 1.8rem; margin-bottom: 1rem; color: #fff; line-height: 1.3; }
    h2, h3, h4 { margin: 1.5rem 0 0.75rem; color: #fff; }
    p { margin-bottom: 1rem; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
    a { color: #64b5f6; }
    blockquote { border-left: 3px solid #444; padding-left: 1rem; margin: 1rem 0; color: #aaa; }
    pre, code { background: #0d0d1a; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
    pre { padding: 1rem; overflow-x: auto; margin: 1rem 0; }
    ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
    .reader-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #333; }
    .reader-badge { background: #7c3aed; color: white; font-size: 0.65rem; padding: 2px 8px; border-radius: 99px; font-weight: 600; }
    .reader-source { font-size: 0.75rem; color: #888; }
  </style>
</head>
<body>
  <div class="reader-header">
    <span class="reader-badge">Reader Mode</span>
    <a href="${targetUrl}" target="_blank" class="reader-source">${targetUrl}</a>
  </div>
  ${title ? `<h1>${title}</h1>` : ""}
  ${$c.html()}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const targetUrl = req.nextUrl.searchParams.get("url");
  const readerMode = req.nextUrl.searchParams.get("reader") === "1";

  if (!targetUrl) {
    return Response.json({ error: "Missing `url` parameter" }, { status: 400 });
  }

  if (!isAllowedUrl(targetUrl)) {
    return Response.json(
      { error: "Domain not in allowlist", allowed: Array.from(ALLOWED_DOMAINS).sort() },
      { status: 403 }
    );
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return Response.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "";

    // For non-HTML content, pass through
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    const html = await upstream.text();

    const responseHtml = readerMode
      ? extractReadableContent(html, targetUrl)
      : rewriteHtml(html, targetUrl);

    return new Response(responseHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        // Explicitly allow framing from same origin
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Proxy fetch failed: ${message}` }, { status: 502 });
  }
}
