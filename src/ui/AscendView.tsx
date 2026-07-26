import { DISTRICTS, districtLabel } from '../game/content';
import { ascend, formatNum } from '../game/engine';
import { store, useGame } from '../game/store';
import {
  ASCEND_UNLOCK_DISTRICT,
  LEGACIES,
  buyLegacy,
  buyLegacyMax,
  canBuyLegacy,
  hasUnlockedAscension,
  legacyCost,
  legacyLevel,
  nextDistrictGain,
  shardGain,
  type Legacy,
} from '../game/ascension';

export function AscendView() {
  const state = useGame();
  const unlocked = hasUnlockedAscension(state);
  const gain = shardGain(state);
  const next = nextDistrictGain(state);

  return (
    <div className="view">
      <div className="card">
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
            <div className="label" style={{ color: '#e8e4d0' }}>
              ✧ {formatNum(state.resources.shard)}
            </div>
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

      <div className="card">
        <div className="label">Legs</div>
        <div className="muted small">
          Achetés une fois, gardés pour toujours — y compris à travers les dissolutions.
        </div>
      </div>

      <div className="stack">
        {LEGACIES.map((legacy) => (
          <LegacyCard key={legacy.id} legacy={legacy} />
        ))}
      </div>
    </div>
  );
}

function LegacyCard({ legacy }: { legacy: Legacy }) {
  const state = useGame();
  const level = legacyLevel(state, legacy.id);
  const maxed = level >= legacy.max;
  const cost = legacyCost(legacy, level);
  const affordable = canBuyLegacy(state, legacy);

  return (
    <div className="card node">
      <div className="row between">
        <div>
          <b style={maxed ? { color: '#e8e4d0' } : undefined}>{legacy.name}</b>
          <div className="muted small">
            {level > 0 ? legacy.effect(level) : 'aucun niveau'}
          </div>
        </div>
        <div className="label">
          {level} / {legacy.max}
        </div>
      </div>
      <div className="bar">
        <div
          className="fill"
          style={{ width: `${(level / legacy.max) * 100}%`, background: '#e8e4d0' }}
        />
      </div>
      {!maxed && (
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
  );
}
