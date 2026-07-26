import { useState } from 'react';
import { formatNum } from './game/engine';
import { useGame, useGameLoop } from './game/store';
import { BrumeView } from './ui/BrumeView';
import { GearView } from './ui/GearView';
import { LabView } from './ui/LabView';
import { TechView } from './ui/TechView';
import { AscendView } from './ui/AscendView';
import { Fog } from './ui/Fog';
import { hasUnlockedAscension, shardGain } from './game/ascension';

type Tab = 'brume' | 'lab' | 'gear' | 'tech' | 'ascend';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'brume', label: 'Brume', icon: '☁' },
  { id: 'lab', label: 'Laboratoire', icon: '⚗' },
  { id: 'gear', label: 'Élixirs', icon: '❖' },
  { id: 'tech', label: 'Recherche', icon: '◇' },
  { id: 'ascend', label: 'Dissolution', icon: '✧' },
];

/** L'ancre de l'URL choisit l'onglet initial : #lab, #gear, #tech, #ascend. */
function initialTab(): Tab {
  const hash = location.hash.slice(1) as Tab;
  return TABS.some((t) => t.id === hash) ? hash : 'brume';
}

export default function App() {
  useGameLoop();
  const state = useGame();
  const [tab, setTab] = useState<Tab>(initialTab);
  const stashCount = state.stash.length;

  return (
    <div className="app">
      <header>
        <div className="title">L'Alchimiste de Brume</div>
        <div className="resources">
          <span className="res-essence" title="Essence — affine et agrandit">
            ✦ {formatNum(state.resources.essence)}
          </span>
          <span className="res-reagent" title="Réactifs — distillent de nouvelles pièces">
            ◆ {formatNum(state.resources.reagent)}
          </span>
          <span className="res-insight" title="Lucidité — alimente la recherche">
            ◇ {formatNum(state.resources.insight)}
          </span>
          {(state.resources.shard > 0 || state.ascension.count > 0) && (
            <span className="res-shard" title="Éclats — scellent les legs permanents">
              ✧ {formatNum(state.resources.shard)}
            </span>
          )}
        </div>
      </header>

      <main>
        {tab === 'brume' && <BrumeView />}
        {tab === 'lab' && <LabView />}
        {tab === 'gear' && <GearView />}
        {tab === 'tech' && <TechView />}
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
            {t.id === 'gear' && stashCount > 0 && <em className="badge">{stashCount}</em>}
            {t.id === 'lab' && state.distilling && <em className="badge dot" />}
            {t.id === 'ascend' && hasUnlockedAscension(state) && shardGain(state) > 0 && (
              <em className="badge shard" />
            )}
          </button>
        ))}
      </nav>

      {/* La brume, au-dessus de tout : le liant visuel du jeu. */}
      <Fog />
    </div>
  );
}
