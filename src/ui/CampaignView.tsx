import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  KEYS_PER_DAY,
  campaignDef,
  dailyBonus,
  missionRewards,
  type DailyMission,
} from '../game/campaigns';
import { allMissionsWon, formatNum, keysLeft, loseMission, startMission } from '../game/engine';
import { heroStats, powerScore, recommendedPower } from '../game/formulas';
import { districtLabel } from '../game/content';
import { store, useGame } from '../game/store';
import { ContractPopup } from './BrumeView';
import { Arena, FighterBar } from './Arena';
import { ResIcon } from './ResIcon';
import { Bar, Button, Card, Label, Muted, Row } from './kit';
import { C, S } from './theme';

/**
 * Les missions du jour : **trois tirages quotidiens**, un par monnaie, dont le
 * chapitre et le nombre de vagues changent chaque jour. Le combat est celui de la
 * brume — même approche, mêmes boîtes de collision, même respiration entre les
 * vagues — mais sur son propre front : la brume continue pendant ce temps.
 *
 * L'économie des clés : une clé par tentative, **rendue en cas de défaite**. On ne
 * perd donc une clé qu'en remportant une mission, et rater n'a jamais fermé la
 * journée. Trois clés offertes par jour, et les trois missions ensemble paient une
 * prime — une seule fois. Au-delà, une mission déjà remportée se rejoue pour sa
 * récompense, ce qui donne un usage aux clés achetées au comptoir.
 */
export function CampaignView() {
  const state = useGame();
  const [showContract, setShowContract] = useState(false);
  const active = state.mission;
  const power = powerScore(heroStats(state));
  const keys = keysLeft(state);
  const bought = state.keys?.bought ?? 0;
  const missions = state.daily?.missions ?? [];
  const won = missions.filter((m) => m.status === 'won').length;
  const bonus = dailyBonus(missions);

  return (
    <ScrollView contentContainerStyle={S.view}>
      <Card>
        <Row between>
          <Label>Missions du jour</Label>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.bold}>
              🔑 {state.keys?.left ?? 0} / {KEYS_PER_DAY}
              {bought > 0 ? ` + ${bought}` : ''}
            </Text>
            <Muted>{bought > 0 ? 'du jour + achetées' : 'clés du jour'}</Muted>
          </View>
        </Row>
        <Muted>
          Trois missions retirées au sort chaque jour. Une clé par tentative, rendue si
          tu tombes : seule une victoire consomme une clé. Tout est payé à la dernière
          vague. Trois clés offertes à minuit, heure de Paris — et une mission déjà
          remportée se rejoue contre une clé.
        </Muted>

        {/* La prime des trois : le vrai objectif de la journée. */}
        <Row between>
          <View style={{ flex: 1 }}>
            <Text style={S.bold}>Prime des trois missions</Text>
            <Muted>
              {state.daily?.bonusPaid
                ? 'Déjà touchée aujourd’hui'
                : `${won} / ${missions.length} remportées`}
            </Muted>
          </View>
          <Row style={{ gap: 4 }}>
            <ResIcon id="essence" size={13} />
            <Text style={[S.text, S.small, allMissionsWon(missions) && { color: C.better }]}>
              {formatNum(bonus.essence)}
            </Text>
            <ResIcon id="reagent" size={13} />
            <Text style={[S.text, S.small]}>{formatNum(bonus.reagent)}</Text>
            <ResIcon id="insight" size={13} />
            <Text style={[S.text, S.small]}>{formatNum(bonus.insight)}</Text>
            <ResIcon id="catalyst" size={13} />
            <Text style={[S.text, S.small]}>{bonus.catalyst}</Text>
          </Row>
        </Row>

        {/* Le contrat du chapitre vit ici, avec les missions : c'est le même genre
            d'objectif, et il n'avait rien à faire au-dessus du combat. */}
        <Button tone="ghost" onPress={() => setShowContract(true)}>
          <Text style={S.buttonText}>🎯 Contrat du chapitre</Text>
          {state.pendingContract && <Text style={{ color: C.essence }}>●</Text>}
        </Button>
      </Card>

      {showContract && (
        <ContractPopup best={state.combat.best} onClose={() => setShowContract(false)} />
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
          <Card key={mission.id} style={running ? { borderColor: C.essence } : undefined}>
            <Row between>
              <View style={{ flex: 1 }}>
                <Label>{campaign.name}</Label>
                <Muted>{campaign.blurb}</Muted>
              </View>
              <Text style={[S.small, { color: ready ? C.better : C.worse }]}>
                Conseillé {formatNum(advised)}
              </Text>
            </Row>

            <Row between>
              <Muted>
                {mission.waves} vagues · {districtLabel(mission.district)}
              </Muted>
              <Row style={{ gap: 4 }}>
                <ResIcon id="essence" size={13} />
                <Text style={[S.text, S.small]}>{formatNum(reward.essence)}</Text>
                <ResIcon id="reagent" size={13} />
                <Text style={[S.text, S.small]}>{formatNum(reward.reagent)}</Text>
                <ResIcon id="insight" size={13} />
                <Text style={[S.text, S.small]}>{formatNum(reward.insight)}</Text>
              </Row>
            </Row>

            {running ? (
              <MissionFight mission={mission} />
            ) : (
              <MissionButton mission={mission} busy={Boolean(active)} keys={keys} />
            )}
          </Card>
        );
      })}
      <View style={{ height: 8 }} />
    </ScrollView>
  );
}

