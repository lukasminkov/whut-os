-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('integration', 'agent_task', 'calendar', 'email', 'reminder', 'system')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY notifications_delete ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Documents table (for the rich text editor)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content JSONB DEFAULT '{}', -- Tiptap JSON content
  content_text TEXT DEFAULT '', -- Plain text for search
  folder TEXT DEFAULT 'root',
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(user_id, folder);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY documents_insert ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY documents_update ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY documents_delete ON documents FOR DELETE USING (auth.uid() = user_id);

-- Agent tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  steps JSONB DEFAULT '[]',
  current_step_index INTEGER DEFAULT 0,
  context JSONB DEFAULT '{}',
  error TEXT,
  conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id, created_at DESC);
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_tasks_select ON agent_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY agent_tasks_insert ON agent_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY agent_tasks_update ON agent_tasks FOR UPDATE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE agent_tasks;
