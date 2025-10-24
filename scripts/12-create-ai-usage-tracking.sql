-- Track AI usage for analytics and rate limiting
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'generate', 'improve', 'rephrase', 'translate', 'keywords', 'extract'
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying user's AI usage
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);

-- RLS policies
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own AI usage
CREATE POLICY "Users can view own AI usage"
  ON ai_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert AI usage records
CREATE POLICY "System can insert AI usage"
  ON ai_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to get user's AI usage stats
CREATE OR REPLACE FUNCTION get_user_ai_usage_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_operations BIGINT,
  total_tokens BIGINT,
  operations_by_type JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_operations,
    COALESCE(SUM(tokens_used), 0)::BIGINT as total_tokens,
    jsonb_object_agg(
      operation_type,
      COUNT(*)
    ) as operations_by_type
  FROM ai_usage
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
