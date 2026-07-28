import { buyKeys, formatNum, pushLog } from '../game/engine';
import { GOLD_PACKS, KEY_PACKS } from '../game/shop';
import { store, useGame } from '../game/store';
import { ResIcon } from './ResIcon';

/**
 * Le comptoir, à deux étages :
 *
 * - les **sacs d'or** s'achètent en argent réel — la seule monnaie payante ;
 * - les sacs d'or achètent des **clés de mission**, et le temps des longs
 *   chantiers depuis l'écran concerné.
 *
 * L'argent réel n'achète donc jamais de ressource directement : une clé n'ouvre
 * qu'une tentative, et il faut encore remporter la mission pour être payé.
 *
 * ⚠ **Mode test** : cliquer sur un prix crédite l'or immédiatement, sans
 * paiement. C'est là uniquement pour équilibrer et essayer le jeu. Avant toute
 * mise en ligne, ces boutons doivent passer par un prestataire (Stripe côté web,
 * facturation App Store et Google Play côté mobile) **avec vérification du reçu
 * côté serveur** — sinon n'importe qui se crédite ce qu'il veut.
 */
export function ShopView() {
  const state = useGame();
  const gold = state.resources.goldCoin;

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
          rejoue pour sa récompense. C'est ainsi qu'on achète des ressources : en
          allant les chercher.
        </div>
        {KEY_PACKS.map((pack) => (
          <div className="row between" key={pack.id}>
            <div>
              <b>🔑 {pack.keys}</b>
              <span className="muted small">
                {' '}
                soit {Math.round(pack.gold / pack.keys)} par clé
              </span>
            </div>
            <button
              className="ascend"
              disabled={gold < pack.gold}
              onClick={() => store.act((st) => buyKeys(st, pack.keys, pack.gold))}
            >
              <ResIcon id="goldCoin" size={13} /> {formatNum(pack.gold)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
