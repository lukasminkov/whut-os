import { NextRequest, NextResponse } from 'next/server';
import { getRecentEmails, refreshAccessToken, sendEmail, markAsRead, archiveEmail } from '@/lib/google';

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

export async function POST(req: NextRequest) {
  const accessToken = req.headers.get('x-google-access-token');
  const refreshToken = req.headers.get('x-google-refresh-token');
  if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 401 });

  let emailData: { to: string; subject: string; body: string };
  try {
    emailData = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { to, subject, body } = emailData;
  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'Missing to, subject, or body' }, { status: 400 });
  }

  try {
    const result = await sendEmail(accessToken, to, subject, body);
    return NextResponse.json({ success: true, messageId: result.id });
  } catch (err: unknown) {
    if (refreshToken && err instanceof Error && err.message.includes('401')) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        if (refreshed.access_token) {
          const result = await sendEmail(refreshed.access_token, to, subject, body);
          return NextResponse.json({ success: true, messageId: result.id, new_access_token: refreshed.access_token, new_expires_at: Date.now() + (refreshed.expires_in || 3600) * 1000 });
        }
      } catch { /* fall through */ }
    }
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const accessToken = req.headers.get('x-google-access-token');
  const refreshToken = req.headers.get('x-google-refresh-token');
  if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 401 });

  let body: { action: string; id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, id } = body;
  if (!action || !id) {
    return NextResponse.json({ error: 'Missing action or id' }, { status: 400 });
  }

  const doAction = async (token: string) => {
    switch (action) {
      case 'markAsRead':
        return markAsRead(token, id);
      case 'archive':
        return archiveEmail(token, id);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  };

  try {
    await doAction(accessToken);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (refreshToken && err instanceof Error && err.message.includes('401')) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        if (refreshed.access_token) {
          await doAction(refreshed.access_token);
          return NextResponse.json({ success: true, new_access_token: refreshed.access_token, new_expires_at: Date.now() + (refreshed.expires_in || 3600) * 1000 });
        }
      } catch { /* fall through */ }
    }
    return NextResponse.json({ error: `Failed to ${action}` }, { status: 500 });
  }
}
