import { Pool } from 'pg';

// Pool partagé par toute l'app : pg gère lui-même le nombre de connexions
// ouvertes, pas besoin d'en créer un par requête.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL n'est pas défini (voir .env.example).");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
