/** Client HTTP pour le service de comptes/sauvegarde (server/). */

import Constants from 'expo-constants';
import type { GameState } from './types';

/**
 * Adresse du serveur de comptes. Elle vient de la configuration Expo
 * (`extra.apiUrl` dans app.json, surchargeable par variable d'environnement au
 * build), et non plus d'`import.meta.env`, qui n'existe pas sous Metro.
 *
 * Attention en développement sur appareil : `localhost` désigne le téléphone, pas
 * la machine de développement — il faut y mettre l'IP de la machine.
 */
const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3001';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error('Impossible de contacter le serveur.');
  }
  if (!res.ok) {
    let message = 'Erreur serveur.';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* réponse sans corps JSON exploitable */
    }
    throw new Error(message);
  }
  // 204 n'a pas de corps à parser.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function register(username: string, email: string, password: string): Promise<AuthResponse> {
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function me(token: string): Promise<AuthUser> {
  return request<{ user: AuthUser }>('/api/auth/me', { headers: authHeader(token) }).then((r) => r.user);
}

export async function fetchSave(token: string): Promise<GameState | null> {
  const res = await request<{ data: GameState | null }>('/api/save', { headers: authHeader(token) });
  return res.data;
}

export async function pushSave(token: string, state: GameState): Promise<void> {
  await request('/api/save', {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify({ data: state }),
  });
}
