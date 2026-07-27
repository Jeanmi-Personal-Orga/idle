import { useState } from 'react';
import { CHARACTERS, type CharacterId } from '../game/characters';
import { authStore, skipAuth } from '../game/auth';
import { chooseCharacter } from '../game/engine';
import { store } from '../game/store';
import { Sprite } from './Sprite';

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
  // Choisi à l'inscription : un nouveau compte n'a pas à enchaîner deux écrans
  // pour savoir qui il incarne.
  const [picked, setPicked] = useState<CharacterId>(CHARACTERS[0].id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await authStore.login(email, password);
      } else {
        await authStore.register(username, email, password);
        // Le personnage choisi ici est appliqué tout de suite, et écrit sans
        // attendre la sauvegarde périodique.
        store.act((st) => chooseCharacter(st, picked));
        store.save();
      }
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
            <>
              <input
                placeholder="Nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />

              <div className="muted small">Qui descend dans la brume ?</div>
              <div className="roster compact-roster">
                {CHARACTERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`roster-card ${picked === c.id ? 'picked' : ''}`}
                    onClick={() => setPicked(c.id)}
                    aria-pressed={picked === c.id}
                  >
                    <Sprite character={c.id} anim="idle" scale={0.8} />
                    <b>{c.name}</b>
                  </button>
                ))}
              </div>
              <div className="muted small">
                {CHARACTERS.find((c) => c.id === picked)!.blurb}
              </div>
            </>
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
