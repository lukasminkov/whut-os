# WHUT OS — Supabase Migration Plan

## New Supabase Project
Create a new Supabase project for WHUT OS (don't reuse BrandPushers).

## Database Schema

### 1. users (extends Supabase auth.users)
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  company TEXT,
  role TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
```

### 2. integrations (OAuth tokens — server-side, encrypted)
```sql
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- 'google', 'tiktok'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  account_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own integrations" ON public.integrations FOR ALL USING (auth.uid() = user_id);
```

### 3. conversations (persistent chat history)
```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  summary TEXT,
  message_count INT DEFAULT 0
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'user', 'assistant'
  content TEXT NOT NULL,
  cards_json JSONB,  -- what cards were rendered
  tool_calls JSONB,  -- what tools were used
  model TEXT,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own messages" ON public.messages FOR ALL 
  USING (conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()));
```

### 4. memories (AI learning about the user)
```sql
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,  -- 'preference', 'fact', 'relationship', 'instruction'
  content TEXT NOT NULL,
  importance FLOAT DEFAULT 0.5,
  source TEXT DEFAULT 'inferred',  -- 'explicit', 'inferred', 'onboarding'
  reinforcement_count INT DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own memories" ON public.memories FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_memories_user ON public.memories(user_id, category);
CREATE INDEX idx_memories_importance ON public.memories(user_id, importance DESC);
```

### 5. usage (billing-ready tracking)
```sql
CREATE TABLE public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  cost_cents FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own usage" ON public.usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert usage" ON public.usage FOR INSERT WITH CHECK (true);
CREATE INDEX idx_usage_user ON public.usage(user_id, created_at DESC);
```

## Auth Flow
- Replace hardcoded login with Supabase Auth
- Support Google OAuth (reuse existing Google Cloud project) + magic link email
- On sign up → create profile row → start onboarding
- On sign in → load profile, integrations, recent conversation, top memories

## API Changes
Every API route needs to:
1. Verify Supabase JWT from the request
2. Use the user_id from the JWT to query their data
3. Store tokens server-side in `integrations` table
4. Save messages to `messages` table after each AI call
5. Include top memories in the system prompt

## Frontend Changes
- Replace all localStorage reads/writes with Supabase client calls
- Add Supabase Auth UI for login/signup
- Load user profile, conversation, memories on app mount
- Save conversation messages after each AI response

## Memory System
After each AI response, a background job should:
1. Extract facts/preferences from the conversation
2. Check for "remember this" explicit instructions
3. Upsert into memories table
4. Include top 10 memories (by importance) + relevant memories (by keyword match) in every AI call

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  (server-side only, for admin operations)
```
