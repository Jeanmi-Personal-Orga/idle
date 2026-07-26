import { useState } from 'react';
import {
  ASCEND_UNLOCK_DISTRICT,
  LEGACIES,
  buyLegacy,
  buyLegacyMax,
  canBuyLegacy,
  hasUnlockedAscension,
  legacyCost,
  legacyDef,
  legacyLevel,
  nextDistrictGain,
  shardGain,
} from '../game/ascension';
import { DISTRICTS, districtLabel } from '../game/content';
import { ascend, formatNum } from '../game/engine';
import { store, useGame } from '../game/store';
import { LegacyWall } from './LegacyWall';

export function AscendView() {
  const state = useGame();
  const unlocked = hasUnlockedAscension(state);
  const gain = shardGain(state);
  const next = nextDistrictGain(state);
  const [selected, setSelected] = useState(LEGACIES[0].id);
  const legacy = legacyDef(selected);
  const level = legacyLevel(state, selected);
  const maxed = level >= legacy.max;
  const cost = legacyCost(legacy, level);
  const affordable = canBuyLegacy(state, legacy);

  return (
    <div className="view">
      {/* Écran sombre, le chaudron se vide, les éclats montent (§6). */}
      <div className="card scene dissolve-scene">
        {state.ascension.count > 0 && (
          <div className="shards" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${8 + i * 10.5}%`,
                  animationDelay: `${(i * 0.37).toFixed(2)}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="row between">
          <div>
            <div className="label">Dissolution</div>
            <div className="muted small">
              {state.ascension.count === 0
                ? 'Jamais dissous'
                : `${state.ascension.count} dissolution(s) · écho +${Math.round(
                    state.ascension.count * 12,
                  )} %`}
            </div>
          </div>
          <div className="right">
            <div className="label res-shard">✧ {formatNum(state.resources.shard)}</div>
            <div className="muted small">éclats</div>
          </div>
        </div>

        {!unlocked ? (
          <div className="muted small">
            Verrouillé. Atteins {DISTRICTS[ASCEND_UNLOCK_DISTRICT].name} une fois pour
            apprendre à dissoudre ton propre laboratoire.
          </div>
        ) : (
          <>
            <div className="muted small">
              Repartent de zéro : essence, réactifs, élixirs, districts, laboratoire.
              <br />
              Restent acquis : Lucidité et recherche, éclats, legs, écho des dissolutions.
            </div>
            <button
              className="ascend"
              disabled={gain <= 0}
              onClick={() => {
                if (
                  confirm(
                    `Dissoudre le laboratoire pour ${gain} éclats ? La progression matérielle repart de zéro.`,
                  )
                ) {
                  store.act(ascend);
                }
              }}
            >
              Dissoudre <span className="muted small">✧ {formatNum(gain)}</span>
            </button>
            <div className="muted small">
              En poussant jusqu'à {districtLabel(state.combat.district + 1)} : ✧{' '}
              {formatNum(next)}.
            </div>
          </>
        )}
      </div>

      {/* Le mur du fond : les six legs, éteints ou illuminés. */}
      <div className="card">
        <div className="label">Le mur des legs</div>
        <LegacyWall state={state} selected={selected} onSelect={setSelected} />

        <div className="row between">
          <div>
            <b className={level > 0 ? 'res-shard' : undefined}>{legacy.name}</b>
            <div className="muted small">
              {level > 0 ? legacy.effect(level) : 'jamais scellé'}
            </div>
          </div>
          <div className="label">
            {level} / {legacy.max}
          </div>
        </div>

        <div className="bar">
          <div
            className="fill"
            style={{ width: `${(level / legacy.max) * 100}%`, background: 'var(--shard)' }}
          />
        </div>

        {maxed ? (
          <div className="muted small">Legs complet.</div>
        ) : (
          <>
            <div className="muted small">Prochain : {legacy.effect(level + 1)}</div>
            <div className="row">
              <button
                disabled={!affordable}
                onClick={() => store.act((s) => buyLegacy(s, legacy.id))}
              >
                Sceller <span className="muted small">✧ {formatNum(cost)}</span>
              </button>
              <button
                className="ghost"
                disabled={!affordable}
                onClick={() => store.act((s) => buyLegacyMax(s, legacy.id))}
              >
                Max
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
