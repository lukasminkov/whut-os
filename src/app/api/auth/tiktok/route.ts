import { NextResponse } from "next/server";

export async function GET() {
  const appKey = process.env.TIKTOK_APP_KEY;
  if (!appKey) {
    return NextResponse.json({ error: "TIKTOK_APP_KEY not configured" }, { status: 500 });
  }

  // TikTok Shop OAuth 2.0 authorization URL
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    app_key: appKey,
    state,
  });

  const authUrl = `https://auth.tiktok-shops.com/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
