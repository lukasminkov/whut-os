# WHUT OS — Knowledge & Skill System Architecture

## Overview

WHUT OS transforms from a hardcoded single-prompt AI into a dynamic, multi-user knowledge platform. The architecture draws from OpenClaw's elegant "markdown-as-config" philosophy but adapts it for a web-native, multi-tenant, visual-first environment.

**Core principle:** The AI's capabilities are defined by composable text documents (skills), personalized context (user knowledge graph + memory), and dynamic assembly (prompt builder). Everything is stored in Supabase. Nothing is hardcoded.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      USER REQUEST                        │
│              (voice transcription / text)                 │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  PROMPT ASSEMBLY ENGINE                    │
│                                                           │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────────┐  │
│  │ Core    │  │ Skill    │  │ Memory │  │ Document   │  │
│  │ Identity│  │ Selector │  │ Recall │  │ Retriever  │  │
│  └────┬────┘  └────┬─────┘  └───┬────┘  └─────┬──────┘  │
│       │            │            │              │          │
│       ▼            ▼            ▼              ▼          │
│  ┌───────────────────────────────────────────────────┐   │
│  │            CONTEXT BUDGET ALLOCATOR               │   │
│  │  (prioritize + truncate to fit token limit)       │   │
│  └───────────────────────┬───────────────────────────┘   │
└──────────────────────────┼───────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│                      LLM CALL                             │
│  system_prompt + user_message → response                  │
└──────────────────────┬───────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│               RESPONSE PROCESSOR                          │
│                                                           │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Tool     │  │ Scene        │  │ Memory             │  │
│  │ Executor │  │ Renderer     │  │ Writer             │  │
│  └──────────┘  └──────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 1. Skill System

### What is a Skill?

A skill is a **markdown document** that teaches the AI how to use an integration, perform a task, or visualize data. Skills are the atomic unit of capability in WHUT OS.

### Storage

**Supabase table: `skills`**

```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,          -- 'gmail', 'tiktok-shop', 'daily-briefing'
  name TEXT NOT NULL,
  description TEXT NOT NULL,          -- one-liner for search/display
  category TEXT NOT NULL,             -- 'integration', 'visualization', 'workflow', 'utility'
  tier TEXT NOT NULL DEFAULT 'built-in', -- 'built-in', 'user', 'marketplace'
  author_id UUID REFERENCES users(id), -- NULL for built-in
  content TEXT NOT NULL,              -- the markdown skill document
  version INT NOT NULL DEFAULT 1,
  embedding VECTOR(1536),            -- for semantic skill selection
  tags TEXT[],
  requires_integrations TEXT[],      -- ['gmail'] — skill only loads if user has these connected
  defines_tools JSONB,               -- tool function definitions this skill provides
  defines_scenes JSONB,              -- scene components this skill can render
  is_published BOOLEAN DEFAULT false,
  price_cents INT DEFAULT 0,         -- 0 = free
  install_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_skills_embedding ON skills USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_skills_slug ON skills (slug);
CREATE INDEX idx_skills_category ON skills (category);
```

**Supabase table: `user_skills`** (which skills a user has active)

```sql
CREATE TABLE user_skills (
  user_id UUID REFERENCES users(id),
  skill_id UUID REFERENCES skills(id),
  enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',       -- user-specific skill config
  installed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, skill_id)
);
```

### Skill Document Format

Skills are markdown with frontmatter. This keeps them human-readable, AI-readable, and easy to author.

