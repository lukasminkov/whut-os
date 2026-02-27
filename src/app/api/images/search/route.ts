import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Simple rate limiting
const rateLimiter = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.reset) {
    rateLimiter.set(ip, { count: 1, reset: now + 60000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ error: "Missing q param" }, { status: 400 });

  const count = Math.min(parseInt(req.nextUrl.searchParams.get("count") || "5"), 10);

  try {
    // Check Supabase cache first
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: cached } = await supabase
        .from("image_cache")
        .select("images, updated_at")
        .eq("query", query.toLowerCase().trim())
        .single();

      if (cached && Date.now() - new Date(cached.updated_at).getTime() < 7 * 24 * 60 * 60 * 1000) {
        return NextResponse.json({ images: cached.images.slice(0, count), cached: true });
      }
    }
  } catch {
    // Cache miss or table doesn't exist, continue to search
  }

  // Use the existing search API + image proxy to find images
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://whut.ai";
  try {
    const searchRes = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query + " photos")}`, {
      signal: AbortSignal.timeout(8000),
    });
    const searchData = await searchRes.json();
    
    const images: { url: string; title: string; source: string }[] = [];
    
    if (searchData.results) {
      for (const result of searchData.results.slice(0, count * 2)) {
        if (result.image) {
          images.push({
            url: result.image,
            title: result.title || query,
            source: new URL(result.url).hostname,
          });
        }
        if (images.length >= count) break;
      }

      // If not enough images from search results, try image proxy on remaining results
      if (images.length < count) {
        const remaining = searchData.results.filter((r: any) => !r.image).slice(0, count - images.length);
        const imgResults = await Promise.allSettled(
          remaining.map(async (r: any) => {
            const res = await fetch(`${BASE_URL}/api/image-proxy?url=${encodeURIComponent(r.url)}`, {
              signal: AbortSignal.timeout(3000),
            });
            const data = await res.json();
            if (data.image) {
              return { url: data.image, title: r.title, source: new URL(r.url).hostname };
            }
            return null;
          })
        );
        for (const r of imgResults) {
          if (r.status === "fulfilled" && r.value) {
            images.push(r.value);
            if (images.length >= count) break;
          }
        }
      }
    }

    // Cache results
    try {
      if (supabaseUrl && supabaseKey && images.length > 0) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("image_cache").upsert({
          query: query.toLowerCase().trim(),
          images,
          updated_at: new Date().toISOString(),
        }, { onConflict: "query" });
      }
    } catch {
      // Cache write failure is non-critical
    }

    return NextResponse.json({ images: images.slice(0, count) });
  } catch {
    return NextResponse.json({ images: [], error: "Image search failed" });
  }
}
