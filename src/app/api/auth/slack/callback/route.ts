import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/integrations?error=slack_no_code", req.url));
  }

  const clientId = process.env.SLACK_CLIENT_ID!;
  const clientSecret = process.env.SLACK_CLIENT_SECRET!;
  const redirectUri = new URL("/api/auth/slack/callback", req.url).toString();

  try {
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=slack_token_error&msg=${encodeURIComponent(tokenData.error || "")}`, req.url)
      );
    }

    const params = new URLSearchParams({
      slack_connected: "true",
      slack_access_token: tokenData.access_token,
      slack_team_name: tokenData.team?.name || "",
      slack_team_id: tokenData.team?.id || "",
    });

    return NextResponse.redirect(new URL(`/dashboard/integrations?${params.toString()}`, req.url));
  } catch (err) {
    console.error("Slack OAuth error:", err);
    return NextResponse.redirect(new URL("/dashboard/integrations?error=slack_exception", req.url));
  }
}