```markdown
---
slug: gmail
name: Gmail
description: Read, search, send, and manage email via Gmail API
category: integration
requires_integrations: [gmail]
version: 3
---

# Gmail Skill

You can help the user manage their Gmail inbox.

## Capabilities

- **Read emails**: Fetch inbox, specific threads, or search results
- **Send email**: Compose and send new emails or replies
- **Search**: Full Gmail search syntax supported
- **Labels**: Apply, remove, create labels
- **Draft**: Save drafts for later

## API Endpoints

All calls go through `/api/integrations/gmail/...`

| Action | Endpoint | Method | Key Params |
|--------|----------|--------|------------|
| List inbox | `/api/integrations/gmail/messages` | GET | `maxResults`, `q`, `labelIds` |
| Get message | `/api/integrations/gmail/messages/:id` | GET | `format=full\|minimal` |
| Send | `/api/integrations/gmail/send` | POST | `to`, `subject`, `body`, `threadId?` |
| Search | `/api/integrations/gmail/messages?q=` | GET | Gmail search query |
| Labels | `/api/integrations/gmail/labels` | GET | — |

## Data Shapes

**Email message:**
```json
{
  "id": "string",
  "threadId": "string",
  "from": { "name": "string", "email": "string" },
  "to": [{ "name": "string", "email": "string" }],
  "subject": "string",
  "snippet": "string",
  "body": "string (HTML or plain)",
  "date": "ISO8601",
  "labels": ["INBOX", "UNREAD"],
  "attachments": [{ "filename": "string", "mimeType": "string", "size": number }]
}
```

## Visualization

When showing emails, use these scene patterns:

- **Inbox list** → `email-list` scene: card per email, sender avatar, subject, snippet, time
- **Single email** → `email-detail` scene: full email with reply action button
- **Compose** → `email-compose` scene: form with to/subject/body fields
- **Search results** → `email-list` scene with search header

### Scene Hints
```json
{
  "email-list": {
    "component": "EmailList",
    "props": ["messages", "selectedId", "onSelect"],
    "layout": "scrollable-cards"
  },
  "email-detail": {
    "component": "EmailDetail",
    "props": ["message", "thread"],
    "layout": "full-panel",
    "actions": ["reply", "forward", "archive", "label"]
  }
}
```

## Example Queries

| User says | You should |
|-----------|-----------|
| "Check my email" | Fetch last 10 inbox messages, show email-list scene |
| "Any emails from Sarah?" | Search `from:sarah`, show results |
| "Send an email to john@..." | Use email-compose scene, confirm before sending |
| "Summarize my unread emails" | Fetch unread, summarize each, show as briefing |

## Important Notes

- Always confirm before sending emails
- When showing email content, strip excessive HTML formatting
- Group emails by thread when showing conversations
- Respect user's label organization
```

### Skill Selection Algorithm

Not all skills are loaded every request. The system selects relevant skills:

```
function selectSkills(user, message):
  // 1. Always-on skills (core OS capabilities)
  selected = getAlwaysOnSkills()  // ~2-3 skills: core-os, scene-rendering

  // 2. Get user's enabled skills that match their active integrations
  candidates = getUserActiveSkills(user.id)

  // 3. If message is short/ambiguous, include top skills by usage frequency
  if isAmbiguous(message):
    selected += getTopSkillsByUserUsage(user.id, limit=3)
    return selected

  // 4. Semantic match: embed the message, find closest skills
  messageEmbedding = embed(message)
  ranked = vectorSearch(candidates, messageEmbedding, limit=5)

  // 5. Keyword boost: if message contains "email"/"gmail", boost gmail skill
  for skill in candidates:
    if keywordMatch(message, skill.tags + skill.name):
      ranked.boost(skill, +0.3)

  // 6. Take top N that fit in budget
  selected += ranked.take(4)
  return selected
```

**Token budget for skills: ~4,000 tokens** (out of ~12,000 total context budget for system prompt)

### Skill Versioning

Skills table has a `version` integer. When a skill is updated:
1. Version increments
2. Old version content is archived in `skill_versions` table
3. Users on the old version continue working until they refresh
4. Marketplace skills can pin to a version

```sql
CREATE TABLE skill_versions (
  skill_id UUID REFERENCES skills(id),
  version INT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (skill_id, version)
);
```

---

## 2. User Knowledge Graph

The knowledge graph stores everything the AI knows about a user. It's a combination of structured tables and a flexible key-value entity store.

