import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { formatDuration, formatNum } from '../game/engine';
import { skipCost } from '../game/formulas';
import { resourceDef } from '../game/resources';
import { ResIcon } from './ResIcon';
import { store, useGame } from '../game/store';
import {
  BRANCHES,
  NODES,
  isUnlocked,
  nodeCost,
  nodeDef,
  nodeLevel,
  nodesOf,
  research,
  researchWithGold,
  totalInvested,
  type BranchId,
  type TechNode,
} from '../game/tech';
import { Bar, Button, Card, Label, Muted, Row } from './kit';
import { C, S } from './theme';

/** L'arbre de recherche : trois branches, une par façon de progresser. */
export function TechView() {
  const state = useGame();
  const [branch, setBranch] = useState<BranchId>('puissance');
  const def = BRANCHES.find((b) => b.id === branch) ?? BRANCHES[0];
  const affordable = NODES.filter(
    (n) =>
      isUnlocked(state, n) &&
      nodeLevel(state, n.id) < n.max &&
      state.resources.insight >= nodeCost(n, nodeLevel(state, n.id)),
  ).length;

  return (
    <ScrollView contentContainerStyle={S.view}>
      <Card>
        <Label>Recherche</Label>
        <Row>
          <ResIcon id="insight" size={13} />
          <Text style={[S.text, S.small, { color: C.insight }]}>
            {formatNum(state.resources.insight)}
          </Text>
          <Muted>
            {resourceDef('insight').name.toLowerCase()} ·{' '}
            {affordable > 0 ? `${affordable} nœud(s) à portée` : 'rien à portée'}
          </Muted>
        </Row>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {BRANCHES.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setBranch(b.id)}
              style={[
                S.button,
                { flex: 1, flexDirection: 'column', gap: 2 },
                b.id === branch ? { borderColor: b.color } : S.buttonGhost,
              ]}
            >
              <Text
                style={[S.buttonText, S.small, b.id === branch && { color: b.color }]}
                numberOfLines={1}
              >
                {b.name}
              </Text>
              <Text style={[S.muted, { fontSize: 11 }]}>{totalInvested(state, b.id)} niv.</Text>
            </Pressable>
          ))}
        </View>

        <Muted>{def.blurb}</Muted>
        {state.researching && (
          <Muted>
            ⧗ Recherche en cours : {nodeDef(state.researching.id).name} ·{' '}
            {formatDuration(state.researching.remaining)} restant
          </Muted>
        )}
      </Card>

      {nodesOf(branch).map((node) => (
        <NodeCard key={node.id} node={node} color={def.color} />
      ))}
      <View style={{ height: 8 }} />
    </ScrollView>
  );
}

function NodeCard({ node, color }: { node: TechNode; color: string }) {
  const state = useGame();
  const level = nodeLevel(state, node.id);
  const unlocked = isUnlocked(state, node);
  const maxed = level >= node.max;
  const cost = nodeCost(node, level);
  const active = state.researching?.id === node.id;
  const busyOther = !!state.researching && !active;
  const affordable = !maxed && unlocked && !state.researching && state.resources.insight >= cost;

  if (!unlocked) {
    const req = node.requires!;
    return (
      <Card style={{ opacity: 0.6 }}>
        <Row between>
          <View>
            <Text style={S.bold}>{node.name}</Text>
            <Muted>
              Requiert {nodeDef(req.node).name} niv. {req.level}
            </Muted>
          </View>
          <Text style={S.muted}>🔒</Text>
        </Row>
      </Card>
    );
  }

  return (
    <Card style={maxed ? { borderColor: color } : undefined}>
      <Row between>
        <View style={{ flex: 1 }}>
          <Text style={[S.bold, maxed && { color }]}>{node.name}</Text>
          <Muted>{level > 0 ? node.effect(level) : 'aucun niveau'}</Muted>
        </View>
        <Text style={[S.label, maxed && { color }]}>
          {level} / {node.max}
        </Text>
      </Row>

      <Bar ratio={level / node.max} color={color} />

      {!maxed && (
        <>
          <Muted>Prochain : {node.effect(level + 1)}</Muted>
          {active && state.researching ? (
            <>
              {/* La recherche en cours se voit, et s'achète : le bouton est
                  toujours là, avec son prix en sacs d'or au prorata du temps. */}
              <Bar
                ratio={1 - state.researching.remaining / state.researching.total}
                color={color}
              />
              <Row between>
                <Muted>{formatDuration(state.researching.remaining)} restant</Muted>
                <Button
                  disabled={state.resources.goldCoin < skipCost(state.researching.remaining)}
                  onPress={() => store.act((s) => researchWithGold(s, node.id))}
                >
                  <Text style={S.buttonText}>Finir maintenant</Text>
                  <Text style={[S.muted, S.small]}>
                    {formatNum(skipCost(state.researching.remaining))}
                  </Text>
                  <ResIcon id="goldCoin" size={13} />
                </Button>
              </Row>
            </>
          ) : (
            <Row>
              <Button disabled={!affordable} onPress={() => store.act((s) => research(s, node.id))}>
                <Text style={S.buttonText}>Chercher</Text>
                <Text style={[S.muted, S.small]}>◇ {formatNum(cost)}</Text>
              </Button>
              {busyOther && <Muted>Une recherche est déjà en cours</Muted>}
            </Row>
          )}
        </>
      )}
    </Card>
  );
}
