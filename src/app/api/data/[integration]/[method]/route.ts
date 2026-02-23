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
import { createAdminClient } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase-server";

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

async function getTokensForUser(userId: string): Promise<{ access: string; refresh: string | null }> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Server not configured");

  const { data } = await admin
    .from("integrations")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (!data?.access_token) throw new Error("No Google integration found. Connect Google in Settings.");
  return { access: data.access_token, refresh: data.refresh_token };
}

async function updateTokenInDB(userId: string, newAccessToken: string, expiresAt: number) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("integrations").update({
    access_token: newAccessToken,
    token_expires_at: new Date(expiresAt).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId).eq("provider", "google");
}

async function callWithRefresh(
  fn: (token: string, params?: any) => Promise<any>,
  userId: string,
  accessToken: string,
  refreshToken: string | null,
  params?: any
): Promise<{ data: any; newToken?: string }> {
  try {
    const data = await fn(accessToken, params);
    return { data };
  } catch (err: any) {
    if (refreshToken && err.message?.includes("401")) {
      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed.access_token) {
        // Persist the new token
        const expiresAt = Date.now() + (refreshed.expires_in || 3600) * 1000;
        await updateTokenInDB(userId, refreshed.access_token, expiresAt);
        const data = await fn(refreshed.access_token, params);
        return { data, newToken: refreshed.access_token };
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
    return NextResponse.json({ error: `Unknown integration: ${integration}` }, { status: 400 });
  }
  const handler = integrationMethods[method];
  if (!handler) {
    return NextResponse.json({ error: `Unknown method: ${integration}/${method}` }, { status: 400 });
  }

  // Authenticate user via Supabase cookies
  let userId: string;
  try {
    const supabase = await createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get tokens from DB (not from headers!)
  let tokens: { access: string; refresh: string | null };
  try {
    tokens = await getTokensForUser(userId);
  } catch (err: any) {
    // Fallback: check headers for backward compat
    const headerToken = req.headers.get("x-google-access-token");
    if (headerToken) {
      tokens = { access: headerToken, refresh: req.headers.get("x-google-refresh-token") };
    } else {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
  }

  // Parse query params
  const methodParams: Record<string, any> = {};
  const url = new URL(req.url);
  for (const [key, value] of url.searchParams.entries()) {
    const num = Number(value);
    methodParams[key] = isNaN(num) ? value : num;
  }

  try {
    const result = await callWithRefresh(handler, userId, tokens.access, tokens.refresh, methodParams);
    return NextResponse.json({ data: result.data });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed: ${integration}/${method} — ${err.message}` },
      { status: 500 }
    );
  }
}
