import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-slack-token");
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  const endpoint = req.nextUrl.searchParams.get("endpoint") || "channels";

  try {
    let url: string;
    switch (endpoint) {
      case "channels":
        url = "https://slack.com/api/conversations.list?limit=50&exclude_archived=true";
        break;
      case "users":
        url = "https://slack.com/api/users.list?limit=50";
        break;
      default:
        return NextResponse.json({ error: "Unknown endpoint" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Slack API error:", err);
    return NextResponse.json({ error: "API request failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-slack-token");
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  const body = await req.json();

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: body.channel,
        text: body.text,
      }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Slack send error:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