### Database Schema

```sql
-- Core user profile (extends auth.users)
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  company TEXT,
  role TEXT,                          -- "CEO", "Developer", etc.
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en-US',
  voice_preference TEXT DEFAULT 'natural', -- TTS voice
  theme TEXT DEFAULT 'auto',
  onboarding_completed BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',     -- catch-all for UI/behavior prefs
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Connected integrations
CREATE TABLE user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,             -- 'gmail', 'google-calendar', 'tiktok-shop'
  status TEXT DEFAULT 'active',       -- 'active', 'expired', 'revoked', 'error'
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  account_email TEXT,                 -- which account is connected
  metadata JSONB DEFAULT '{}',        -- provider-specific config
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_integrations_user ON user_integrations (user_id);

-- Entities: people, projects, companies the user interacts with
CREATE TABLE user_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,          -- 'person', 'project', 'company', 'product', 'place'
  name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',        -- flexible: email, phone, role, notes, etc.
  embedding VECTOR(1536),
  mention_count INT DEFAULT 1,
  last_mentioned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_entities_user ON user_entities (user_id, entity_type);
CREATE INDEX idx_user_entities_embedding ON user_entities USING ivfflat (embedding vector_cosine_ops);
```

### Knowledge Graph Assembly (per request)

```
function buildUserContext(user):
  profile = getUserProfile(user.id)

  integrations = getUserIntegrations(user.id)
    .filter(i => i.status == 'active')
    .map(i => { provider: i.provider, account: i.account_email })

  return """
  ## User Profile
  Name: ${profile.display_name}
  Company: ${profile.company} | Role: ${profile.role}
  Timezone: ${profile.timezone}
  Preferences: ${JSON.stringify(profile.preferences)}

  ## Connected Integrations
  ${integrations.map(i => `- ${i.provider} (${i.account})`).join('\n')}
  """
```

**Token budget: ~500 tokens**

### Entity Learning

After each conversation, a background job extracts entities:

1. Parse the conversation for names, companies, projects
2. Upsert into `user_entities` (increment `mention_count`, update `last_mentioned_at`)
3. Embed entity names + metadata for semantic recall
4. Entities with high mention counts surface automatically in context

---

## 3. Memory System

Three tiers, inspired by human memory.

### Tier 1: Short-Term (Conversation Context)

- **Where:** In-memory on the server during a session; persisted to `conversations` table
- **What:** Current conversation messages, tool call results, scene state
- **Lifetime:** Current session. Summarized on session end.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  summary TEXT,                       -- AI-generated summary on session end
  summary_embedding VECTOR(1536),
  message_count INT DEFAULT 0
);

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  role TEXT NOT NULL,                 -- 'user', 'assistant', 'system', 'tool'
  content TEXT NOT NULL,
  tool_calls JSONB,
  scene_state JSONB,                  -- what scene was rendered
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tier 2: Medium-Term (Recent Activity)

- **Where:** `user_activity` table
- **What:** Daily summaries, recent patterns, active projects
- **Lifetime:** Rolling 30 days at full fidelity; compressed beyond that

```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  summary TEXT NOT NULL,              -- AI-generated daily summary
  embedding VECTOR(1536),
  key_facts TEXT[],                   -- extracted facts: ["Had meeting with Sarah about Q2", ...]
  integrations_used TEXT[],           -- which integrations were active
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, date)
);
```

### Tier 3: Long-Term (Persistent Knowledge)

- **Where:** `user_memories` table
- **What:** Preferences, important facts, relationships, decisions
- **Lifetime:** Indefinite. Periodically pruned/merged.

