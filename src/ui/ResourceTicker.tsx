import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { formatNum } from '../game/engine';
import { RESOURCES, type ResourceId } from '../game/resources';
import { useGame } from '../game/store';
import { ResIcon } from './ResIcon';
import { C } from './theme';

/**
 * Compteur d'une ressource : à chaque gain, le montant s'affiche en vert au-dessus.
 * Sans ça, un butin qui tombe pendant qu'on regarde le combat passe inaperçu.
 *
 * L'annonce est purement locale : rien n'est stocké dans la sauvegarde.
 */

interface Gain {
  id: number;
  amount: number;
}

export function ResourceTicker({ id }: { id: ResourceId }) {
  const state = useGame();
  const value = state.resources[id];
  const [gains, setGains] = useState<Gain[]>([]);
  const previous = useRef(value);
  const nextId = useRef(0);

  useEffect(() => {
    const delta = value - previous.current;
    previous.current = value;
    // Les micro-gains du combat au goutte-à-goutte n'ont pas à clignoter en
    // permanence : on n'annonce qu'un gain qui se voit.
    if (delta <= 0 || delta < 0.5) return;
    const gain = { id: ++nextId.current, amount: delta };
    setGains((list) => [...list, gain].slice(-3));
    const timer = setTimeout(() => setGains((list) => list.filter((g) => g.id !== gain.id)), 900);
    return () => clearTimeout(timer);
  }, [value]);

  const def = RESOURCES.find((r) => r.id === id);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <ResIcon id={id} />
      <Text style={{ color: def?.color ? tint(id) : C.fg, fontSize: 12.5, fontVariant: ['tabular-nums'] }}>
        {formatNum(value)}
      </Text>
      {gains.length > 0 && (
        <Text style={{ position: 'absolute', top: -12, right: 0, fontSize: 11, color: C.essence }}>
          +{formatNum(gains[gains.length - 1].amount)}
        </Text>
      )}
    </View>
  );
}

/**
 * Couleur du compteur. Les variables CSS n'existent plus : la palette vient du
 * thème, et chaque monnaie garde la teinte de son liquide.
 */
function tint(id: ResourceId): string {
  switch (id) {
    case 'essence':
      return C.essence;
    case 'reagent':
      return C.reagent;
    case 'insight':
      return C.insight;
    case 'shard':
      return C.shard;
    case 'catalyst':
      return C.catalyst;
    case 'goldCoin':
      return C.goldCoin;
  }
}
