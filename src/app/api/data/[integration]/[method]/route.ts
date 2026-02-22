import { NextRequest, NextResponse } from "next/server";
import {
  getRecentEmails,
  getMessage,
  archiveEmail,
  trashEmail,
  getRecentDriveFiles,
  getUpcomingEvents,
  refreshAccessToken,
} from "@/lib/google";

// Integration method registry
const METHODS: Record<string, Record<string, (token: string, params?: any) => Promise<any>>> = {
  gmail: {
    getRecentEmails: (token, params) => getRecentEmails(token, params?.maxResults),
    getMessage: (token, params) => getMessage(token, params?.id),
    archiveEmail: (token, params) => archiveEmail(token, params?.id),
    trashEmail: (token, params) => trashEmail(token, params?.id),
  },
  calendar: {
    getUpcomingEvents: (token, params) => getUpcomingEvents(token, params?.maxResults),
  },
  drive: {
    getRecentFiles: (token, params) => getRecentDriveFiles(token, params?.maxResults),
  },
};

async function callWithRefresh(
  fn: (token: string, params?: any) => Promise<any>,
  accessToken: string,
  refreshToken: string | null,
  params?: any
): Promise<{ data: any; newToken?: string; newExpiresAt?: number }> {
  try {
    const data = await fn(accessToken, params);
    return { data };
  } catch (err: any) {
    if (refreshToken && err.message?.includes("401")) {
      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed.access_token) {
        const data = await fn(refreshed.access_token, params);
        return {
          data,
          newToken: refreshed.access_token,
          newExpiresAt: Date.now() + (refreshed.expires_in || 3600) * 1000,
        };
      }
    }
    throw err;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ integration: string; method: string }> }
) {
  const { integration, method } = await params;

  // Validate integration + method
  const integrationMethods = METHODS[integration];
  if (!integrationMethods) {
    return NextResponse.json(
      { error: `Unknown integration: ${integration}` },
      { status: 400 }
    );
  }
  const handler = integrationMethods[method];
  if (!handler) {
    return NextResponse.json(
      { error: `Unknown method: ${integration}/${method}` },
      { status: 400 }
    );
  }

  // Get tokens from headers
  const accessToken = req.headers.get("x-google-access-token");
  const refreshToken = req.headers.get("x-google-refresh-token");
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  // Parse query params for method arguments
  const methodParams: Record<string, any> = {};
  const url = new URL(req.url);
  for (const [key, value] of url.searchParams.entries()) {
    // Try to parse numbers
    const num = Number(value);
    methodParams[key] = isNaN(num) ? value : num;
  }

  try {
    const result = await callWithRefresh(handler, accessToken, refreshToken, methodParams);
    const response: any = { data: result.data };
    if (result.newToken) {
      response.new_access_token = result.newToken;
      response.new_expires_at = result.newExpiresAt;
    }
    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed: ${integration}/${method} — ${err.message}` },
      { status: 500 }
    );
  }
}