```sql
CREATE TABLE user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  category TEXT NOT NULL,             -- 'preference', 'fact', 'relationship', 'decision', 'instruction'
  content TEXT NOT NULL,              -- "User prefers morning briefings at 8am"
  importance FLOAT DEFAULT 0.5,       -- 0-1, decays over time if not reinforced
  embedding VECTOR(1536),
  source TEXT,                        -- 'explicit' (user said "remember this"), 'inferred', 'onboarding'
  reinforcement_count INT DEFAULT 1,  -- how many times this has been confirmed
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_memories_user ON user_memories (user_id, category);
CREATE INDEX idx_user_memories_embedding ON user_memories USING ivfflat (embedding vector_cosine_ops);
```

### Memory Recall Algorithm

```
function recallMemories(user, message):
  // 1. Always load: top 10 long-term memories by importance
  coreMemories = getTopMemories(user.id, orderBy='importance', limit=10)

  // 2. Semantic search for relevant memories
  embedding = embed(message)
  relevantMemories = vectorSearch(user_memories, embedding, user_id=user.id, limit=5)
  relevantActivity = vectorSearch(user_activity, embedding, user_id=user.id, limit=3)

  // 3. Recent conversation summaries (last 3)
  recentConversations = getRecentConversations(user.id, limit=3)

  // 4. Relevant entities
  relevantEntities = vectorSearch(user_entities, embedding, user_id=user.id, limit=5)

  // 5. Deduplicate and format
  return formatMemoryBlock(coreMemories, relevantMemories, relevantActivity,
                           recentConversations, relevantEntities)
```

**Token budget: ~3,000 tokens**

### Memory Write Pipeline

After each conversation turn:

1. **Explicit memories:** If user says "remember that..." → write to `user_memories` with source='explicit', importance=0.9
2. **Implicit extraction (async):** Background job analyzes conversation for facts, preferences, entities → lower importance (0.3-0.6)
3. **End-of-session summary:** Summarize conversation → write to `user_activity`
4. **Importance decay:** Weekly job decays importance by 0.05 for memories not accessed. Memories below 0.1 are archived.
5. **Reinforcement:** If a memory is recalled and the user confirms/uses it, increment `reinforcement_count` and boost importance.

---

## 4. Document System

### Storage

User documents live in Supabase Storage (files) + metadata in Postgres.

```sql
CREATE TABLE user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL,             -- 'note', 'file', 'bookmark', 'saved-search', 'spreadsheet'
  content TEXT,                       -- for notes/text content, stored directly
  storage_path TEXT,                  -- for uploaded files: path in Supabase Storage
  mime_type TEXT,
  file_size_bytes BIGINT,
  extracted_text TEXT,                -- text extracted from PDFs, images (OCR), etc.
  embedding VECTOR(1536),            -- embedding of title + content/extracted_text
  tags TEXT[],
  folder_path TEXT DEFAULT '/',       -- virtual folder structure
  metadata JSONB DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_documents_user ON user_documents (user_id);
CREATE INDEX idx_user_documents_embedding ON user_documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_user_documents_folder ON user_documents (user_id, folder_path);
```

### Document Processing Pipeline

1. **Upload:** File goes to Supabase Storage. Metadata row created.
2. **Extract:** Background job extracts text (PDF → text, image → OCR, CSV → structured)
3. **Embed:** Extracted text is chunked and embedded. Primary embedding on title + first 500 chars.
4. **Index:** Document is now searchable via semantic search and keyword.

### AI Access to Documents

The AI accesses documents via tools:

- `search_documents(query)` → semantic search across user's docs
- `read_document(id)` → fetch full content
- `create_document(title, content, type)` → save new note/document
- `update_document(id, content)` → edit existing

Documents are NOT included in the system prompt by default. They're fetched on-demand via tool calls, or a few highly relevant ones are included if the semantic search scores very high against the current message.

---

## 5. Dynamic Prompt Assembly

This is the heart of the system. Every API request to the LLM builds a custom system prompt.

### Token Budget (assuming 16K context, 128K available for larger models)

