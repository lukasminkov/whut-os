import { NextRequest, NextResponse } from "next/server";

const TIKTOK_API = "https://open-api.tiktokglobalshop.com";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-tiktok-token");
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  const appKey = process.env.TIKTOK_APP_KEY!;
  const endpoint = req.nextUrl.searchParams.get("endpoint") || "shop";

  try {
    let url: string;
    const headers: Record<string, string> = {
      "x-tts-access-token": token,
      "Content-Type": "application/json",
    };

    switch (endpoint) {
      case "shop":
        url = `${TIKTOK_API}/authorization/202309/shops?app_key=${appKey}`;
        break;
      case "orders":
        url = `${TIKTOK_API}/order/202309/orders/search?app_key=${appKey}&page_size=10`;
        break;
      default:
        return NextResponse.json({ error: "Unknown endpoint" }, { status: 400 });
    }

    const res = await fetch(url, {
      method: endpoint === "orders" ? "POST" : "GET",
      headers,
      ...(endpoint === "orders" ? { body: JSON.stringify({}) } : {}),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("TikTok API error:", err);
    return NextResponse.json({ error: "API request failed" }, { status: 500 });
  }
}
