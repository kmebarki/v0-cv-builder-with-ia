-- Insert sample CV templates with basic structures
-- These are placeholder structures that will be used by Craft.js

-- Modern Professional Template
INSERT INTO cv_templates (
  name,
  description,
  thumbnail_url,
  template_type,
  is_premium,
  is_active,
  template_structure
) VALUES (
  'Modern Professionnel',
  'Un template moderne et épuré, parfait pour les professionnels de tous secteurs',
  '/placeholder.svg?height=800&width=600',
  'modern',
  false,
  true,
  '{
    "ROOT": {
      "type": "Container",
      "nodes": ["header", "summary", "experience", "education", "skills"],
      "props": {}
    }
  }'::jsonb
),
(
  'Créatif Designer',
  'Template coloré et créatif pour designers et artistes',
  '/placeholder.svg?height=800&width=600',
  'creative',
  false,
  true,
  '{
    "ROOT": {
      "type": "Container",
      "nodes": ["header", "portfolio", "experience", "skills"],
      "props": {}
    }
  }'::jsonb
),
(
  'Minimaliste',
  'Design minimaliste et élégant pour un CV sobre et professionnel',
  '/placeholder.svg?height=800&width=600',
  'minimal',
  false,
  true,
  '{
    "ROOT": {
      "type": "Container",
      "nodes": ["header", "summary", "experience", "education"],
      "props": {}
    }
  }'::jsonb
),
(
  'Tech Developer',
  'Template optimisé pour développeurs et ingénieurs',
  '/placeholder.svg?height=800&width=600',
  'professional',
  false,
  true,
  '{
    "ROOT": {
      "type": "Container",
      "nodes": ["header", "skills", "experience", "projects", "education"],
      "props": {}
    }
  }'::jsonb
),
(
  'Executive Premium',
  'Template premium pour cadres et dirigeants',
  '/placeholder.svg?height=800&width=600',
  'professional',
  true,
  true,
  '{
    "ROOT": {
      "type": "Container",
      "nodes": ["header", "summary", "experience", "education", "achievements"],
      "props": {}
    }
  }'::jsonb
),
(
  'Classique Élégant',
  'Template classique et intemporel',
  '/placeholder.svg?height=800&width=600',
  'classic',
  false,
  true,
  '{
    "ROOT": {
      "type": "Container",
      "nodes": ["header", "summary", "experience", "education", "skills"],
      "props": {}
    }
  }'::jsonb
);

-- Get template IDs for mapping
DO $$
DECLARE
  modern_id UUID;
  creative_id UUID;
  minimal_id UUID;
  tech_id UUID;
  executive_id UUID;
  classic_id UUID;
  
  prof_cat_id UUID;
  creative_cat_id UUID;
  tech_cat_id UUID;
  
  modern_tag_id UUID;
  minimal_tag_id UUID;
  colorful_tag_id UUID;
  elegant_tag_id UUID;
  simple_tag_id UUID;
  creative_tag_id UUID;
  corporate_tag_id UUID;
  tech_tag_id UUID;
BEGIN
  -- Get template IDs
  SELECT id INTO modern_id FROM cv_templates WHERE name = 'Modern Professionnel';
  SELECT id INTO creative_id FROM cv_templates WHERE name = 'Créatif Designer';
  SELECT id INTO minimal_id FROM cv_templates WHERE name = 'Minimaliste';
  SELECT id INTO tech_id FROM cv_templates WHERE name = 'Tech Developer';
  SELECT id INTO executive_id FROM cv_templates WHERE name = 'Executive Premium';
  SELECT id INTO classic_id FROM cv_templates WHERE name = 'Classique Élégant';
  
  -- Get category IDs
  SELECT id INTO prof_cat_id FROM cv_template_categories WHERE name = 'Professionnel';
  SELECT id INTO creative_cat_id FROM cv_template_categories WHERE name = 'Créatif';
  SELECT id INTO tech_cat_id FROM cv_template_categories WHERE name = 'Technique';
  
  -- Get tag IDs
  SELECT id INTO modern_tag_id FROM cv_template_tags WHERE name = 'Moderne';
  SELECT id INTO minimal_tag_id FROM cv_template_tags WHERE name = 'Minimaliste';
  SELECT id INTO colorful_tag_id FROM cv_template_tags WHERE name = 'Coloré';
  SELECT id INTO elegant_tag_id FROM cv_template_tags WHERE name = 'Élégant';
  SELECT id INTO simple_tag_id FROM cv_template_tags WHERE name = 'Simple';
  SELECT id INTO creative_tag_id FROM cv_template_tags WHERE name = 'Créatif';
  SELECT id INTO corporate_tag_id FROM cv_template_tags WHERE name = 'Corporate';
  SELECT id INTO tech_tag_id FROM cv_template_tags WHERE name = 'Tech';
  
  -- Map templates to categories
  INSERT INTO template_category_mapping (template_id, category_id) VALUES
    (modern_id, prof_cat_id),
    (creative_id, creative_cat_id),
    (minimal_id, prof_cat_id),
    (tech_id, tech_cat_id),
    (executive_id, prof_cat_id),
    (classic_id, prof_cat_id);
  
  -- Map templates to tags
  INSERT INTO template_tag_mapping (template_id, tag_id) VALUES
    (modern_id, modern_tag_id),
    (modern_id, elegant_tag_id),
    (creative_id, creative_tag_id),
    (creative_id, colorful_tag_id),
    (minimal_id, minimal_tag_id),
    (minimal_id, simple_tag_id),
    (tech_id, tech_tag_id),
    (tech_id, modern_tag_id),
    (executive_id, elegant_tag_id),
    (executive_id, corporate_tag_id),
    (classic_id, elegant_tag_id),
    (classic_id, simple_tag_id);
END $$;
