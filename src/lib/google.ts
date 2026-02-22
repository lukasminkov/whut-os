// Google OAuth + API helpers

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
  'profile',
].join(' ');

export function getGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'https://whut.ai/api/auth/google/callback',
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: crypto.randomUUID(),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'https://whut.ai/api/auth/google/callback',
      grant_type: 'authorization_code',
    }),
  });
  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  return res.json();
}

async function gfetch(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Gmail
export async function getRecentEmails(accessToken: string, maxResults = 15) {
  const list = await gfetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
    accessToken
  );
  if (!list.messages?.length) return [];

  const emails = await Promise.all(
    list.messages.map(async (m: { id: string }) => {
      const msg = await gfetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        accessToken
      );
      const headers = msg.payload?.headers || [];
      const get = (name: string) => headers.find((h: { name: string; value: string }) => h.name === name)?.value || '';
      return {
        id: msg.id,
        threadId: msg.threadId,
        snippet: msg.snippet,
        from: get('From'),
        subject: get('Subject'),
        date: get('Date'),
        unread: msg.labelIds?.includes('UNREAD') ?? false,
        important: msg.labelIds?.includes('IMPORTANT') ?? false,
      };
    })
  );
  return emails;
}

// Google Drive
export async function getRecentDriveFiles(accessToken: string, maxResults = 20) {
  const data = await gfetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink,owners,shared)`,
    accessToken
  );
  return data.files || [];
}

// Google Calendar
export async function getUpcomingEvents(accessToken: string, maxResults = 15) {
  const now = new Date().toISOString();
  const data = await gfetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&timeMin=${encodeURIComponent(now)}&orderBy=startTime&singleEvents=true`,
    accessToken
  );
  return data.items || [];
}
