import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "SLACK_CLIENT_ID not configured" }, { status: 500 });
  }

  const redirectUri = new URL("/api/auth/slack/callback", req.url).toString();
  const state = crypto.randomUUID();
  const scopes = "channels:read,chat:write,users:read";

  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
}
