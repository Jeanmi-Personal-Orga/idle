import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../auth';

export const saveRouter = Router();

saveRouter.use(requireAuth);

saveRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query<{ data: unknown }>(
      'SELECT data FROM game_saves WHERE user_id = $1',
      [req.userId],
    );
    res.status(200).json({ data: result.rows[0]?.data ?? null });
  } catch (err) {
    console.error('Erreur lors de la lecture de la sauvegarde :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

saveRouter.put('/', async (req, res) => {
  const { data } = req.body as { data?: unknown };
  // Validation volontairement minimale : la forme exacte de l'état de jeu
  // évolue côté front, le serveur ne fait que stocker le blob tel quel.
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    res.status(400).json({ error: 'Le champ data doit être un objet JSON.' });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO game_saves (user_id, data, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()`,
      [req.userId, data],
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erreur lors de l'écriture de la sauvegarde :", err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});
