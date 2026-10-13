-- Recherche sans accents (caisse, boutique, admin) : « meche » doit trouver « Mèche ».
-- Tolérant : si l'extension n'est pas autorisée, le code retombe sur une recherche ILIKE classique.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS unaccent;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Extension unaccent indisponible : %', SQLERRM;
END
$$;
