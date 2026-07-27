import { buyWithGold, formatNum } from '../game/engine';
import { goldOfferCost, GOLD_OFFERS } from '../game/formulas';
import { resourceDef } from '../game/resources';
import { store, useGame } from '../game/store';
import { ResIcon } from './ResIcon';

/**
 * Le comptoir. Les sacs d'or tombent au combat et ne servent qu'ici : acheter de
 * la matière, du savoir, ou supprimer une attente depuis l'écran concerné.
 */
export function ShopView() {
  const state = useGame();

  return (
    <div className="view">
      <div className="card">
        <div className="label">Boutique</div>
        <div className="muted small">
          <ResIcon id="goldCoin" /> {formatNum(state.resources.goldCoin)} — les sacs d'or tombent au combat.
          Ils achètent de la matière ici, et du temps depuis le laboratoire ou la recherche.
        </div>
      </div>

      {GOLD_OFFERS.map((offer) => {
        const def = resourceDef(offer.resource);
        const cost = goldOfferCost(offer, state.resources[offer.resource]);
        const affordable = state.resources.goldCoin >= cost;
        return (
          <div className="card row between" key={offer.resource}>
            <div>
              <div className="label">
                <ResIcon id={offer.resource} size={15} /> {def.name}
              </div>
              <div className="muted small">{def.use}</div>
            </div>
            <button
              className="ghost"
              disabled={!affordable}
              onClick={() => store.act((st) => buyWithGold(st, offer.resource))}
            >
              +{formatNum(offer.amount)}
              <span className="muted small">
                {formatNum(cost)} <ResIcon id="goldCoin" size={13} />
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
