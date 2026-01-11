-- Corrigir todos os slugs existentes para minúsculas
UPDATE tenants SET slug = LOWER(slug) WHERE slug != LOWER(slug);