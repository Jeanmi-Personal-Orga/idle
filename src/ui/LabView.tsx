import { PURITIES, SLOTS } from '../game/content';
import { formatDuration, formatNum, startDistillation, upgradeLab } from '../game/engine';
import {
  distillCost,
  distillDuration,
  labUpgradeCost,
  purityWeights,
} from '../game/formulas';
import { store, useGame } from '../game/store';
import { mods as allMods } from '../game/modifiers';
import { PurityLegend } from './ItemCard';

export function LabView() {
  const state = useGame();
  const cost = distillCost(state.labLevel);
  const labCost = labUpgradeCost(state.labLevel);
  const mods = allMods(state);
  const weights = purityWeights(state.labLevel, mods);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const d = state.distilling;

  return (
    <div className="view">
      <div className="card">
        <div className="row between">
          <div>
            <div className="label">Laboratoire · niveau {state.labLevel}</div>
            <div className="muted small">
              Distillation en {formatDuration(distillDuration(state.labLevel, mods))} ·
              socle +{Math.round((state.labLevel - 1) * 5)} %
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

      {d ? (
        <div className="card">
          <div className="label">Distillation en cours</div>
          <div className="bar tall">
            <div
              className="fill brew"
              style={{ width: `${(1 - d.remaining / d.total) * 100}%` }}
            />
          </div>
          <div className="muted small">
            {SLOTS.find((s) => s.id === d.slot)!.name} · {formatDuration(d.remaining)} restant
          </div>
        </div>
      ) : (
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
    </div>
  );
}
