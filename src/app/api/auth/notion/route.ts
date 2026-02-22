import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "NOTION_CLIENT_ID not configured" }, { status: 500 });
  }

  const redirectUri = new URL("/api/auth/notion/callback", req.url).toString();
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params.toString()}`);
}
