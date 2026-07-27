import { CAMPAIGNS, KEYS_PER_DAY, campaignDepth, campaignRewards } from '../game/campaigns';
import { formatNum, leaveCampaign, startCampaign } from '../game/engine';
import { heroStats, powerScore, recommendedPower } from '../game/formulas';
import { store, useGame } from '../game/store';
import { Arena, FighterBar } from './Arena';
import { ResIcon } from './ResIcon';

/**
 * Les missions : trois séries de combats dédiées. Chacune paie **les trois
 * essences**, avec une part triple pour celle qu'elle met en avant — une mission
 * ne doit pas devenir inutile parce qu'on manque d'autre chose. Plus la mission
 * est longue et profonde, plus elle paie.
 *
 * Le combat se joue **ici**, dans la carte de la mission : on lance et on
 * regarde, sans changer d'onglet.
 *
 * Deux garde-fous : une **clé** par tentative, trois par jour, et une
 * **puissance conseillée** comparable à la sienne. Règle assumée : tout ou rien,
 * rien n'est payé avant la dernière vague.
 */
export function CampaignView() {
  const state = useGame();
  const active = state.combat.campaign;
  const power = powerScore(heroStats(state));
  const keys = state.keys?.left ?? 0;

  return (
    <div className="view">
      <div className="card">
        <div className="row between">
          <div className="label">Missions</div>
          <div className="right">
            <b>
              🔑 {keys} / {KEYS_PER_DAY}
            </b>
            <div className="muted small">clés du jour</div>
          </div>
        </div>
        <div className="muted small">
          Une clé par tentative. Tout est payé à la dernière vague : tomber en route
          ne rapporte rien. Ta puissance : {formatNum(power)}.
        </div>
      </div>

      {CAMPAIGNS.map((campaign) => {
        const running = active?.id === campaign.id;
        const depth = campaignDepth(campaign, state.ascension.deepest);
        // On calibre sur le gardien final : c'est lui qui décide de l'issue.
        const advised = recommendedPower(depth, campaign.waves, 2.2);
        const ready = power >= advised;
        const reward = campaignRewards(campaign, state.ascension.deepest);

        return (
          <div className={`card ${running ? 'lab-card' : ''}`} key={campaign.id}>
            <div className="row between">
              <div>
                <div className="label">{campaign.name}</div>
                <div className="muted small">{campaign.blurb}</div>
              </div>
              <div className={`small ${ready ? 'better' : 'worse'}`}>
                Conseillé {formatNum(advised)}
              </div>
            </div>

            <div className="row between">
              <div className="muted small">
                {campaign.waves} vagues · chapitre {depth + 1}
              </div>
              <div className="small">
                <ResIcon id="essence" size={13} /> {formatNum(reward.essence)}{' '}
                <ResIcon id="reagent" size={13} /> {formatNum(reward.reagent)}{' '}
                <ResIcon id="insight" size={13} /> {formatNum(reward.insight)}
              </div>
            </div>

            {running ? (
              <CampaignFight waves={campaign.waves} wave={active.wave} />
            ) : (
              <button
                className="ascend"
                disabled={!!active || keys < 1}
                onClick={() => store.act((st) => startCampaign(st, campaign.id))}
              >
                {active
                  ? 'Une mission est en cours'
                  : keys < 1
                    ? 'Plus de clé aujourd’hui'
                    : 'Partir'}
                {!active && keys > 0 && <span className="muted small">🔑 1</span>}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Le combat de la mission, joué dans sa propre carte. */
function CampaignFight({ waves, wave }: { waves: number; wave: number }) {
  const state = useGame();
  const c = state.combat;
  const s = heroStats(state);

  return (
    <>
      <div className="bar">
        <div className="fill hero" style={{ width: `${(wave / waves) * 100}%` }} />
      </div>
      <div className="muted small">
        Vague {wave} / {waves}
      </div>

      <Arena />

      <div className="bars">
        <FighterBar side="hero" name="Toi" hp={c.hero.hp} max={s.health} />
        <FighterBar
          side="foe"
          name={c.enemies[0]?.name ?? ''}
          hp={c.enemies.reduce((sum, e) => sum + Math.max(0, e.hp), 0)}
          max={c.enemies.reduce((sum, e) => sum + e.maxHp, 0)}
        />
      </div>

      <button
        className="ghost"
        onClick={() =>
          store.act((st) => leaveCampaign(st, 'Mission abandonnée : rien à rapporter.'))
        }
      >
        Abandonner
      </button>
    </>
  );
}
