import { CAMPAIGNS } from '../game/campaigns';
import { formatNum, leaveCampaign, startCampaign } from '../game/engine';
import { resourceDef } from '../game/resources';
import { store, useGame } from '../game/store';
import { ResIcon } from './ResIcon';

/**
 * Les campagnes : trois séries de combats, chacune payée dans une seule monnaie.
 * Le combat de chapitre donne un peu de tout ; ici on vise ce qui manque.
 *
 * Règle assumée : tout ou rien. Rien n'est payé avant la dernière vague, et
 * tomber en route annule la campagne — c'est ce qui en fait un choix.
 */
export function CampaignView() {
  const state = useGame();
  const active = state.combat.campaign;

  return (
    <div className="view">
      <div className="card">
        <div className="label">Campagnes</div>
        <div className="muted small">
          Des combats dédiés, chacun pour une seule monnaie. Tout est payé à la
          dernière vague : tomber en route ne rapporte rien.
        </div>
      </div>

      {CAMPAIGNS.map((campaign) => {
        const def = resourceDef(campaign.reward);
        const running = active?.id === campaign.id;
        const payout = Math.ceil(campaign.payout * (1 + state.ascension.deepest));

        return (
          <div className={`card ${running ? 'lab-card' : ''}`} key={campaign.id}>
            <div className="row between">
              <div>
                <div className="label">{campaign.name}</div>
                <div className="muted small">{campaign.blurb}</div>
              </div>
              <div className="right">
                <b>
                  <ResIcon id={campaign.reward} size={14} /> {formatNum(payout)}
                </b>
                <div className="muted small">{def.name}</div>
              </div>
            </div>

            <div className="muted small">
              {campaign.waves} vagues · difficulté du chapitre {campaign.depth + 1}
            </div>

            {running ? (
              <>
                <div className="bar">
                  <div
                    className="fill hero"
                    style={{ width: `${(active.wave / campaign.waves) * 100}%` }}
                  />
                </div>
                <div className="row between">
                  <div className="muted small">
                    Vague {active.wave} / {campaign.waves}
                  </div>
                  <button
                    className="ghost"
                    onClick={() =>
                      store.act((st) => leaveCampaign(st, 'Campagne abandonnée : rien à rapporter.'))
                    }
                  >
                    Abandonner
                  </button>
                </div>
              </>
            ) : (
              <button
                className="ascend"
                disabled={!!active}
                onClick={() => store.act((st) => startCampaign(st, campaign.id))}
              >
                {active ? 'Une campagne est en cours' : 'Partir'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
