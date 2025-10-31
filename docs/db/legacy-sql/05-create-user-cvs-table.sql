-- User CVs (multiple CVs per user)
CREATE TABLE IF NOT EXISTS user_cvs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES cv_templates(id) ON DELETE SET NULL,
  
  -- CV metadata
  cv_name TEXT NOT NULL,
  cv_description TEXT,
  
  -- CV structure (Craft.js JSON with user customizations)
  cv_structure JSONB NOT NULL,
  
  -- CV settings
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  public_url_slug TEXT UNIQUE,
  
  -- Version control
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_exported_at TIMESTAMPTZ
);

-- CV versions history (for undo/redo)
CREATE TABLE IF NOT EXISTS user_cv_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cv_id UUID NOT NULL REFERENCES user_cvs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  cv_structure JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cv_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_cvs_user ON user_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cvs_template ON user_cvs(template_id);
CREATE INDEX IF NOT EXISTS idx_user_cvs_public ON user_cvs(is_public, public_url_slug);
CREATE INDEX IF NOT EXISTS idx_user_cv_versions_cv ON user_cv_versions(cv_id);

-- RLS Policies
ALTER TABLE user_cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cv_versions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own CVs
CREATE POLICY "Users can view own CVs"
  ON user_cvs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CVs"
  ON user_cvs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CVs"
  ON user_cvs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own CVs"
  ON user_cvs FOR DELETE
  USING (auth.uid() = user_id);

-- Public CVs can be viewed by anyone
CREATE POLICY "Anyone can view public CVs"
  ON user_cvs FOR SELECT
  USING (is_public = true);

-- CV versions policies
CREATE POLICY "Users can manage own CV versions"
  ON user_cv_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_cvs
      WHERE user_cvs.id = user_cv_versions.cv_id
      AND user_cvs.user_id = auth.uid()
    )
  );
