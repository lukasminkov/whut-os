import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("Missing url", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/*, */*",
        "Referer": new URL(url).origin,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return new Response("Not found", { status: 404 });

    const contentType = res.headers.get("content-type") || "image/jpeg";

    // If it's an image, pipe it through
    if (contentType.startsWith("image/")) {
      const body = await res.arrayBuffer();
      return new Response(body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // If it's HTML (not an image URL), try to extract og:image and redirect
    const html = await res.text();
    const ogMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    ) || html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
    );

    if (ogMatch?.[1]) {
      const ogUrl = ogMatch[1].startsWith("//") ? "https:" + ogMatch[1] : ogMatch[1];
      const imgRes = await fetch(ogUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "image/*",
          "Referer": new URL(url).origin,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      if (imgRes.ok) {
        const body = await imgRes.arrayBuffer();
        return new Response(body, {
          headers: {
            "Content-Type": imgRes.headers.get("content-type") || "image/jpeg",
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    return new Response("No image found", { status: 404 });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }
}