| Section | Budget | Priority | Always? |
|---------|--------|----------|---------|
| Core Identity | 500 | P0 | Yes |
| User Profile | 500 | P0 | Yes |
| Active Skills | 4,000 | P1 | Selected |
| Memory Block | 3,000 | P1 | Selected |
| Current Scene State | 500 | P1 | If scene active |
| Relevant Documents | 1,500 | P2 | If relevant |
| Workflow Context | 500 | P2 | If active |
| **Total System** | **~10,500** | | |
| Conversation History | 4,000 | P0 | Sliding window |
| User Message | 1,500 | P0 | Yes |

### Assembly Pseudocode

```
function assemblePrompt(user, message, conversationHistory):
  budget = TokenBudget(maxTokens=12000)

  // === P0: Always included ===
  coreIdentity = loadCoreIdentity()  // Who is WHUT, how to respond, scene system basics
  budget.add(coreIdentity, priority=0)

  userContext = buildUserContext(user)  // Profile + integrations
  budget.add(userContext, priority=0)

  // === P1: Selected by relevance ===
  skills = selectSkills(user, message)
  for skill in skills:
    budget.add(skill.content, priority=1, label=skill.slug)

  memories = recallMemories(user, message)
  budget.add(memories, priority=1)

  if currentScene:
    budget.add(formatSceneState(currentScene), priority=1)

  // === P2: If space remains ===
  relevantDocs = searchDocuments(user, message, limit=3)
  for doc in relevantDocs:
    budget.add(doc.summary, priority=2, label=doc.title)

  activeWorkflows = getActiveWorkflows(user)
  if activeWorkflows.length > 0:
    budget.add(formatWorkflows(activeWorkflows), priority=2)

  // === Compile ===
  systemPrompt = budget.compile()  // Drops P2 first, then truncates P1, never drops P0

  return {
    system: systemPrompt,
    messages: trimConversationHistory(conversationHistory, maxTokens=4000) + [userMessage]
  }
```

### Core Identity Block (always loaded)

```markdown
# WHUT OS

You are WHUT, a voice-first AI operating system. You help users manage their
digital life through natural conversation and visual scenes.

## Response Rules
- Be concise for voice (users are listening, not reading)
- Always render a scene when showing data — never dump raw JSON/text
- Confirm destructive actions (sending emails, deleting things)
- Use the user's timezone for all dates/times
- You learn and adapt — reference memories when relevant

## Scene System
You render visual output by returning scene descriptors in your response.
Use the `render_scene` tool to display data visually.

Scenes: email-list, email-detail, calendar-day, calendar-week, dashboard,
tiktok-analytics, document-editor, file-browser, settings, briefing, ...

Each skill describes which scenes to use and when.

## Available Tools
[dynamically inserted based on active skills]
```

---

## 6. Workflow / Automation System

