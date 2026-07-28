import {
  CAMPAIGNS,
  KEYS_PER_DAY,
  campaignDepth,
  campaignRewards,
  type Campaign,
} from '../game/campaigns';
import { formatNum, leaveCampaign, startCampaign } from '../game/engine';
import { heroStats, powerScore, recommendedPower } from '../game/formulas';
import { useState } from 'react';
import { store, useGame } from '../game/store';
import { MissionPopup } from './BrumeView';
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
  const [showContract, setShowContract] = useState(false);
  const active = state.mission;
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
          Une clé par tentative. Tout est payé à la dernière vague : tomber en route
          ne rapporte rien. Les clés reviennent à minuit, heure de Paris.
        </div>
        {/* Le contrat du chapitre vit ici, avec les missions : c'est le même
            genre d'objectif, et il n'avait rien à faire au-dessus du combat. */}
        <button className="ghost" onClick={() => setShowContract(true)}>
          🎯 Contrat du chapitre
          {state.pendingContract && <em className="badge dot" />}
        </button>
      </div>

      {showContract && (
        <MissionPopup best={state.combat.best} onClose={() => setShowContract(false)} />
      )}

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
              <CampaignFight campaign={campaign} depth={depth} />
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

/**
 * Le combat de la mission, joué dans sa propre carte — et avec ses propres points
 * de vie : le combat de brume continue pendant ce temps, sur son propre front.
 */
function CampaignFight({ campaign, depth }: { campaign: Campaign; depth: number }) {
  const state = useGame();
  const m = state.mission!;
  const s = heroStats(state);

  return (
    <>
      <div className="bar">
        <div className="fill hero" style={{ width: `${(m.wave / campaign.waves) * 100}%` }} />
      </div>
      <div className="muted small">
        Vague {m.wave} / {campaign.waves}
      </div>

      <Arena fight={m} scope="mission" district={depth} />

      <div className="bars">
        <FighterBar side="hero" name="Toi" hp={m.hero.hp} max={s.health} />
        <FighterBar
          side="foe"
          name={m.enemies[0]?.name ?? ''}
          hp={m.enemies.reduce((sum, e) => sum + Math.max(0, e.hp), 0)}
          max={m.enemies.reduce((sum, e) => sum + e.maxHp, 0)}
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
