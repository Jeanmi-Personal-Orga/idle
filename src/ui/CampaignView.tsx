import {
  KEYS_PER_DAY,
  campaignDef,
  dailyBonus,
  missionRewards,
  type DailyMission,
} from '../game/campaigns';
import { allMissionsWon, formatNum, loseMission, startMission } from '../game/engine';
import { heroStats, powerScore, recommendedPower } from '../game/formulas';
import { districtLabel } from '../game/content';
import { useState } from 'react';
import { store, useGame } from '../game/store';
import { MissionPopup } from './BrumeView';
import { Arena, FighterBar } from './Arena';
import { ResIcon } from './ResIcon';

/**
 * Les missions du jour : **trois tirages quotidiens**, un par monnaie, dont le
 * chapitre et le nombre de vagues changent chaque jour. Le combat est celui de
 * la brume — même approche, mêmes boîtes de collision, même respiration entre
 * les vagues — mais sur son propre front : la brume continue pendant ce temps.
 *
 * L'économie des clés : une clé par tentative, **rendue en cas de défaite**. On
 * ne perd donc une clé qu'en remportant une mission, et rater n'a jamais fermé
 * la journée. Trois victoires par jour, et les trois ensemble paient une prime.
 */
export function CampaignView() {
  const state = useGame();
  const [showContract, setShowContract] = useState(false);
  const active = state.mission;
  const power = powerScore(heroStats(state));
  const keys = state.keys?.left ?? 0;
  const missions = state.daily?.missions ?? [];
  const won = missions.filter((m) => m.status === 'won').length;
  const bonus = dailyBonus(missions);

  return (
    <div className="view">
      <div className="card">
        <div className="row between">
          <div className="label">Missions du jour</div>
          <div className="right">
            <b>
              🔑 {keys} / {KEYS_PER_DAY}
            </b>
            <div className="muted small">clés du jour</div>
          </div>
        </div>
        <div className="muted small">
          Trois missions retirées au sort chaque jour. Une clé par tentative, rendue si
          tu tombes : seule une victoire consomme une clé. Tout est payé à la dernière
          vague. Remise à zéro à minuit, heure de Paris.
        </div>

        {/* La prime des trois : le vrai objectif de la journée. */}
        <div className="row between">
          <div>
            <b>Prime des trois missions</b>
            <div className="muted small">
              {state.daily?.bonusPaid ? 'Déjà touchée aujourd’hui' : `${won} / ${missions.length} remportées`}
            </div>
          </div>
          <div className={`small ${allMissionsWon(missions) ? 'better' : ''}`}>
            <ResIcon id="essence" size={13} /> {formatNum(bonus.essence)}{' '}
            <ResIcon id="reagent" size={13} /> {formatNum(bonus.reagent)}{' '}
            <ResIcon id="insight" size={13} /> {formatNum(bonus.insight)}{' '}
            <ResIcon id="catalyst" size={13} /> {bonus.catalyst}
          </div>
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

      {missions.map((mission) => {
        const campaign = campaignDef(mission.campaign);
        if (!campaign) return null;
        const running = active?.missionId === mission.id;
        // On calibre sur le gardien final : c'est lui qui décide de l'issue.
        const advised = recommendedPower(mission.district, mission.waves, 2.2);
        const ready = power >= advised;
        const reward = missionRewards(mission);

        return (
          <div className={`card ${running ? 'lab-card' : ''}`} key={mission.id}>
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
                {mission.waves} vagues · {districtLabel(mission.district)}
              </div>
              <div className="small">
                <ResIcon id="essence" size={13} /> {formatNum(reward.essence)}{' '}
                <ResIcon id="reagent" size={13} /> {formatNum(reward.reagent)}{' '}
                <ResIcon id="insight" size={13} /> {formatNum(reward.insight)}
              </div>
            </div>

            {running ? (
              <MissionFight mission={mission} />
            ) : (
              <MissionButton mission={mission} busy={Boolean(active)} keys={keys} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Issue de la mission, et de quoi la relancer tant qu'elle n'est pas gagnée. */
function MissionButton({
  mission,
  busy,
  keys,
}: {
  mission: DailyMission;
  busy: boolean;
  keys: number;
}) {
  if (mission.status === 'won') {
    return (
      <div className="row between mission-result won">
        <b>Victoire</b>
        <span className="muted small">Récompense touchée</span>
      </div>
    );
  }
  return (
    <>
      {mission.status === 'lost' && (
        <div className="row between mission-result lost">
          <b>Défaite</b>
          <span className="muted small">Clé rendue, à retenter</span>
        </div>
      )}
      <button
        className="ascend"
        disabled={busy || keys < 1}
        onClick={() => store.act((st) => startMission(st, mission.id))}
      >
        {busy
          ? 'Une mission est en cours'
          : keys < 1
            ? 'Plus de clé aujourd’hui'
            : mission.status === 'lost'
              ? 'Retenter'
              : 'Partir'}
        {!busy && keys > 0 && <span className="muted small">🔑 1</span>}
      </button>
    </>
  );
}

/**
 * Le combat de la mission, joué dans sa propre carte — et avec ses propres points
 * de vie : le combat de brume continue pendant ce temps, sur son propre front.
 */
function MissionFight({ mission }: { mission: DailyMission }) {
  const state = useGame();
  const m = state.mission!;
  const s = heroStats(state);

  return (
    <>
      <div className="bar">
        <div className="fill hero" style={{ width: `${(m.wave / m.waves) * 100}%` }} />
      </div>
      <div className="muted small">
        Vague {m.wave} / {m.waves}
      </div>

      <Arena fight={m} scope="mission" district={mission.district} />

      <div className="bars">
        <FighterBar side="hero" name="Toi" hp={m.hero.hp} max={s.health} />
        <FighterBar
          side="foe"
          name={m.enemies[0]?.name ?? 'Vague suivante…'}
          hp={m.enemies.reduce((sum, e) => sum + Math.max(0, e.hp), 0)}
          max={Math.max(1, m.enemies.reduce((sum, e) => sum + e.maxHp, 0))}
        />
      </div>

      <button
        className="ghost"
        onClick={() =>
          store.act((st) => loseMission(st, 'Mission abandonnée : défaite, clé rendue.'))
        }
      >
        Abandonner
      </button>
    </>
  );
}