/** Issue de la mission, et de quoi la relancer. */
function MissionButton({
  mission,
  busy,
  keys,
}: {
  mission: DailyMission;
  busy: boolean;
  keys: number;
}) {
  return (
    <>
      {mission.status === 'won' && (
        <Row between style={{ borderWidth: 1, borderColor: C.essence, borderRadius: 10, padding: 8 }}>
          <Text style={[S.bold, { color: C.essence }]}>Victoire</Text>
          <Muted>Rejouable contre une clé</Muted>
        </Row>
      )}
      {mission.status === 'lost' && (
        <Row between style={{ borderWidth: 1, borderColor: '#7a4a4a', borderRadius: 10, padding: 8 }}>
          <Text style={[S.bold, { color: C.worse }]}>Défaite</Text>
          <Muted>Clé rendue, à retenter</Muted>
        </Row>
      )}
      <Button
        tone="primary"
        disabled={busy || keys < 1}
        onPress={() => store.act((st) => startMission(st, mission.id))}
      >
        <Text style={[S.buttonText, S.buttonTextPrimary]}>
          {busy
            ? 'Une mission est en cours'
            : keys < 1
              ? 'Plus de clé — le comptoir en vend'
              : mission.status === 'lost'
                ? 'Retenter'
                : mission.status === 'won'
                  ? 'Rejouer'
                  : 'Partir'}
        </Text>
        {!busy && keys > 0 && <Text style={[S.muted, S.small]}>🔑 1</Text>}
      </Button>
    </>
  );
}

/**
 * Le combat de la mission, joué dans sa propre carte — et avec ses propres points
 * de vie : le combat de brume continue pendant ce temps, sur son propre front.
 */
function MissionFight({ mission }: { mission: DailyMission }) {
  const state = useGame();
  const m = state.mission;
  const s = heroStats(state);
  if (!m) return null;

  return (
    <>
      <Bar ratio={m.wave / m.waves} color={C.essence} />
      <Muted>
        Vague {m.wave} / {m.waves}
      </Muted>

      <Arena fight={m} scope="mission" district={mission.district} />

      <Row style={{ alignItems: 'flex-start', gap: 12 }}>
        <FighterBar side="hero" name="Toi" hp={m.hero.hp} max={s.health} />
        <FighterBar
          side="foe"
          name={m.enemies[0]?.name ?? 'Vague suivante…'}
          hp={m.enemies.reduce((sum, e) => sum + Math.max(0, e.hp), 0)}
          max={Math.max(1, m.enemies.reduce((sum, e) => sum + e.maxHp, 0))}
        />
      </Row>

      <Button
        tone="ghost"
        onPress={() =>
          store.act((st) => loseMission(st, 'Mission abandonnée : défaite, clé rendue.'))
        }
      >
        Abandonner
      </Button>
    </>
  );
}
