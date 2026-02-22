import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/integrations?error=notion_no_code", req.url));
  }

  const clientId = process.env.NOTION_CLIENT_ID!;
  const clientSecret = process.env.NOTION_CLIENT_SECRET!;
  const redirectUri = new URL("/api/auth/notion/callback", req.url).toString();

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=notion_token_error&msg=${encodeURIComponent(tokenData.error)}`, req.url)
      );
    }

    const params = new URLSearchParams({
      notion_connected: "true",
      notion_access_token: tokenData.access_token,
      notion_workspace_name: tokenData.workspace_name || "",
      notion_workspace_id: tokenData.workspace_id || "",
    });

    return NextResponse.redirect(new URL(`/dashboard/integrations?${params.toString()}`, req.url));
  } catch (err) {
    console.error("Notion OAuth error:", err);
    return NextResponse.redirect(new URL("/dashboard/integrations?error=notion_exception", req.url));
  }
}
