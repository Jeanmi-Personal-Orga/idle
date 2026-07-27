import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { pool } from './db';
import { authRouter } from './routes/auth';
import { saveRouter } from './routes/save';

const app = express();

// Permissif pour l'instant : il n'y a pas encore d'origine de production
// définie pour le front. À restreindre à l'origine réelle avant toute mise
// en production (ex. cors({ origin: 'https://alchimiste-de-brume.example' })).
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/save', saveRouter);

// SELECT 1 confirme que la base répond vraiment, pas juste que le process tourne.
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

async function ensureSchema(): Promise<void> {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);
}

async function main(): Promise<void> {
  await ensureSchema();
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => {
    console.log(`API d'authentification à l'écoute sur le port ${port}`);
  });
}

main().catch((err) => {
  console.error('Échec du démarrage :', err);
  process.exit(1);
});
