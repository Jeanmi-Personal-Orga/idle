import { Router } from 'express';
import { pool } from '../db';
import { hashPassword, requireAuth, signToken, verifyPassword } from '../auth';
import { loginSchema, registerSchema } from '../validation';

export const authRouter = Router();

interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
}

function publicUser(row: Pick<UserRow, 'id' | 'username' | 'email'>) {
  return { id: row.id, username: row.username, email: row.email };
}

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide.' });
    return;
  }
  const { username, email, password } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, passwordHash],
    );
    const user = publicUser(result.rows[0]);
    const token = signToken({ userId: user.id });
    res.status(201).json({ token, user });
  } catch (err) {
    // Code 23505 : violation de contrainte unique (username ou email déjà pris).
    // On s'appuie sur la contrainte plutôt que sur une requête préalable pour
    // éviter une fenêtre de course entre la vérification et l'insertion.
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: 'Ce nom d\'utilisateur ou cet email est déjà utilisé.' });
      return;
    }
    console.error('Erreur lors de l\'inscription :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide.' });
    return;
  }
  const { email, password } = parsed.data;

  try {
    const result = await pool.query<UserRow>(
      'SELECT id, username, email, password_hash FROM users WHERE email = $1',
      [email],
    );
    const row = result.rows[0];

    // Message générique dans les deux cas (email inconnu / mot de passe faux) :
    // ne pas révéler laquelle des deux raisons a échoué.
    if (!row) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }

    const valid = await verifyPassword(password, row.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }

    const user = publicUser(row);
    const token = signToken({ userId: user.id });
    res.status(200).json({ token, user });
  } catch (err) {
    console.error('Erreur lors de la connexion :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query<UserRow>(
      'SELECT id, username, email FROM users WHERE id = $1',
      [req.userId],
    );
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }
    res.status(200).json({ user: publicUser(row) });
  } catch (err) {
    console.error('Erreur lors de la lecture du profil :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505';
}
