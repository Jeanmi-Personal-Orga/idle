import { buyCatalyst, formatNum } from '../game/engine';
import { catalystShopCost } from '../game/formulas';
import { resourceDef } from '../game/resources';
import { store, useGame } from '../game/store';

/** Vue dédiée : le comptoir, pour l'instant seul article en vente. */
export function ShopView() {
  return (
    <div className="view">
      <div className="card">
        <div className="label">Boutique</div>
        <div className="muted small">Contre des pièces d'or gagnées au combat.</div>
      </div>
      <CatalystShop />
    </div>
  );
}

/** Petit comptoir secondaire : échange des pièces d'or accumulées contre un catalyseur. */
export function CatalystShop() {
  const state = useGame();
  const def = resourceDef('catalyst');
  const coin = resourceDef('goldCoin');
  const cost = catalystShopCost(state.resources.catalyst);
  const affordable = state.resources.goldCoin >= cost;

  return (
    <div className="card row between">
      <div>
        <div className="label">Comptoir aux catalyseurs</div>
        <div className="muted small">
          {def.icon} {formatNum(state.resources.catalyst)} · {coin.icon}{' '}
          {formatNum(state.resources.goldCoin)} — échange des pièces d'or contre un catalyseur.
        </div>
      </div>
      <button className="ghost" disabled={!affordable} onClick={() => store.act(buyCatalyst)}>
        Acheter 1 catalyseur
        <span className="muted small">
          {formatNum(cost)} {coin.icon}
        </span>
      </button>
    </div>
  );
}
