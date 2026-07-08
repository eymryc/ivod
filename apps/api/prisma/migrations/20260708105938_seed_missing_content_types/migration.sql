-- Ajoute les types de contenu manquants (Documentaire, Animation, Court métrage) —
-- présents dans le code (formulaires, filtres rails) depuis longtemps mais jamais
-- insérés en base. Idempotent : ne fait rien si le code existe déjà.
INSERT INTO ref_content_types (id, code, "typeCode", label)
VALUES
  (gen_random_uuid()::text, 'DOCUMENTAIRE', 'DOCUMENTAIRE', 'Documentaire'),
  (gen_random_uuid()::text, 'ANIMATION', 'ANIMATION', 'Animation'),
  (gen_random_uuid()::text, 'SHORT', 'SHORT', 'Court métrage')
ON CONFLICT (code) DO NOTHING;
