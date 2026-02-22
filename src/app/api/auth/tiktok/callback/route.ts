import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/integrations?error=tiktok_no_code", req.url));
  }

  const appKey = process.env.TIKTOK_APP_KEY!;
  const appSecret = process.env.TIKTOK_APP_SECRET!;

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://auth.tiktok-shops.com/api/v2/token/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: appKey,
        app_secret: appSecret,
        auth_code: code,
        grant_type: "authorized_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.code !== 0) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=tiktok_token_error&msg=${encodeURIComponent(tokenData.message || "")}`, req.url)
      );
    }

    const { access_token, refresh_token, access_token_expire_in } = tokenData.data;

    // Pass tokens to client via URL fragment (won't be sent to server)
    const params = new URLSearchParams({
      tiktok_connected: "true",
      tiktok_access_token: access_token,
      tiktok_refresh_token: refresh_token,
      tiktok_expires_at: String(Date.now() + access_token_expire_in * 1000),
    });

    return NextResponse.redirect(new URL(`/dashboard/integrations?${params.toString()}`, req.url));
  } catch (err) {
    console.error("TikTok OAuth error:", err);
    return NextResponse.redirect(new URL("/dashboard/integrations?error=tiktok_exception", req.url));
  }
}
