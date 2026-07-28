import { formatNum, pushLog } from '../game/engine';
import { GOLD_PACKS } from '../game/shop';
import { store } from '../game/store';
import { ResIcon } from './ResIcon';

/**
 * Le comptoir, à deux étages :
 *
 * - les **sacs d'or** s'achètent en argent réel — la seule monnaie payante ;
 * - les sacs d'or achètent ensuite de la matière, du savoir, et le temps des
 *   longs chantiers depuis l'écran concerné.
 *
 * ⚠ **Mode test** : cliquer sur un prix crédite l'or immédiatement, sans
 * paiement. C'est là uniquement pour équilibrer et essayer le jeu. Avant toute
 * mise en ligne, ces boutons doivent passer par un prestataire (Stripe côté web,
 * facturation App Store et Google Play côté mobile) **avec vérification du reçu
 * côté serveur** — sinon n'importe qui se crédite ce qu'il veut.
 */
export function ShopView() {
  return (
    <div className="view">
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
            <button
              className="ascend"
              title="Mode test : crédite l'or sans paiement"
              onClick={() =>
                store.act((st) => {
                  st.resources.goldCoin += pack.gold;
                  pushLog(st, `Comptoir (test) : +${formatNum(pack.gold)} sacs d'or.`);
                })
              }
            >
              {pack.price}
            </button>
          </div>
        ))}
        <div className="muted small">
          Mode test : les prix créditent l'or sans passer par un paiement. Avant la mise
          en ligne, il faudra un prestataire et une vérification des reçus côté serveur.
        </div>
      </div>
    </div>
  );
}
