import { NextRequest, NextResponse } from 'next/server';
import { getRecentDriveFiles, refreshAccessToken } from '@/lib/google';

export async function GET(req: NextRequest) {
  const accessToken = req.headers.get('x-google-access-token');
  const refreshToken = req.headers.get('x-google-refresh-token');
  if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 401 });

  try {
    const files = await getRecentDriveFiles(accessToken);
    return NextResponse.json({ files });
  } catch (err: unknown) {
    if (refreshToken && err instanceof Error && err.message.includes('401')) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        if (refreshed.access_token) {
          const files = await getRecentDriveFiles(refreshed.access_token);
          return NextResponse.json({ files, new_access_token: refreshed.access_token, new_expires_at: Date.now() + (refreshed.expires_in || 3600) * 1000 });
        }
      } catch { /* fall through */ }
    }
    return NextResponse.json({ error: 'Failed to fetch drive files' }, { status: 500 });
  }
}
