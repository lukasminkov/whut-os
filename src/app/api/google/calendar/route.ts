import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingEvents, refreshAccessToken } from '@/lib/google';

export async function GET(req: NextRequest) {
  const accessToken = req.headers.get('x-google-access-token');
  const refreshToken = req.headers.get('x-google-refresh-token');
  if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 401 });

  try {
    const events = await getUpcomingEvents(accessToken);
    return NextResponse.json({ events });
  } catch (err: unknown) {
    if (refreshToken && err instanceof Error && err.message.includes('401')) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        if (refreshed.access_token) {
          const events = await getUpcomingEvents(refreshed.access_token);
          return NextResponse.json({ events, new_access_token: refreshed.access_token, new_expires_at: Date.now() + (refreshed.expires_in || 3600) * 1000 });
        }
      } catch { /* fall through */ }
    }
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}
