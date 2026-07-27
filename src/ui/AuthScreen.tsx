import { useState } from 'react';
import { authStore, skipAuth } from '../game/auth';

/**
 * Écran de connexion/inscription. Skippable à tout moment — c'est un jeu
 * solo hobby, imposer un compte serait hostile. Réapparaît via le bouton
 * « Se connecter » de l'en-tête pour qui a sauté cette étape et change d'avis.
 */
export function AuthScreen({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await authStore.login(email, password);
      else await authStore.register(username, email, password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="intro">
      <div className="intro-head">
        <h1>L'Alchimiste de Brume</h1>
        <p className="muted">
          Connecte-toi pour retrouver ta partie sur n'importe quel appareil, ou
          continue sans compte — tout reste jouable en local.
        </p>
      </div>

      <div className="card intro-detail">
        <div className="branch-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            Connexion
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            Créer un compte
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'register' && (
            <input
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />
          {error && <div className="muted small">{error}</div>}
          <button className="ascend" type="submit" disabled={busy}>
            {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>
      </div>

      <button
        className="ghost"
        onClick={() => {
          skipAuth();
          onDone();
        }}
      >
        Jouer sans compte
      </button>
    </div>
  );
}
