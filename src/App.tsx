import { useState } from 'react';
import { RESOURCES, type ResourceId } from './game/resources';
import { ResourceTicker } from './ui/ResourceTicker';
import { useGame, useGameLoop } from './game/store';
import { BrumeView } from './ui/BrumeView';
import { TechView } from './ui/TechView';
import { CampaignView } from './ui/CampaignView';
import { AscendView } from './ui/AscendView';
import { ShopView } from './ui/Shop';
import { CharacterSelect } from './ui/CharacterSelect';
import { AuthScreen } from './ui/AuthScreen';
import { hasUnlockedAscension, shardGain } from './game/ascension';
import { authStore, hasSkippedAuth, useAuth } from './game/auth';
import type { GameState } from './game/types';

type Tab = 'brume' | 'camp' | 'tech' | 'shop' | 'ascend';

// Brume au centre : c'est l'onglet où l'on passe le plus de temps, donc celui qui
// doit tomber sous le pouce.
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'shop', label: 'Boutique', icon: '💰' },
  { id: 'camp', label: 'Campagnes', icon: '🗺' },
  { id: 'brume', label: 'Brume', icon: '☁' },
  { id: 'tech', label: 'Recherche', icon: '◇' },
  { id: 'ascend', label: 'Dissolution', icon: '★' },
];

/**
 * Les ressources tardives ne s'affichent qu'une fois obtenues : un débutant n'a
 * pas à se demander à quoi servent des reliques qu'il ne verra pas avant des
 * heures.
 */
function visibleResource(state: GameState, id: ResourceId): boolean {
  if (id === 'shard') return state.resources.shard > 0 || state.ascension.count > 0;
  if (id === 'catalyst') return state.resources.catalyst > 0;
  return true;
}

/** L'ancre de l'URL choisit l'onglet initial : #tech, #shop, #ascend. */
function initialTab(): Tab {
  const hash = location.hash.slice(1) as Tab;
  return TABS.some((t) => t.id === hash) ? hash : 'brume';
}

export default function App() {
  useGameLoop();
  const state = useGame();
  const session = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  // Un skip explicite tient jusqu'au reload suivant ; se reconnecter (via le
  // bouton d'en-tête) rouvre l'écran sans attendre un rechargement.
  const [authDismissed, setAuthDismissed] = useState(() => hasSkippedAuth());
  const [showAuth, setShowAuth] = useState(false);

  // Écran de connexion d'abord (sauf déjà connecté ou déjà sauté) : une
  // sauvegarde cloud existante doit primer sur l'écran de choix de personnage,
  // pas l'inverse.
  if ((!session && !authDismissed) || showAuth) {
    return (
      <div className="app">
        <AuthScreen
          onDone={() => {
            setAuthDismissed(true);
            setShowAuth(false);
          }}
        />
      </div>
    );
  }

  // Première chose que voit un nouveau joueur : qui il incarne.
  if (!state.character) {
    return (
      <div className="app">
        <CharacterSelect />
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="header-top">
          <div className="title">L'Alchimiste de Brume</div>
          {session ? (
            <div className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {session.user.username}
              <button className="ghost" onClick={() => authStore.logout()}>
                Déconnexion
              </button>
            </div>
          ) : (
            <button className="ghost" onClick={() => setShowAuth(true)}>
              Se connecter
            </button>
          )}
        </div>
        {/* Une seule source de vérité pour les ressources : leur nom, leur icône
            et ce à quoi elles servent viennent de `resources.ts`. */}
        <div className="resources">
          {RESOURCES.filter((r) => visibleResource(state, r.id)).map((r) => (
            <ResourceTicker key={r.id} id={r.id} />
          ))}
        </div>
      </header>

      <main>
        {tab === 'brume' && <BrumeView />}
        {tab === 'camp' && <CampaignView />}
        {tab === 'tech' && <TechView />}
        {tab === 'shop' && <ShopView />}
        {tab === 'ascend' && <AscendView />}
      </main>

      <nav>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => {
              setTab(t.id);
              history.replaceState(null, '', `#${t.id}`);
            }}
          >
            <span className="icon">{t.icon}</span>
            {t.label}
            {t.id === 'ascend' && hasUnlockedAscension(state) && shardGain(state) > 0 && (
              <em className="badge shard" />
            )}
          </button>
        ))}
      </nav>

    </div>
  );
}
