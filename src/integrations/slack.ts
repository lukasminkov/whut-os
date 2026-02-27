// Slack Integration — stub

import type { Integration } from './types';

export const slackIntegration: Integration = {
  id: 'slack',
  name: 'Slack',
  icon: 'message-square',
  description: 'Team messaging and notifications',
  category: 'communication',
  authType: 'oauth2',
  authUrl: '/api/auth/slack',
  scopes: [],
  async connect() { return { success: true }; },
  async disconnect() {
    await fetch('/api/integrations/tokens', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'slack' }),
    });
  },
  async getStatus() {
    try {
      const res = await fetch('/api/integrations/tokens?provider=slack');
      const data = await res.json();
      return data.integrations?.length > 0 ? 'connected' : 'disconnected';
    } catch { return 'error'; }
  },
  getTools: () => [],
};
