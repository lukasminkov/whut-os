import { NextRequest, NextResponse } from 'next/server';
import { getRecentEmails, refreshAccessToken } from '@/lib/google';

export async function GET(req: NextRequest) {
  const accessToken = req.headers.get('x-google-access-token');
  const refreshToken = req.headers.get('x-google-refresh-token');
  if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 401 });

  try {
    const emails = await getRecentEmails(accessToken);
    return NextResponse.json({ emails });
  } catch (err: unknown) {
    // Try refresh
    if (refreshToken && err instanceof Error && err.message.includes('401')) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        if (refreshed.access_token) {
          const emails = await getRecentEmails(refreshed.access_token);
          return NextResponse.json({ emails, new_access_token: refreshed.access_token, new_expires_at: Date.now() + (refreshed.expires_in || 3600) * 1000 });
        }
      } catch { /* fall through */ }
    }
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}
