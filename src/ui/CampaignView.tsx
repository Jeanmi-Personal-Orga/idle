import { CAMPAIGNS, KEYS_PER_DAY, campaignDepth } from '../game/campaigns';
import { formatNum, leaveCampaign, startCampaign } from '../game/engine';
import { heroStats, powerScore, recommendedPower } from '../game/formulas';
import { resourceDef } from '../game/resources';
import { store, useGame } from '../game/store';
import { ResIcon } from './ResIcon';

/**
 * Les campagnes : trois séries de combats, chacune payée dans une seule monnaie.
 * Le combat de chapitre donne un peu de tout ; ici on vise ce qui manque.
 *
 * Deux garde-fous : une **clé** par tentative, trois par jour, et une
 * **puissance recommandée** comparable à la sienne, pour ne pas partir perdant.
 * Règle assumée : tout ou rien — rien n'est payé avant la dernière vague.
 */
export function CampaignView({ onStarted }: { onStarted: () => void }) {
  const state = useGame();
  const active = state.combat.campaign;
  const power = powerScore(heroStats(state));
  const keys = state.keys?.left ?? 0;

  return (
    <div className="view">
      <div className="card">
        <div className="row between">
          <div className="label">Campagnes</div>
          <div className="right">
            <b>
              🔑 {keys} / {KEYS_PER_DAY}
            </b>
            <div className="muted small">clés du jour</div>
          </div>
        </div>
        <div className="muted small">
          Des combats dédiés, chacun pour une seule monnaie. Une clé par tentative,
          trois par jour. Tout est payé à la dernière vague : tomber en route ne
          rapporte rien.
        </div>
        <div className="muted small">Ta puissance : {formatNum(power)}</div>
      </div>

      {CAMPAIGNS.map((campaign) => {
        const def = resourceDef(campaign.reward);
        const running = active?.id === campaign.id;
        const depth = campaignDepth(campaign, state.ascension.deepest);
        // On calibre sur le gardien final : c'est lui qui décide de l'issue.
        const advised = recommendedPower(depth, campaign.waves, 2.2);
        const ready = power >= advised;
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

            <div className="row between">
              <div className="muted small">
                {campaign.waves} vagues · chapitre {depth + 1}
              </div>
              <div className={`small ${ready ? 'better' : 'worse'}`}>
                Puissance conseillée {formatNum(advised)}
              </div>
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
                  <div className="row">
                    <button onClick={onStarted}>Voir le combat</button>
                    <button
                      className="ghost"
                      onClick={() =>
                        store.act((st) =>
                          leaveCampaign(st, 'Campagne abandonnée : rien à rapporter.'),
                        )
                      }
                    >
                      Abandonner
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                className="ascend"
                disabled={!!active || keys < 1}
                onClick={() => {
                  store.act((st) => startCampaign(st, campaign.id));
                  // On envoie tout de suite sur l'arène : une campagne se regarde.
                  onStarted();
                }}
              >
                {active ? 'Une campagne est en cours' : keys < 1 ? 'Plus de clé aujourd’hui' : 'Partir'}
                {!active && keys > 0 && <span className="muted small">🔑 1</span>}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
