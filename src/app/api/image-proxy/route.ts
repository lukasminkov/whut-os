import { NextRequest, NextResponse } from "next/server";

const cache = new Map<string, string | null>();

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Check in-memory cache
  if (cache.has(url)) {
    const cached = cache.get(url);
    return NextResponse.json({ image: cached });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WhutOS/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      cache.set(url, null);
      return NextResponse.json({ image: null });
    }

    const html = await res.text();
    
    // Extract og:image
    const ogMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    ) || html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
    );

    const image = ogMatch?.[1] || null;
    cache.set(url, image);

    return NextResponse.json(
      { image },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch {
    cache.set(url, null);
    return NextResponse.json({ image: null });
  }
}
