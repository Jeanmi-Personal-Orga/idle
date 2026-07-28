import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import {
  ASCEND_UNLOCK_DISTRICT,
  LEGACIES,
  buyLegacy,
  buyLegacyMax,
  canBuyLegacy,
  hasUnlockedAscension,
  legacyCost,
  legacyDef,
  legacyLevel,
  nextDistrictGain,
  shardGain,
} from '../game/ascension';
import { DISTRICTS, districtLabel } from '../game/content';
import { ascend, formatNum } from '../game/engine';
import { store, useGame } from '../game/store';
import { LegacyWall } from './LegacyWall';
import { Bar, Button, Card, Label, Muted, Row } from './kit';
import { C, S } from './theme';

/**
 * La dissolution : on casse son propre laboratoire pour en tirer des éclats, et
 * des legs qui traversent les parties.
 */
export function AscendView() {
  const state = useGame();
  const unlocked = hasUnlockedAscension(state);
  const gain = shardGain(state);
  const next = nextDistrictGain(state);
  const [selected, setSelected] = useState(LEGACIES[0].id);
  const legacy = legacyDef(selected);
  const level = legacyLevel(state, selected);
  const maxed = level >= legacy.max;
  const cost = legacyCost(legacy, level);
  const affordable = canBuyLegacy(state, legacy);

  /**
   * La dissolution est irréversible : on demande confirmation. `Alert` remplace le
   * `confirm()` du navigateur, qui n'existe pas en natif.
   */
  const confirmAscend = () =>
    Alert.alert(
      'Dissoudre le laboratoire ?',
      `Tu récupères ${gain} éclats. La progression matérielle repart de zéro.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Dissoudre', style: 'destructive', onPress: () => store.act(ascend) },
      ],
    );

  return (
    <ScrollView contentContainerStyle={S.view}>
      <Card style={{ backgroundColor: '#171a24' }}>
        <Row between>
          <View>
            <Label>Dissolution</Label>
            <Muted>
              {state.ascension.count === 0
                ? 'Jamais dissous'
                : `${state.ascension.count} dissolution(s) · écho +${Math.round(
                    state.ascension.count * 12,
                  )} %`}
            </Muted>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[S.label, { color: C.shard }]}>
              ✧ {formatNum(state.resources.shard)}
            </Text>
            <Muted>éclats</Muted>
          </View>
        </Row>

        {!unlocked ? (
          <Muted>
            Verrouillé. Atteins {DISTRICTS[ASCEND_UNLOCK_DISTRICT].name} une fois pour
            apprendre à dissoudre ton propre laboratoire.
          </Muted>
        ) : (
          <>
            <Muted>
              Repartent de zéro : essence, réactifs, élixirs, districts, laboratoire.
              {'\n'}
              Restent acquis : recherche, éclats, legs, écho des dissolutions.
            </Muted>
            <Button tone="primary" disabled={gain <= 0} onPress={confirmAscend}>
              <Text style={[S.buttonText, S.buttonTextPrimary]}>Dissoudre</Text>
              <Text style={[S.muted, S.small]}>✧ {formatNum(gain)}</Text>
            </Button>
            <Muted>
              En poussant jusqu'à {districtLabel(state.combat.district + 1)} : ✧{' '}
              {formatNum(next)}.
            </Muted>
          </>
        )}
      </Card>

      {/* Le mur du fond : les six legs, éteints ou illuminés. */}
      <Card>
        <Label>Le mur des legs</Label>
        <LegacyWall state={state} selected={selected} onSelect={setSelected} />

        <Row between>
          <View style={{ flex: 1 }}>
            <Text style={[S.bold, level > 0 && { color: C.shard }]}>{legacy.name}</Text>
            <Muted>{level > 0 ? legacy.effect(level) : 'jamais scellé'}</Muted>
          </View>
          <Text style={S.label}>
            {level} / {legacy.max}
          </Text>
        </Row>

        <Bar ratio={level / legacy.max} color={C.shard} />

        {maxed ? (
          <Muted>Legs complet.</Muted>
        ) : (
          <>
            <Muted>Prochain : {legacy.effect(level + 1)}</Muted>
            <Row>
              <Button disabled={!affordable} onPress={() => store.act((s) => buyLegacy(s, legacy.id))}>
                <Text style={S.buttonText}>Sceller</Text>
                <Text style={[S.muted, S.small]}>✧ {formatNum(cost)}</Text>
              </Button>
              <Button
                tone="ghost"
                disabled={!affordable}
                onPress={() => store.act((s) => buyLegacyMax(s, legacy.id))}
              >
                Max
              </Button>
            </Row>
          </>
        )}
      </Card>
      <View style={{ height: 8 }} />
    </ScrollView>
  );
}
