import { NextRequest, NextResponse } from "next/server";
import { sendEmail, refreshAccessToken } from "@/lib/google";

async function withTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
  accessToken: string,
  refreshToken: string | null
): Promise<{ result: T; newToken?: string; newExpiresAt?: number }> {
  try {
    const result = await fn(accessToken);
    return { result };
  } catch (err: any) {
    if (refreshToken && err.message?.includes("401")) {
      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed.access_token) {
        const result = await fn(refreshed.access_token);
        return {
          result,
          newToken: refreshed.access_token,
          newExpiresAt: Date.now() + (refreshed.expires_in || 3600) * 1000,
        };
      }
    }
    throw err;
  }
}

// Action handlers
const ACTIONS: Record<
  string,
  (params: any, accessToken: string, refreshToken: string | null) => Promise<NextResponse>
> = {
  async send_email(params, accessToken, refreshToken) {
    const { to, subject, body } = params;
    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }
    const { result, newToken, newExpiresAt } = await withTokenRefresh(
      (token) => sendEmail(token, to, subject, body),
      accessToken,
      refreshToken
    );
    const response: any = { success: true, messageId: result.id };
    if (newToken) {
      response.new_access_token = newToken;
      response.new_expires_at = newExpiresAt;
    }
    return NextResponse.json(response);
  },

  async create_event(params, accessToken, refreshToken) {
    const { summary, start, end, description, location } = params;
    if (!summary || !start) {
      return NextResponse.json(
        { error: "Missing required fields: summary, start" },
        { status: 400 }
      );
    }
    const eventBody: any = {
      summary,
      description,
      location,
      start: { dateTime: start },
      end: { dateTime: end || start },
    };
    const { result, newToken, newExpiresAt } = await withTokenRefresh(
      async (token) => {
        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventBody),
          }
        );
        if (!res.ok) throw new Error(`Calendar API ${res.status}: ${await res.text()}`);
        return res.json();
      },
      accessToken,
      refreshToken
    );
    const response: any = { success: true, eventId: result.id, htmlLink: result.htmlLink };
    if (newToken) {
      response.new_access_token = newToken;
      response.new_expires_at = newExpiresAt;
    }
    return NextResponse.json(response);
  },

  async search_drive(params, accessToken, refreshToken) {
    const { query } = params;
    if (!query) {
      return NextResponse.json({ error: "Missing required field: query" }, { status: 400 });
    }
    const { result, newToken, newExpiresAt } = await withTokenRefresh(
      async (token) => {
        const q = encodeURIComponent(`name contains '${query.replace(/'/g, "\\'")}'`);
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=20&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink)`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
        return res.json();
      },
      accessToken,
      refreshToken
    );
    const response: any = { success: true, files: result.files || [] };
    if (newToken) {
      response.new_access_token = newToken;
      response.new_expires_at = newExpiresAt;
    }
    return NextResponse.json(response);
  },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  const handler = ACTIONS[type];
  if (!handler) {
    return NextResponse.json({ error: `Unknown action: ${type}` }, { status: 400 });
  }

  const accessToken = req.headers.get("x-google-access-token");
  const refreshToken = req.headers.get("x-google-refresh-token");
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    return await handler(body, accessToken, refreshToken);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Action failed: ${err.message}` },
      { status: 500 }
    );
  }
}
