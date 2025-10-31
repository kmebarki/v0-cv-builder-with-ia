-- Seed initial template categories
INSERT INTO cv_template_categories (name, description, display_order) VALUES
  ('Professionnel', 'Templates professionnels pour tous secteurs', 1),
  ('Créatif', 'Templates créatifs pour designers et artistes', 2),
  ('Technique', 'Templates pour développeurs et ingénieurs', 3),
  ('Académique', 'Templates pour chercheurs et enseignants', 4),
  ('Commercial', 'Templates pour ventes et marketing', 5)
ON CONFLICT (name) DO NOTHING;

-- Seed initial template tags
INSERT INTO cv_template_tags (name, color) VALUES
  ('Moderne', '#3B82F6'),
  ('Minimaliste', '#6B7280'),
  ('Coloré', '#EC4899'),
  ('Élégant', '#8B5CF6'),
  ('Simple', '#10B981'),
  ('Créatif', '#F59E0B'),
  ('Corporate', '#1F2937'),
  ('Tech', '#06B6D4')
ON CONFLICT (name) DO NOTHING;

-- Seed initial AI assistant configs for common fields
INSERT INTO ai_assistant_configs (
  field_name,
  field_label,
  generate_prompt,
  improve_prompt,
  field_context
) VALUES
  (
    'professional_summary',
    'Résumé professionnel',
    'Génère un résumé professionnel convaincant basé sur les informations suivantes : {context}',
    'Améliore ce résumé professionnel pour le rendre plus impactant : {content}',
    'Résumé professionnel de 2-3 phrases mettant en valeur les compétences et expériences clés'
  ),
  (
    'experience_description',
    'Description d''expérience',
    'Génère une description professionnelle pour cette expérience : {context}',
    'Améliore cette description d''expérience en la rendant plus percutante et orientée résultats : {content}',
    'Description des responsabilités et réalisations dans un poste'
  ),
  (
    'education_description',
    'Description de formation',
    'Génère une description pour cette formation : {context}',
    'Améliore cette description de formation : {content}',
    'Description des études et diplômes obtenus'
  ),
  (
    'project_description',
    'Description de projet',
    'Génère une description pour ce projet : {context}',
    'Améliore cette description de projet en mettant en avant les technologies et résultats : {content}',
    'Description d''un projet personnel ou professionnel'
  )
ON CONFLICT (field_name) DO NOTHING;
