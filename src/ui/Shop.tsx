import { formatNum, grantKeys, pushLog } from '../game/engine';
import { GOLD_PACKS, KEY_PACKS } from '../game/shop';
import { store, useGame } from '../game/store';
import { ResIcon } from './ResIcon';

/**
 * Le comptoir, à deux étages :
 *
 * - les **sacs d'or**, qui paient le temps des longs chantiers depuis l'écran
 *   concerné ;
 * - les **clés de mission**, qui ouvrent des tentatives.
 *
 * Les deux s'achètent en argent réel. Ni l'un ni l'autre ne vend de ressource :
 * une clé n'est qu'un droit d'entrée, il faut encore remporter la mission.
 *
 * ⚠ **Mode test** : cliquer sur un prix crédite l'or immédiatement, sans
 * paiement. C'est là uniquement pour équilibrer et essayer le jeu. Avant toute
 * mise en ligne, ces boutons doivent passer par un prestataire (Stripe côté web,
 * facturation App Store et Google Play côté mobile) **avec vérification du reçu
 * côté serveur** — sinon n'importe qui se crédite ce qu'il veut.
 */
export function ShopView() {
  const state = useGame();

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

      <div className="card">
        <div className="row between">
          <div className="label">Clés de mission</div>
          <div className="muted small">
            🔑 {state.keys?.left ?? 0} en poche
          </div>
        </div>
        <div className="muted small">
          Une clé ouvre une tentative de mission — et une mission déjà remportée se
          rejoue pour sa récompense. On n'achète pas les ressources : on achète le
          droit d'aller les chercher.
        </div>
        {KEY_PACKS.map((pack) => (
          <div className="row between" key={pack.id}>
            <div>
              <b>🔑 {pack.keys}</b>
              {pack.keys > 1 && <span className="muted small"> lot</span>}
            </div>
            <button
              className="ascend"
              title="Mode test : crédite les clés sans paiement"
              onClick={() => store.act((st) => grantKeys(st, pack.keys))}
            >
              {pack.price}
            </button>
          </div>
        ))}
        <div className="muted small">
          Mode test également : les clés sont créditées sans paiement.
        </div>
      </div>
    </div>
  );
}
