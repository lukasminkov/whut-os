-- WHUT OS Intelligence Layer Migration
-- Run this in the Supabase SQL Editor

-- Interactions table (for tracking dismissals, rephrases, etc.)
CREATE TABLE IF NOT EXISTS public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'dismiss', 'expand', 'rephrase'
  element_id TEXT,
  element_type TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for interactions" ON public.interactions FOR ALL WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_interactions_type ON public.interactions(type, created_at DESC);
