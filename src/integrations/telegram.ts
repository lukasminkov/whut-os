// Telegram Integration — Bot API for sending/receiving messages

import type { Integration, IntegrationTool } from './types';

const TG_API = (token: string) => `https://api.telegram.org/bot${token}`;

const tools: IntegrationTool[] = [
  {
    name: 'telegram_send_message',
    description: 'Send a message via Telegram bot',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: {
        chatId: { type: 'string', description: 'Telegram chat ID' },
        text: { type: 'string', description: 'Message text (supports Markdown)' },
        parseMode: { type: 'string', enum: ['Markdown', 'HTML'], description: 'Parse mode' },
      },
      required: ['chatId', 'text'],
    },
    async execute(params, token) {
      const res = await fetch(`${TG_API(token)}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: params.chatId,
          text: params.text,
          parse_mode: params.parseMode || 'Markdown',
        }),
      });
      return res.json();
    },
  },
  {
    name: 'telegram_get_updates',
    description: 'Get recent messages/updates from Telegram bot',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max updates (default 20)' },
        offset: { type: 'number', description: 'Update offset for pagination' },
      },
    },
    async execute(params, token) {
      const limit = (params.limit as number) || 20;
      let url = `${TG_API(token)}/getUpdates?limit=${limit}`;
      if (params.offset) url += `&offset=${params.offset}`;
      const res = await fetch(url);
      return res.json();
    },
  },
  {
    name: 'telegram_get_chat',
    description: 'Get info about a Telegram chat',
    input_schema: {
      type: 'object',
      properties: {
        chatId: { type: 'string', description: 'Chat ID' },
      },
      required: ['chatId'],
    },
    async execute(params, token) {
      const res = await fetch(`${TG_API(token)}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: params.chatId }),
      });
      return res.json();
    },
  },
  {
    name: 'telegram_send_document',
    description: 'Send a document/file via Telegram',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: {
        chatId: { type: 'string', description: 'Chat ID' },
        documentUrl: { type: 'string', description: 'URL of the document to send' },
        caption: { type: 'string', description: 'Document caption' },
      },
      required: ['chatId', 'documentUrl'],
    },
    async execute(params, token) {
      const res = await fetch(`${TG_API(token)}/sendDocument`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: params.chatId,
          document: params.documentUrl,
          caption: params.caption || '',
        }),
      });
      return res.json();
    },
  },
];

export const telegramIntegration: Integration = {
  id: 'telegram',
  name: 'Telegram',
  icon: 'send',
  description: 'Send and receive messages via Telegram bot',
  category: 'communication',
  authType: 'bot_token',
  async connect(credentials) {
    // Validate bot token by calling getMe
    const token = credentials.bot_token;
    if (!token) return { success: false, error: 'Bot token required' };
    try {
      const res = await fetch(`${TG_API(token)}/getMe`);
      const data = await res.json();
      if (!data.ok) return { success: false, error: 'Invalid bot token' };
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to validate token' };
    }
  },
  async disconnect(userId: string) {
    await fetch('/api/integrations/tokens', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'telegram' }),
    });
  },
  async getStatus(userId: string) {
    try {
      const res = await fetch(`/api/integrations/tokens?provider=telegram`);
      const data = await res.json();
      return data.integrations?.length > 0 ? 'connected' : 'disconnected';
    } catch {
      return 'error';
    }
  },
  getTools: () => tools,
};
