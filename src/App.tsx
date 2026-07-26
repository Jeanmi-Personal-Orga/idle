import { useState } from 'react';
import { formatNum } from './game/engine';
import { useGame, useGameLoop } from './game/store';
import { BrumeView } from './ui/BrumeView';
import { GearView } from './ui/GearView';
import { LabView } from './ui/LabView';
import { TechView } from './ui/TechView';

type Tab = 'brume' | 'lab' | 'gear' | 'tech';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'brume', label: 'Brume', icon: '☁' },
  { id: 'lab', label: 'Laboratoire', icon: '⚗' },
  { id: 'gear', label: 'Élixirs', icon: '❖' },
  { id: 'tech', label: 'Recherche', icon: '◇' },
];

export default function App() {
  useGameLoop();
  const state = useGame();
  const [tab, setTab] = useState<Tab>('brume');
  const stashCount = state.stash.length;

  return (
    <div className="app">
      <header>
        <div className="title">L'Alchimiste de Brume</div>
        <div className="resources">
          <span title="Essence — affine et agrandit">
            ✦ {formatNum(state.resources.essence)}
          </span>
          <span title="Réactifs — distillent de nouvelles pièces">
            ◆ {formatNum(state.resources.reagent)}
          </span>
          <span title="Lucidité — alimente la recherche">
            ◇ {formatNum(state.resources.insight)}
          </span>
        </div>
      </header>

      <main>
        {tab === 'brume' && <BrumeView />}
        {tab === 'lab' && <LabView />}
        {tab === 'gear' && <GearView />}
        {tab === 'tech' && <TechView />}
      </main>

      <nav>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <span className="icon">{t.icon}</span>
            {t.label}
            {t.id === 'gear' && stashCount > 0 && <em className="badge">{stashCount}</em>}
            {t.id === 'lab' && state.distilling && <em className="badge dot" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
