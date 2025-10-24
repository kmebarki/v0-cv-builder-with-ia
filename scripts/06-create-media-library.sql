-- Media Library (managed by admin, shared across all users)
CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'logo', 'icon', 'photo')),
  file_url TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  mime_type TEXT,
  
  -- Metadata
  alt_text TEXT,
  description TEXT,
  tags TEXT[], -- Array of tags for searching
  
  -- Storage info (Supabase Storage)
  storage_bucket TEXT DEFAULT 'media-library',
  storage_path TEXT NOT NULL,
  
  -- Organization
  category TEXT,
  is_public BOOLEAN DEFAULT true,
  
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_library_type ON media_library(file_type);
CREATE INDEX IF NOT EXISTS idx_media_library_tags ON media_library USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_library_category ON media_library(category);

-- RLS Policies
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- Everyone can view public media
CREATE POLICY "Anyone can view public media"
  ON media_library FOR SELECT
  USING (is_public = true);

-- Only admins can manage media library
CREATE POLICY "Admins can manage media library"
  ON media_library FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
