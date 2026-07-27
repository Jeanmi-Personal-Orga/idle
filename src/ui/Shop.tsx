import { buyWithGold, formatNum } from '../game/engine';
import { GOLD_OFFERS, goldOfferCost } from '../game/formulas';
import { resourceDef } from '../game/resources';
import { GOLD_PACKS } from '../game/shop';
import { store, useGame } from '../game/store';
import { ResIcon } from './ResIcon';

/**
 * Le comptoir, à deux étages :
 *
 * - les **sacs d'or** s'achètent en argent réel — la seule monnaie payante ;
 * - les sacs d'or achètent ensuite de la matière, du savoir, et le temps des
 *   longs chantiers depuis l'écran concerné.
 */
export function ShopView() {
  const state = useGame();

  return (
    <div className="view">
      <div className="card">
        <div className="label">Boutique</div>
        <div className="muted small">
          <ResIcon id="goldCoin" /> {formatNum(state.resources.goldCoin)} sacs d'or. Ils
          tombent au combat, s'achètent ici, et suppriment les attentes du laboratoire
          et de la recherche.
        </div>
      </div>

      <div className="card">
        <div className="label">Sacs d'or</div>
        <div className="muted small">
          Le seul achat en argent réel du jeu. Tout le reste se gagne en jouant.
        </div>
        {GOLD_PACKS.map((pack) => (
          <div className="row between" key={pack.id}>
            <div>
              <b>
                <ResIcon id="goldCoin" size={14} /> {formatNum(pack.gold)}
              </b>
              {pack.bonus > 0 && (
                <span className="muted small"> dont {formatNum(pack.bonus)} offerts</span>
              )}
            </div>
            {/*
              Volontairement inactif : encaisser demande un prestataire de
              paiement (Stripe côté web, facturation App Store et Google Play
              côté mobile) et une vérification du reçu côté serveur. Rien de tout
              cela ne se simule sans risquer de facturer pour de faux.
            */}
            <button disabled title="Paiement non branché">
              {pack.price}
            </button>
          </div>
        ))}
        <div className="muted small">
          Paiements non branchés : il faut un prestataire et une vérification des
          reçus côté serveur. Les boutons restent inactifs jusque-là.
        </div>
      </div>

      <div className="card">
        <div className="label">Contre des sacs d'or</div>
        {GOLD_OFFERS.map((offer) => {
          const def = resourceDef(offer.resource);
          const cost = goldOfferCost(offer, state.resources[offer.resource]);
          const affordable = state.resources.goldCoin >= cost;
          return (
            <div className="row between" key={offer.resource}>
              <div>
                <b>
                  <ResIcon id={offer.resource} size={14} /> {def.name}
                </b>
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
    </div>
  );
}
