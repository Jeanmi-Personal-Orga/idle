import { useEffect, useRef, useState } from 'react';
import { STATS, WAVES_PER_DISTRICT, cycleOf, districtLabel } from '../game/content';
import { formatNum } from '../game/engine';
import { attackInterval, dps, heroStats } from '../game/formulas';
import { store, useGame } from '../game/store';
import type { StatKey } from '../game/types';
import { FoeSprite, HeroSprite, type HeroState } from './Sprites';

const SHOWN: StatKey[] = [
  'power',
  'health',
  'volatility',
  'chain',
  'osmosis',
  'condensation',
  'clairvoyance',
  'rupture',
];

export function BrumeView() {
  const state = useGame();
  const c = state.combat;
  const s = heroStats(state);
  const heroPct = Math.max(0, (c.hero.hp / s.health) * 100);
  const enemyPct = Math.max(0, (c.enemy.hp / c.enemy.maxHp) * 100);
  const dead = c.reviving > 0;
  const pulse = useThrowPulse();
  const heroState: HeroState = dead ? 'death' : pulse;

  return (
    <div className="view">
      {/* La scène s'assombrit quand la lanterne tombe (§2). */}
      <div className={`card scene ${dead ? 'lantern-out' : ''}`}>
        <div className="row between">
          <div>
            <div className="label">{districtLabel(c.district)}</div>
            <div className="muted small">
              Vague {c.wave} / {WAVES_PER_DISTRICT}
              {c.wave === WAVES_PER_DISTRICT && ' · gardien'}
            </div>
          </div>
          <div className="right">
            <div className="label">{formatNum(dps(s))}</div>
            <div className="muted small">dégâts / s</div>
          </div>
        </div>

        <div className="arena">
          <div className="layer far" aria-hidden="true" />
          <div className="layer near" aria-hidden="true" />

          <Fighter
            side="hero"
            name="Toi"
            hp={c.hero.hp}
            max={s.health}
            pct={heroPct}
            note={`${attackInterval(s).toFixed(2)} s / frappe`}
          >
            <HeroSprite state={heroState} />
          </Fighter>

          <Fighter
            side="foe"
            name={c.enemy.name}
            hp={c.enemy.hp}
            max={c.enemy.maxHp}
            pct={enemyPct}
            note={`${formatNum(c.enemy.damage)} par coup`}
            key={`${c.district}-${c.wave}`}
          >
            <FoeSprite
              archetype={c.wave}
              guardian={c.wave === WAVES_PER_DISTRICT}
              cycle={cycleOf(c.district)}
              state="enter"
            />
            <FloatingHits />
          </Fighter>
        </div>
      </div>

      <div className="card">
        <div className="label">Composition</div>
        <div className="grid2">
          {SHOWN.map((k) => {
            // Réaction en chaîne et Clairvoyance plafonnent : on montre le surplus perdu.
            const capped = (k === 'chain' || k === 'clairvoyance') && s[k] > 100;
            return (
              <div key={k} className="statline">
                <span className="muted">{STATS[k].name}</span>
                <b className={capped ? 'capped' : undefined}>
                  {formatNum(capped ? 100 : s[k])}
                  {STATS[k].suffix}
                  {capped && (
                    <span className="muted small"> +{formatNum(s[k] - 100)} perdu</span>
                  )}
                </b>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="label">Journal</div>
        <div className="log">
          {state.log.map((line, i) => (
            <div key={i} className={i === 0 ? '' : 'muted'}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Fighter({
  side,
  name,
  hp,
  max,
  pct,
  note,
  children,
}: {
  side: 'hero' | 'foe';
  name: string;
  hp: number;
  max: number;
  pct: number;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`fighter ${side}`}>
      <div className="stage">{children}</div>
      {/* Barre fine collée sous les pieds (§3). */}
      <div className="bar">
        <div className={`fill ${side}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="fighter-name">{name}</div>
      <div className="muted small">
        {formatNum(Math.max(0, hp))} / {formatNum(max)}
      </div>
      <div className="muted small">{note}</div>
    </div>
  );
}

/** Chiffres de dégâts : montée + fondu, critiques 1,4× et en jaune (§3). */
function FloatingHits() {
  useGame();
  return (
    <div className="hits" aria-hidden="true">
      {store.hits.map((h) => (
        <span
          key={h.id}
          className={`hit ${h.crit ? 'crit' : ''}`}
          style={{ left: `calc(50% + ${h.dx}px)`, top: `${h.dy}px` }}
        >
          {formatNum(h.damage)}
        </span>
      ))}
    </div>
  );
}

/**
 * Rythme l'animation de jet sur la cadence réelle du héros, sans faire dépendre
 * le rendu du moteur : une impulsion courte à chaque coup encaissé par l'ennemi.
 */
function useThrowPulse(): HeroState {
  const [pulsing, setPulsing] = useState(false);
  const seen = useRef(0);
  const lastHit = store.hits.at(-1)?.id ?? 0;

  useEffect(() => {
    if (lastHit === seen.current) return;
    seen.current = lastHit;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 180);
    return () => clearTimeout(t);
  }, [lastHit]);

  return pulsing ? 'throw' : 'idle';
}
