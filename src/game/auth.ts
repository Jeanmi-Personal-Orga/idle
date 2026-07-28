/** Session de compte : jeton + profil, séparés de la sauvegarde de jeu. */

import { useSyncExternalStore } from 'react';
import * as api from './api';
import type { AuthUser } from './api';
import { getItem, removeItem, setItem } from './storage';
import type { GameState } from './types';

const TOKEN_KEY = 'brume.auth.token';
const SKIPPED_KEY = 'brume.auth.skipped';

export interface AuthSession {
  token: string;
  user: AuthUser;
}

/**
 * Pont vers la partie en cours. C'est le **magasin qui se branche ici**, et non ce
 * module qui l'importe : le magasin a besoin du jeton pour sauvegarder, donc s'ils
 * s'importaient l'un l'autre le cycle laisserait l'un des deux non initialisé au
 * chargement — Metro le signale, et ce projet en a déjà payé le prix.
 */
export interface SaveBridge {
  /** Remplace la partie courante par une sauvegarde venue du serveur. */
  load: (state: GameState) => void;
  /** État courant, à envoyer comme première sauvegarde d'un compte neuf. */
  snapshot: () => GameState;
}

let bridge: SaveBridge | null = null;

/** Appelé une fois par le magasin de jeu, à son initialisation. */
export function connectSaveBridge(next: SaveBridge) {
  bridge = next;
}

class AuthStore {
  session: AuthSession | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    const token = getItem(TOKEN_KEY);
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
    setItem(TOKEN_KEY, session.token);
    removeItem(SKIPPED_KEY);
    this.notify();
  }

  /** Récupère (ou initialise) la sauvegarde cloud pour ce compte, cf. règle §3. */
  private async syncSave() {
    if (!this.session || !bridge) return;
    const { token } = this.session;
    const cloud = await api.fetchSave(token);
    if (cloud) {
      bridge.load(cloud);
    } else {
      // Compte neuf sans sauvegarde cloud : la partie locale en cours (même
      // vierge) devient la première sauvegarde de ce compte.
      await api.pushSave(token, bridge.snapshot());
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
    removeItem(TOKEN_KEY);
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
  return getItem(SKIPPED_KEY) === '1';
}

export function skipAuth(): void {
  setItem(SKIPPED_KEY, '1');
}

/** Abonne le composant à l'état d'authentification courant. */
export function useAuth(): AuthSession | null {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getSnapshot);
}
