import { PURITIES, SLOTS, slotDef } from '../game/content';
import { formatDuration, formatNum, startDistillation, upgradeLab } from '../game/engine';
import {
  distillCost,
  distillDuration,
  itemScore,
  labUpgradeCost,
  purityWeights,
} from '../game/formulas';
import { mods as allMods } from '../game/modifiers';
import { store, useGame } from '../game/store';
import type { GameState, SlotId } from '../game/types';
import { Cauldron } from './Cauldron';
import { PurityLegend } from './ItemCard';

/** Emplacement le plus faible : vide d'abord, sinon le moins bon score. */
function weakestSlot(state: GameState): SlotId {
  const empty = SLOTS.find((s) => !state.equipped[s.id]);
  if (empty) return empty.id;
  return SLOTS.reduce((worst, s) =>
    itemScore(state.equipped[s.id]!) < itemScore(state.equipped[worst.id]!) ? s : worst,
  ).id;
}

export function LabView() {
  const state = useGame();
  const cost = distillCost(state.labLevel);
  const labCost = labUpgradeCost(state.labLevel);
  const mods = allMods(state);
  const weights = purityWeights(state.labLevel, mods);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const d = state.distilling;
  const ready = !d && state.resources.reagent >= cost;
  // Le chaudron est un bouton : il relance la pièce qui manque le plus, pour
  // qu'un joueur puisse jouer sans jamais lire la liste des emplacements.
  const suggested = weakestSlot(state);

  return (
    <div className="view">
      {/* La pièce, pas un chiffre : elle se remplit à mesure qu'elle grandit. */}
      <div className="card scene">
        <Cauldron
          state={state}
          mods={mods}
          onClick={ready ? () => store.act((s) => startDistillation(s, suggested)) : undefined}
        />
        <div className="row between">
          <div>
            <div className="label">Laboratoire · niveau {state.labLevel}</div>
            <div className="muted small">
              {d
                ? `${SLOTS.find((s) => s.id === d.slot)!.name} · ${formatDuration(d.remaining)} restant`
                : ready
                  ? `Touche le chaudron pour distiller un ${slotDef(suggested).name.toLowerCase()} — ${formatDuration(distillDuration(state.labLevel, mods))}`
                  : 'Foyer éteint — il manque des réactifs'}
            </div>
          </div>
          <button
            onClick={() => store.act(upgradeLab)}
            disabled={
              state.resources.essence < labCost.essence ||
              state.resources.reagent < labCost.reagent
            }
          >
            Agrandir
            <span className="muted small">
              {formatNum(labCost.essence)} ess · {labCost.reagent} réa
            </span>
          </button>
        </div>
      </div>

      {!d && (
        <div className="card">
          <div className="label">Distiller — {cost} réactifs</div>
          <div className="muted small">
            Le résultat s'équipe seul s'il vaut mieux que la pièce portée.
          </div>
          <div className="grid2">
            {SLOTS.map((slot) => (
              <button
                key={slot.id}
                className="slot-btn"
                disabled={state.resources.reagent < cost}
                onClick={() => store.act((s) => startDistillation(s, slot.id))}
              >
                <b>{slot.name}</b>
                <span className="muted small">{slot.flavor}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="label">Pureté attendue</div>
        <div className="purity-bar">
          {PURITIES.map((p, i) => {
            const share = (weights[i] / totalWeight) * 100;
            if (share < 0.4) return null;
            return (
              <div
                key={p.id}
                className="purity-seg"
                style={{ width: `${share}%`, background: p.color }}
                title={`${p.name} ${share.toFixed(0)} %`}
              />
            );
          })}
        </div>
        <PurityLegend />
      </div>
    </div>
  );
}
