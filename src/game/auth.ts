/** Session de compte : jeton + profil, séparés de la sauvegarde de jeu. */

import { useSyncExternalStore } from 'react';
import * as api from './api';
import type { AuthUser } from './api';
import { store } from './store';

const TOKEN_KEY = 'brume.auth.token';
const SKIPPED_KEY = 'brume.auth.skipped';

export interface AuthSession {
  token: string;
  user: AuthUser;
}

class AuthStore {
  session: AuthSession | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      // Le profil se rafraîchit en tâche de fond ; en attendant, un jeton
      // sans profil encore résolu vaut mieux qu'un aller-retour bloquant.
      void api
        .me(token)
        .then((user) => this.setSession({ token, user }))
        .catch(() => this.clear());
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.session;

  private notify() {
    for (const fn of this.listeners) fn();
  }

  private setSession(session: AuthSession) {
    this.session = session;
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.removeItem(SKIPPED_KEY);
    this.notify();
  }

  /** Récupère (ou initialise) la sauvegarde cloud pour ce compte, cf. règle §3. */
  private async syncSave() {
    if (!this.session) return;
    const { token } = this.session;
    const cloud = await api.fetchSave(token);
    if (cloud) {
      store.loadFromCloud(cloud);
    } else {
      // Compte neuf sans sauvegarde cloud : la partie locale en cours
      // (même vierge) devient la première sauvegarde de ce compte.
      await api.pushSave(token, store.state);
    }
  }

  async login(email: string, password: string): Promise<void> {
    const { token, user } = await api.login(email, password);
    this.setSession({ token, user });
    await this.syncSave();
  }

  async register(username: string, email: string, password: string): Promise<void> {
    const { token, user } = await api.register(username, email, password);
    this.setSession({ token, user });
    await this.syncSave();
  }

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    this.session = null;
    this.notify();
  }

  logout() {
    this.clear();
  }

  get token(): string | null {
    return this.session?.token ?? null;
  }
}

export const authStore = new AuthStore();

export function hasSkippedAuth(): boolean {
  return localStorage.getItem(SKIPPED_KEY) === '1';
}

export function skipAuth(): void {
  localStorage.setItem(SKIPPED_KEY, '1');
}

/** Abonne le composant à l'état d'authentification courant. */
export function useAuth(): AuthSession | null {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getSnapshot);
}
