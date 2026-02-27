// Notion Integration — Pages, Databases, Blocks

import type { Integration, IntegrationTool } from './types';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
});

const tools: IntegrationTool[] = [
  {
    name: 'notion_search',
    description: 'Search across Notion pages and databases',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        filter: { type: 'string', enum: ['page', 'database'], description: 'Filter by object type' },
      },
    },
    async execute(params, token) {
      const body: Record<string, unknown> = { page_size: 20 };
      if (params.query) body.query = params.query;
      if (params.filter) body.filter = { property: 'object', value: params.filter };
      const res = await fetch(`${NOTION_API}/search`, {
        method: 'POST',
        headers: NOTION_HEADERS(token),
        body: JSON.stringify(body),
      });
      return res.json();
    },
  },
  {
    name: 'notion_get_page',
    description: 'Get a Notion page with its content blocks',
    input_schema: {
      type: 'object',
      properties: { pageId: { type: 'string', description: 'Notion page ID' } },
      required: ['pageId'],
    },
    async execute(params, token) {
      const [pageRes, blocksRes] = await Promise.all([
        fetch(`${NOTION_API}/pages/${params.pageId}`, { headers: NOTION_HEADERS(token) }),
        fetch(`${NOTION_API}/blocks/${params.pageId}/children?page_size=100`, { headers: NOTION_HEADERS(token) }),
      ]);
      const [page, blocks] = await Promise.all([pageRes.json(), blocksRes.json()]);
      return { page, blocks: blocks.results };
    },
  },
  {
    name: 'notion_create_page',
    description: 'Create a new Notion page in a database or as a child of another page',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: {
        parentId: { type: 'string', description: 'Parent page or database ID' },
        parentType: { type: 'string', enum: ['page_id', 'database_id'], description: 'Parent type' },
        title: { type: 'string', description: 'Page title' },
        content: { type: 'string', description: 'Page content as markdown-like text' },
        properties: { type: 'object', description: 'Database properties (for database parents)' },
      },
      required: ['parentId', 'title'],
    },
    async execute(params, token) {
      const parentType = (params.parentType as string) || 'page_id';
      const body: Record<string, unknown> = {
        parent: { [parentType]: params.parentId },
        properties: params.properties || {
          title: { title: [{ text: { content: params.title } }] },
        },
      };
      // Convert content to blocks
      if (params.content) {
        const lines = (params.content as string).split('\n').filter(Boolean);
        body.children = lines.map((line) => ({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: line } }],
          },
        }));
      }
      const res = await fetch(`${NOTION_API}/pages`, {
        method: 'POST',
        headers: NOTION_HEADERS(token),
        body: JSON.stringify(body),
      });
      return res.json();
    },
  },
  {
    name: 'notion_update_page',
    description: 'Update properties of a Notion page',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Page ID to update' },
        properties: { type: 'object', description: 'Properties to update' },
      },
      required: ['pageId', 'properties'],
    },
    async execute(params, token) {
      const res = await fetch(`${NOTION_API}/pages/${params.pageId}`, {
        method: 'PATCH',
        headers: NOTION_HEADERS(token),
        body: JSON.stringify({ properties: params.properties }),
      });
      return res.json();
    },
  },
  {
    name: 'notion_query_database',
    description: 'Query a Notion database with optional filter and sort',
    input_schema: {
      type: 'object',
      properties: {
        databaseId: { type: 'string', description: 'Database ID' },
        filter: { type: 'object', description: 'Notion filter object' },
        sorts: { type: 'array', description: 'Sort configuration' },
      },
      required: ['databaseId'],
    },
    async execute(params, token) {
      const body: Record<string, unknown> = { page_size: 100 };
      if (params.filter) body.filter = params.filter;
      if (params.sorts) body.sorts = params.sorts;
      const res = await fetch(`${NOTION_API}/databases/${params.databaseId}/query`, {
        method: 'POST',
        headers: NOTION_HEADERS(token),
        body: JSON.stringify(body),
      });
      return res.json();
    },
  },
  {
    name: 'notion_append_blocks',
    description: 'Append content blocks to a Notion page',
    requiresApproval: true,
    input_schema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Page ID to append to' },
        content: { type: 'string', description: 'Text content to append (each line becomes a paragraph)' },
      },
      required: ['pageId', 'content'],
    },
    async execute(params, token) {
      const lines = (params.content as string).split('\n').filter(Boolean);
      const blocks = lines.map((line) => ({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: line } }] },
      }));
      const res = await fetch(`${NOTION_API}/blocks/${params.pageId}/children`, {
        method: 'PATCH',
        headers: NOTION_HEADERS(token),
        body: JSON.stringify({ children: blocks }),
      });
      return res.json();
    },
  },
];

export const notionIntegration: Integration = {
  id: 'notion',
  name: 'Notion',
  icon: 'book-open',
  description: 'Pages, databases, and knowledge base',
  category: 'productivity',
  authType: 'oauth2',
  authUrl: '/api/auth/notion',
  scopes: [],
  async connect() {
    return { success: true };
  },
  async disconnect(userId: string) {
    await fetch('/api/integrations/tokens', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'notion' }),
    });
  },
  async getStatus(userId: string) {
    try {
      const res = await fetch(`/api/integrations/tokens?provider=notion`);
      const data = await res.json();
      return data.integrations?.length > 0 ? 'connected' : 'disconnected';
    } catch {
      return 'error';
    }
  },
  getTools: () => tools,
};
