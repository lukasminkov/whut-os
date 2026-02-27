// Google Workspace Integration — Gmail, Calendar, Drive

import type { Integration, IntegrationTool } from './types';

const gmailTools: IntegrationTool[] = [
  {
    name: 'fetch_emails',
    description: 'Fetch recent emails from Gmail inbox',
    input_schema: {
      type: 'object',
      properties: {
        maxResults: { type: 'number', description: 'Max emails to return (default 10)' },
        query: { type: 'string', description: 'Gmail search query (e.g. "from:bob is:unread")' },
      },
    },
    async execute(params, token) {
      const q = (params.query as string) || '';
      const max = (params.maxResults as number) || 10;
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.json();
    },
  },
  {
    name: 'get_email',
    description: 'Get a single email by ID with full content',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Gmail message ID' } },
      required: ['id'],
    },
    async execute(params, token) {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.json();
    },
  },
  {
    name: 'send_email',
    description: 'Send an email via Gmail',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body (plain text or HTML)' },
        html: { type: 'boolean', description: 'If true, body is HTML' },
      },
      required: ['to', 'subject', 'body'],
    },
    async execute(params, token) {
      const boundary = 'whut_boundary';
      const contentType = params.html ? 'text/html' : 'text/plain';
      const raw = [
        `To: ${params.to}`,
        `Subject: ${params.subject}`,
        `Content-Type: ${contentType}; charset=utf-8`,
        '',
        params.body,
      ].join('\r\n');
      const encoded = Buffer.from(raw).toString('base64url');
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encoded }),
      });
      return res.json();
    },
  },
  {
    name: 'archive_email',
    description: 'Archive an email (remove from inbox)',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Gmail message ID' } },
      required: ['id'],
    },
    async execute(params, token) {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.id}/modify`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
        }
      );
      return res.json();
    },
  },
];

const calendarTools: IntegrationTool[] = [
  {
    name: 'fetch_calendar',
    description: 'Fetch upcoming calendar events',
    input_schema: {
      type: 'object',
      properties: {
        maxResults: { type: 'number', description: 'Max events (default 10)' },
        timeMin: { type: 'string', description: 'Start time ISO string (default: now)' },
        timeMax: { type: 'string', description: 'End time ISO string' },
      },
    },
    async execute(params, token) {
      const timeMin = (params.timeMin as string) || new Date().toISOString();
      const max = (params.maxResults as number) || 10;
      let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${max}&timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`;
      if (params.timeMax) url += `&timeMax=${encodeURIComponent(params.timeMax as string)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Create a new calendar event',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Event title' },
        description: { type: 'string', description: 'Event description' },
        start: { type: 'string', description: 'Start time ISO string' },
        end: { type: 'string', description: 'End time ISO string' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'Email addresses of attendees' },
        location: { type: 'string', description: 'Event location' },
      },
      required: ['summary', 'start', 'end'],
    },
    async execute(params, token) {
      const event: Record<string, unknown> = {
        summary: params.summary,
        description: params.description || '',
        start: { dateTime: params.start, timeZone: 'UTC' },
        end: { dateTime: params.end, timeZone: 'UTC' },
      };
      if (params.location) event.location = params.location;
      if (params.attendees) {
        event.attendees = (params.attendees as string[]).map((e) => ({ email: e }));
      }
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        }
      );
      return res.json();
    },
  },
  {
    name: 'update_calendar_event',
    description: 'Update an existing calendar event',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Event ID' },
        summary: { type: 'string' },
        description: { type: 'string' },
        start: { type: 'string' },
        end: { type: 'string' },
        location: { type: 'string' },
      },
      required: ['eventId'],
    },
    async execute(params, token) {
      const updates: Record<string, unknown> = {};
      if (params.summary) updates.summary = params.summary;
      if (params.description) updates.description = params.description;
      if (params.start) updates.start = { dateTime: params.start, timeZone: 'UTC' };
      if (params.end) updates.end = { dateTime: params.end, timeZone: 'UTC' };
      if (params.location) updates.location = params.location;
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${params.eventId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );
      return res.json();
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete a calendar event',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: { eventId: { type: 'string', description: 'Event ID' } },
      required: ['eventId'],
    },
    async execute(params, token) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${params.eventId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      return { deleted: res.ok };
    },
  },
];

const driveTools: IntegrationTool[] = [
  {
    name: 'fetch_drive_files',
    description: 'List files from Google Drive',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Drive search query' },
        maxResults: { type: 'number', description: 'Max files (default 20)' },
        folderId: { type: 'string', description: 'Folder ID to list' },
      },
    },
    async execute(params, token) {
      let q = (params.query as string) || '';
      if (params.folderId) q = `'${params.folderId}' in parents`;
      const max = (params.maxResults as number) || 20;
      const url = `https://www.googleapis.com/drive/v3/files?pageSize=${max}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  },
  {
    name: 'create_drive_document',
    description: 'Create a new Google Doc',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title' },
        content: { type: 'string', description: 'Initial content (plain text)' },
        folderId: { type: 'string', description: 'Parent folder ID' },
      },
      required: ['title'],
    },
    async execute(params, token) {
      // Create the doc
      const meta: Record<string, unknown> = {
        name: params.title,
        mimeType: 'application/vnd.google-apps.document',
      };
      if (params.folderId) meta.parents = [params.folderId];
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      });
      const file = await createRes.json();
      // If content provided, update the doc body
      if (params.content && file.id) {
        await fetch(`https://docs.googleapis.com/v1/documents/${file.id}:batchUpdate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{ insertText: { location: { index: 1 }, text: params.content as string } }],
          }),
        });
      }
      return file;
    },
  },
];

export const googleWorkspaceIntegration: Integration = {
  id: 'google',
  name: 'Google Workspace',
  icon: 'mail',
  description: 'Gmail, Calendar, and Drive',
  category: 'productivity',
  authType: 'oauth2',
  authUrl: '/api/auth/google',
  scopes: [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive',
  ],
  async connect() {
    // OAuth flow handled by redirect
    return { success: true };
  },
  async disconnect(userId: string) {
    await fetch('/api/integrations/tokens', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google' }),
    });
  },
  async getStatus(userId: string) {
    try {
      const res = await fetch(`/api/integrations/tokens?provider=google`);
      const data = await res.json();
      if (data.integrations?.length > 0) {
        const token = data.integrations[0];
        if (token.token_expires_at && new Date(token.token_expires_at) < new Date()) {
          return 'needs_reauth';
        }
        return 'connected';
      }
      return 'disconnected';
    } catch {
      return 'error';
    }
  },
  getTools: () => [...gmailTools, ...calendarTools, ...driveTools],
};
