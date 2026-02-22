-- WHUT OS — Full Supabase Schema
-- Run this in the Supabase SQL Editor after creating the project.

-- ═══════════════════════════════════════════
-- 1. PROFILES (extends auth.users)
-- ═══════════════════════════════════════════

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

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════
-- 2. INTEGRATIONS (OAuth tokens — server-side)
-- ═══════════════════════════════════════════

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
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
CREATE POLICY "Users can read own integrations" ON public.integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own integrations" ON public.integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own integrations" ON public.integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own integrations" ON public.integrations FOR DELETE USING (auth.uid() = user_id);
-- Service role bypass for API routes (service role key bypasses RLS automatically)

CREATE INDEX idx_integrations_user ON public.integrations(user_id);

-- ═══════════════════════════════════════════
-- 3. CONVERSATIONS & MESSAGES
-- ═══════════════════════════════════════════

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

CREATE INDEX idx_conversations_user ON public.conversations(user_id, last_message_at DESC);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  cards_json JSONB,
  tool_calls JSONB,
  model TEXT,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own messages" ON public.messages FOR ALL
  USING (conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()));

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

-- ═══════════════════════════════════════════
-- 4. MEMORIES
-- ═══════════════════════════════════════════

CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  importance FLOAT DEFAULT 0.5,
  source TEXT DEFAULT 'inferred',
  reinforcement_count INT DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own memories" ON public.memories FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_memories_user ON public.memories(user_id, category);
CREATE INDEX idx_memories_importance ON public.memories(user_id, importance DESC);

-- ═══════════════════════════════════════════
-- 5. USAGE TRACKING
-- ═══════════════════════════════════════════

CREATE TABLE public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  cost_cents FLOAT NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own usage" ON public.usage FOR SELECT USING (auth.uid() = user_id);
-- Service role inserts usage (bypasses RLS)
CREATE POLICY "Allow insert for service" ON public.usage FOR INSERT WITH CHECK (true);

CREATE INDEX idx_usage_user ON public.usage(user_id, created_at DESC);

-- ═══════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════
