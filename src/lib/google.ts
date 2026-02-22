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

// Gmail Send
export async function sendEmail(accessToken: string, to: string, subject: string, body: string) {
  // Fetch sender's email address for the From header
  // This is lightweight and ensures proper RFC 2822 compliance
  let fromAddress = 'me';
  try {
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      if (profile.emailAddress) fromAddress = profile.emailAddress;
    }
  } catch { /* fall through — Gmail API will infer sender from token */ }

  // RFC 2822 compliant date string
  const date = new Date().toUTCString().replace('UTC', '+0000');

  // Unique Message-ID — required by RFC 2822; missing it is a strong spam signal
  const messageId = `<${crypto.randomUUID()}@mail.gmail.com>`;

  // Build RFC 2822 message with all required headers
  const messageParts = [
    `From: ${fromAddress}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ];
  const rawMessage = messageParts.join('\r\n');
  // Base64url encode
  const encoded = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) throw new Error(`Gmail send failed ${res.status}: ${await res.text()}`);
  return res.json();
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
