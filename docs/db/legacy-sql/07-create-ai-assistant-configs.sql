-- AI Assistant configurations (per field, configurable by admin)
CREATE TABLE IF NOT EXISTS ai_assistant_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name TEXT NOT NULL UNIQUE, -- e.g., 'professional_summary', 'experience_description'
  field_label TEXT NOT NULL,
  
  -- AI features enabled for this field
  enable_generate BOOLEAN DEFAULT true,
  enable_improve BOOLEAN DEFAULT true,
  enable_rephrase BOOLEAN DEFAULT true,
  enable_autofill BOOLEAN DEFAULT true,
  enable_translate BOOLEAN DEFAULT true,
  enable_keywords BOOLEAN DEFAULT true,
  
  -- AI model configuration
  default_model TEXT DEFAULT 'openai/gpt-4o-mini',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 500,
  
  -- Custom prompts
  generate_prompt TEXT,
  improve_prompt TEXT,
  rephrase_prompt TEXT,
  autofill_prompt TEXT,
  keywords_prompt TEXT,
  
  -- Field-specific settings
  field_context TEXT, -- Additional context for AI
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_configs_active ON ai_assistant_configs(is_active);

-- RLS Policies
ALTER TABLE ai_assistant_configs ENABLE ROW LEVEL SECURITY;

-- Everyone can view active AI configs
CREATE POLICY "Anyone can view active AI configs"
  ON ai_assistant_configs FOR SELECT
  USING (is_active = true);

-- Only admins can manage AI configs
CREATE POLICY "Admins can manage AI configs"
  ON ai_assistant_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
