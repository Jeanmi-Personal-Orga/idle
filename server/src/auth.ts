import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

const COST_FACTOR = 12;

// Pas de secret par défaut : un secret codé en dur fuiterait avec le dépôt.
// On échoue fort et tôt plutôt que de signer des tokens avec une valeur connue.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET n'est pas défini (voir .env.example).");
  }
  return secret;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface TokenPayload {
  userId: number;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === 'object' && decoded && typeof decoded.userId === 'number') {
      return { userId: decoded.userId };
    }
    return null;
  } catch {
    return null;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }

  req.userId = payload.userId;
  next();
}
