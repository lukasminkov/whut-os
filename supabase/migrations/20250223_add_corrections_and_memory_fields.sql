-- Corrections table for self-improving error tracking
CREATE TABLE IF NOT EXISTS corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  context TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrections_user_tool ON corrections(user_id, tool_name);

-- Add superseded_by column to memories if not exists
DO $$ BEGIN
  ALTER TABLE memories ADD COLUMN IF NOT EXISTS superseded_by TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Add source column to memories if not exists
DO $$ BEGIN
  ALTER TABLE memories ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'inferred';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Enable RLS on corrections
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections" ON corrections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage corrections" ON corrections
  FOR ALL USING (true) WITH CHECK (true);
