import { SLOTS } from '../game/content';
import { dissolve, dissolveAll, equip, formatNum, upgrade } from '../game/engine';
import { itemScore, upgradeCost } from '../game/formulas';
import { store, useGame } from '../game/store';
import { mods as allMods } from '../game/modifiers';
import { ItemCard } from './ItemCard';

export function GearView() {
  const state = useGame();
  const mods = allMods(state);
  const stash = [...state.stash].sort((a, b) => itemScore(b) - itemScore(a));

  return (
    <div className="view">
      <div className="card">
        <div className="label">Équipé</div>
        <div className="stack">
          {SLOTS.map((slot) => {
            const item = state.equipped[slot.id];
            if (!item) {
              return (
                <div key={slot.id} className="card empty">
                  <b>{slot.name}</b>
                  <span className="muted small">vide — à distiller</span>
                </div>
              );
            }
            const cost = upgradeCost(item, mods);
            return (
              <ItemCard
                key={slot.id}
                item={item}
                actions={
                  <button
                    disabled={state.resources.essence < cost}
                    onClick={() => store.act((s) => upgrade(s, item.id))}
                  >
                    Affiner <span className="muted small">{formatNum(cost)} ess</span>
                  </button>
                }
              />
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <div className="label">Réserve · {stash.length}</div>
          {stash.length > 0 && (
            <button className="ghost" onClick={() => store.act(dissolveAll)}>
              Tout dissoudre
            </button>
          )}
        </div>
        {stash.length === 0 && <div className="muted small">Rien en attente.</div>}
        <div className="stack">
          {stash.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              actions={
                <>
                  <button onClick={() => store.act((s) => equip(s, item.id))}>Porter</button>
                  <button className="ghost" onClick={() => store.act((s) => dissolve(s, item.id))}>
                    Dissoudre
                  </button>
                </>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
