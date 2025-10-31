-- CV Template Categories
CREATE TABLE IF NOT EXISTS cv_template_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CV Template Tags
CREATE TABLE IF NOT EXISTS cv_template_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT, -- Hex color for tag display
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CV Templates
CREATE TABLE IF NOT EXISTS cv_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  preview_url TEXT,
  
  -- Template structure (Craft.js JSON)
  template_structure JSONB NOT NULL,
  
  -- Template metadata
  template_type TEXT CHECK (template_type IN ('modern', 'classic', 'creative', 'minimal', 'professional')),
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Usage stats
  usage_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template-Category mapping (many-to-many)
CREATE TABLE IF NOT EXISTS template_category_mapping (
  template_id UUID REFERENCES cv_templates(id) ON DELETE CASCADE,
  category_id UUID REFERENCES cv_template_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (template_id, category_id)
);

-- Template-Tag mapping (many-to-many)
CREATE TABLE IF NOT EXISTS template_tag_mapping (
  template_id UUID REFERENCES cv_templates(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES cv_template_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (template_id, tag_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cv_templates_type ON cv_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_cv_templates_active ON cv_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_cv_templates_usage ON cv_templates(usage_count DESC);

-- RLS Policies
ALTER TABLE cv_template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_template_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_category_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tag_mapping ENABLE ROW LEVEL SECURITY;

-- Everyone can view active templates and their metadata
CREATE POLICY "Anyone can view active categories"
  ON cv_template_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view tags"
  ON cv_template_tags FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view active templates"
  ON cv_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view template categories"
  ON template_category_mapping FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view template tags"
  ON template_tag_mapping FOR SELECT
  USING (true);

-- Only admins can manage templates
CREATE POLICY "Admins can manage categories"
  ON cv_template_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage tags"
  ON cv_template_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage templates"
  ON cv_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage template categories mapping"
  ON template_category_mapping FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage template tags mapping"
  ON template_tag_mapping FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