### Storage

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,                   -- AI-generated description
  trigger_type TEXT NOT NULL,         -- 'schedule', 'event', 'manual', 'webhook'
  trigger_config JSONB NOT NULL,      -- cron expression, event filter, etc.
  steps JSONB NOT NULL,               -- ordered list of actions
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  status TEXT DEFAULT 'running',      -- 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result JSONB,
  error TEXT
);
```

### Workflow Definition Format

```json
{
  "name": "Morning Briefing",
  "trigger_type": "schedule",
  "trigger_config": {
    "cron": "0 8 * * 1-5",
    "timezone": "America/New_York"
  },
  "steps": [
    {
      "id": "emails",
      "skill": "gmail",
      "action": "fetch_unread",
      "params": { "maxResults": 10 }
    },
    {
      "id": "calendar",
      "skill": "google-calendar",
      "action": "today_events",
      "params": {}
    },
    {
      "id": "tiktok",
      "skill": "tiktok-shop",
      "action": "daily_summary",
      "params": { "period": "yesterday" }
    },
    {
      "id": "render",
      "action": "render_scene",
      "params": {
        "scene": "briefing",
        "data": { "emails": "$emails", "calendar": "$calendar", "tiktok": "$tiktok" }
      }
    },
    {
      "id": "notify",
      "action": "push_notification",
      "params": {
        "title": "Your morning briefing is ready",
        "body": "Tap to view"
      }
    }
  ]
}
```

### Workflow Creation

Users create workflows conversationally:

> User: "Every morning at 8, show me my emails and calendar"
> AI: Creates workflow, confirms with user, saves to DB

The AI generates the workflow JSON from natural language. Users can also edit workflows in a visual editor (future).

### Execution Engine

- **Scheduled workflows:** A Supabase Edge Function or Vercel Cron job runs every minute, checks for due workflows, executes them.
- **Event workflows:** Integration webhooks (e.g., new email) trigger matching workflows via a Supabase trigger or API route.
- **Manual workflows:** User says "run my morning briefing" → AI looks up the workflow and executes it.

---

## 7. Marketplace / Extensibility

### Skill Marketplace

```sql
CREATE TABLE marketplace_listings (
  skill_id UUID REFERENCES skills(id) PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id),
  listing_name TEXT NOT NULL,
  listing_description TEXT NOT NULL,
  listing_icon_url TEXT,
  screenshots TEXT[],                 -- URLs to screenshot images
  price_cents INT DEFAULT 0,
  revenue_share FLOAT DEFAULT 0.7,    -- 70% to author, 30% to platform
  review_score FLOAT,
  review_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending',      -- 'pending', 'approved', 'rejected', 'suspended'
  published_at TIMESTAMPTZ
);

