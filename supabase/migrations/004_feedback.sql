-- Feedback system for WHUT OS — personal RLHF loop

CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_query TEXT,
  ai_response_summary TEXT,
  visualization_type TEXT,
  screenshot_url TEXT,
  feedback_text TEXT,
  rating TEXT CHECK (rating IN ('up', 'down')),
  distilled BOOLEAN DEFAULT false
);

CREATE INDEX idx_feedback_user ON public.feedback(user_id, created_at DESC);
CREATE INDEX idx_feedback_viz_type ON public.feedback(visualization_type);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Design preferences summary (distilled from feedback)
CREATE TABLE public.design_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  feedback_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.design_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own prefs" ON public.design_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own prefs" ON public.design_preferences FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for screenshots (create via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-screenshots', 'feedback-screenshots', true);
