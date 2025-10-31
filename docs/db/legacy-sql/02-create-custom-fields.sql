-- Custom fields configurable by admin
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'date', 'number', 'select', 'multiselect', 'url', 'email', 'phone')),
  field_options JSONB, -- For select/multiselect options
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('personal', 'professional', 'education', 'experience', 'skills', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User custom field values
CREATE TABLE IF NOT EXISTS user_custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  field_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, custom_field_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_category ON custom_fields(category);
CREATE INDEX IF NOT EXISTS idx_custom_fields_active ON custom_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_user_custom_fields_user ON user_custom_fields(user_id);

-- RLS Policies
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_fields ENABLE ROW LEVEL SECURITY;

-- Everyone can read active custom fields
CREATE POLICY "Anyone can view active custom fields"
  ON custom_fields FOR SELECT
  USING (is_active = true);

-- Only admins can manage custom fields
CREATE POLICY "Admins can manage custom fields"
  ON custom_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can manage their own custom field values
CREATE POLICY "Users can view own custom field values"
  ON user_custom_fields FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom field values"
  ON user_custom_fields FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom field values"
  ON user_custom_fields FOR UPDATE
  USING (auth.uid() = user_id);