CREATE TABLE skill_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id),
  user_id UUID REFERENCES auth.users(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE skill_purchases (
  user_id UUID REFERENCES auth.users(id),
  skill_id UUID REFERENCES skills(id),
  purchased_at TIMESTAMPTZ DEFAULT now(),
  amount_cents INT,
  PRIMARY KEY (user_id, skill_id)
);
```

### Skill SDK (for developers)

Developers create skills by writing a markdown file + optional scene components.

**Skill package structure:**
```
my-custom-skill/
├── SKILL.md              # The skill document (required)
├── manifest.json         # Metadata, pricing, dependencies (required)
├── scenes/               # Custom React components for rendering (optional)
│   ├── MyWidget.tsx
│   └── MyChart.tsx
└── README.md             # Marketplace listing description
```

**manifest.json:**
```json
{
  "slug": "crypto-portfolio",
  "name": "Crypto Portfolio Tracker",
  "version": "1.0.0",
  "description": "Track your crypto portfolio with real-time prices",
  "category": "finance",
  "requires_integrations": [],
  "defines_tools": [
    {
      "name": "get_crypto_prices",
      "description": "Fetch current prices for cryptocurrencies",
      "parameters": {
        "symbols": { "type": "array", "items": { "type": "string" } }
      },
      "endpoint": "https://api.coingecko.com/...",
      "auth": "none"
    }
  ],
  "defines_scenes": ["crypto-dashboard", "crypto-chart"],
  "price": 0,
  "tags": ["crypto", "finance", "portfolio"]
}
```

### Scene Component Registration

Custom skills can register new scene types. Scene components are React components uploaded to a CDN or bundled via the marketplace pipeline.

The scene renderer dynamically loads registered components:

```
sceneRegistry = {
  'email-list': EmailListComponent,       // built-in
  'crypto-dashboard': lazy(() => import(remoteCDNUrl))  // marketplace
}
```

Using React `lazy` + Suspense for dynamic loading of marketplace scene components.

### Revenue Model

| Tier | Price | Platform Cut |
|------|-------|-------------|
| Free skills | $0 | — |
| Premium skills | $1-50 one-time | 30% |
| Subscription skills | $1-10/mo | 30% |
| Enterprise skills | Custom | Negotiated |

---

## 8. Integration with Scene Rendering Engine

The existing scene system works like this:
1. AI decides what to show
2. Returns a scene descriptor (component name + props)
3. Frontend renders the component

### Enhanced Scene Protocol

Skills declare which scenes they can trigger. The AI uses the `render_scene` tool:

```json
{
  "tool": "render_scene",
  "params": {
    "scene": "email-list",
    "props": {
      "messages": [...],
      "title": "Unread Emails",
      "actions": ["archive", "reply"]
    },
    "layout": "main",
    "transition": "slide-up"
  }
}
```

The frontend scene renderer:
1. Looks up the component in the scene registry
2. Passes props
3. Renders in the appropriate layout slot (main, sidebar, overlay, toast)
4. Handles user interactions (clicks, selections) → sends back to AI as tool results

### Multi-Scene Composition

For dashboards/briefings, the AI can compose multiple scenes:

```json
{
  "tool": "render_scene",
  "params": {
    "scene": "dashboard",
    "props": {
      "panels": [
        { "scene": "email-list", "props": {...}, "size": "half" },
        { "scene": "calendar-day", "props": {...}, "size": "half" },
        { "scene": "tiktok-summary", "props": {...}, "size": "full" }
      ]
    }
  }
}
```

---

## 9. API Design for the Knowledge Layer

All knowledge APIs are Next.js API routes under `/api/knowledge/`.

### Endpoints

```
# Skills
GET    /api/knowledge/skills                    # List available skills for user
GET    /api/knowledge/skills/:slug              # Get skill content
POST   /api/knowledge/skills/select             # Select skills for a message (internal)
POST   /api/knowledge/skills/install            # Install marketplace skill
DELETE /api/knowledge/skills/uninstall/:id       # Uninstall skill

# Memory
GET    /api/knowledge/memory                    # Get user's memories (paginated)
POST   /api/knowledge/memory                    # Create explicit memory
POST   /api/knowledge/memory/recall             # Semantic recall for a query
DELETE /api/knowledge/memory/:id                # Forget a memory

# Documents
GET    /api/knowledge/documents                 # List user documents
POST   /api/knowledge/documents                 # Create/upload document
GET    /api/knowledge/documents/:id             # Read document
PUT    /api/knowledge/documents/:id             # Update document
DELETE /api/knowledge/documents/:id             # Delete document
POST   /api/knowledge/documents/search          # Semantic search

# Entities
GET    /api/knowledge/entities                  # List user's entities
POST   /api/knowledge/entities/search           # Search entities

# Prompt Assembly (internal, used by chat API)
POST   /api/knowledge/assemble                  # Build prompt for a request

# Workflows
GET    /api/knowledge/workflows                 # List user workflows
POST   /api/knowledge/workflows                 # Create workflow
PUT    /api/knowledge/workflows/:id             # Update workflow
DELETE /api/knowledge/workflows/:id             # Delete workflow
POST   /api/knowledge/workflows/:id/run         # Manually trigger workflow
```

### Internal Prompt Assembly API

Called by the main chat endpoint before every LLM call:

```
POST /api/knowledge/assemble
Body: { userId, message, conversationId, currentScene }
Response: {
  systemPrompt: "...",
  tools: [...],           // tool definitions from active skills
  tokenUsage: { core: 500, skills: 3200, memory: 1800, ... }
}
```

---

## 10. Migration Path from Hardcoded System

### Phase 1: Extract & Separate (Week 1-2)

1. **Extract the monolith prompt** into sections:
   - Core identity → `skills` table, slug='core-os'
   - Each integration's instructions → separate skill documents
   - User-specific info → `user_profiles` table
2. **Create the `skills` table** and seed with extracted skills
3. **Build basic prompt assembly** that just concatenates all skills (no selection yet)
4. **Result:** Same behavior, but skills are in the database

### Phase 2: Dynamic Selection (Week 3-4)

1. **Add embeddings** to skills
2. **Build skill selector** — semantic matching instead of loading all
3. **Add `user_skills` table** — only load skills for connected integrations
4. **Build token budget system**
5. **Result:** Faster, cheaper prompts. Only relevant skills loaded.

### Phase 3: Memory System (Week 5-6)

1. **Add memory tables** (conversations, user_memories, user_activity)
2. **Build memory write pipeline** — extract facts after each conversation
3. **Build memory recall** — semantic search for relevant memories
4. **Add to prompt assembly**
5. **Result:** AI remembers across sessions

### Phase 4: Documents & Entities (Week 7-8)

1. **Add document system** — upload, extract, embed, search
2. **Add entity extraction** — build user's knowledge graph over time
3. **Add document tools** to the AI
4. **Result:** Users can save and retrieve documents

### Phase 5: Workflows & Marketplace (Week 9-12)

1. **Build workflow system** — define, schedule, execute
2. **Build marketplace** — skill authoring, publishing, installation
3. **Build custom scene component loading**
4. **Result:** Full extensibility

---

## 11. Storage Strategy

| Data | Where | Why |
|------|-------|-----|
| Skills (content) | Supabase Postgres | Needs semantic search, versioning, multi-tenant |
| Skill embeddings | Supabase pgvector | Semantic skill selection |
| User profiles | Supabase Postgres | Core data, needs joins |
| User memories | Supabase Postgres + pgvector | Semantic recall |
| Conversation history | Supabase Postgres | Persistence, search |
| Documents (metadata) | Supabase Postgres + pgvector | Search, indexing |
| Documents (files) | Supabase Storage | Binary file storage |
| Workflows | Supabase Postgres | Scheduling, execution tracking |
| OAuth tokens | Supabase Postgres (encrypted) | Security |
| Current scene state | Client-side (React state) | Ephemeral, no persistence needed |
| Conversation draft | localStorage | Survives page refresh |
| Voice preferences | Supabase Postgres (in user_profiles) | Per-user setting |

**Nothing critical in localStorage.** It's only for ephemeral UX state. All knowledge lives in Supabase.

---

## 12. Scale Considerations

### 1 User
- All queries hit Postgres directly. No caching needed.
- Embeddings computed synchronously.
- Single-row lookups are instant.

### 1,000 Users
- Add connection pooling (Supabase already provides this via PgBouncer).
- Background jobs for embedding generation (use Supabase Edge Functions or a queue).
- Cache frequently-accessed skills in memory (they don't change often).

### 100,000 Users
- **Skill content caching:** Skills are shared across users. Cache in Redis/Vercel KV. Invalidate on version bump.
- **Embedding search:** pgvector handles this well up to millions of rows with IVFFlat indexes. Beyond that, consider a dedicated vector DB (Pinecone, Qdrant).
- **Prompt assembly:** This is the hot path. Optimize by pre-computing user context blocks and invalidating on profile change.
- **Memory tables:** Partition by user_id. Add composite indexes.
- **Document processing:** Queue-based. Use Supabase Edge Functions or a worker service for PDF extraction, OCR, embedding.
- **Workflow execution:** Distributed cron. Use a proper job queue (BullMQ, Inngest, or Trigger.dev) instead of checking every minute.

### Key Indexes (already defined above, but summarized)

```sql
-- All vector columns: IVFFlat index for approximate nearest neighbor
-- All user_id foreign keys: B-tree index
-- skills.slug: unique B-tree
-- user_documents(user_id, folder_path): composite B-tree
-- user_memories(user_id, category): composite B-tree
-- user_activity(user_id, date): unique composite
```

---

## Summary

The WHUT OS knowledge system is built on four pillars:

1. **Skills as documents** — Markdown files in the database that teach the AI new capabilities. Semantically selected per-request.
2. **Tiered memory** — Short/medium/long-term memory in Postgres with vector search for recall. The AI gets smarter with every conversation.
3. **Dynamic prompt assembly** — A budget-aware engine that composes the perfect system prompt for each request from skills + memory + user context + documents.
4. **Extensible by design** — Marketplace skills, custom scenes, user workflows. The platform grows with its ecosystem.

The migration is incremental: extract the monolith prompt into skills first (zero behavior change), then add intelligence layer by layer.
