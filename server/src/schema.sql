-- Un seul modèle pour l'instant : les comptes. Pas de framework de migration,
-- CREATE TABLE IF NOT EXISTS suffit tant qu'il n'y a qu'une table.
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(32) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UNIQUE crée déjà un index ; ceux-ci sont explicites pour que ça reste vrai
-- même si les contraintes changent un jour.
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Un seul emplacement de sauvegarde par compte : user_id est directement la
-- clé primaire, pas besoin d'un id séparé pour ce qu'on ne fera jamais qu'à un
-- exemplaire.
CREATE TABLE IF NOT EXISTS game_saves (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
