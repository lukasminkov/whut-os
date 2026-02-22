import { NextRequest, NextResponse } from "next/server";

const NOTION_API = "https://api.notion.com/v1";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-notion-token");
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  const endpoint = req.nextUrl.searchParams.get("endpoint") || "databases";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  try {
    let data;
    switch (endpoint) {
      case "databases": {
        const res = await fetch(`${NOTION_API}/search`, {
          method: "POST",
          headers,
          body: JSON.stringify({ filter: { property: "object", value: "database" }, page_size: 20 }),
        });
        data = await res.json();
        break;
      }
      case "pages": {
        const res = await fetch(`${NOTION_API}/search`, {
          method: "POST",
          headers,
          body: JSON.stringify({ filter: { property: "object", value: "page" }, page_size: 20 }),
        });
        data = await res.json();
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown endpoint" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Notion API error:", err);
    return NextResponse.json({ error: "API request failed" }, { status: 500 });
  }
}
