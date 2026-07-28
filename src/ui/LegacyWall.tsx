import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { LEGACIES, legacyLevel } from '../game/ascension';
import type { GameState } from '../game/types';
import { C } from './theme';

/**
 * Le mur des legs (direction-artistique.md §4) : six objets accrochés au mur du
 * fond, éteints tant qu'ils ne sont pas achetés, illuminés ensuite. C'est le
 * trophée du prestige — on le lit sans lire un seul chiffre.
 */
const GLYPHS: Record<string, ReactNode> = {
  // Cœur de brume — un cristal.
  core: <Path d="M12 3 L19 11 L12 21 L5 11 Z" />,
  // Sel primordial — une clé.
  salt: (
    <>
      <Circle cx="8" cy="8" r="4" />
      <Path d="M11 11 L19 19 M16 19 h4 M19 16 v4" />
    </>
  ),
  // Registre sauvé — un carnet.
  register: (
    <>
      <Rect x="5" y="4" width="14" height="16" rx="2" />
      <Path d="M9 8 h6 M9 12 h6 M9 16 h4" />
    </>
  ),
  // Verre ancien — un prisme.
  glass: (
    <>
      <Path d="M12 4 L20 19 H4 Z" />
      <Path d="M12 4 v15" />
    </>
  ),
  // Alambic hérité — un alambic miniature.
  heirloom: (
    <>
      <Path d="M9 4 h6 v4 l3 6 v5 a2 2 0 0 1-2 2 H8 a2 2 0 0 1-2-2 v-5 l3-6 Z" />
      <Path d="M18 10 c4 0 4 6 0 6" />
    </>
  ),
  // Mémoire de la ville — une lentille.
  memory: (
    <>
      <Circle cx="11" cy="11" r="6" />
      <Path d="M15.5 15.5 L20 20" />
    </>
  ),
};

export function LegacyWall({
  state,
  selected,
  onSelect,
}: {
  state: GameState;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {LEGACIES.map((legacy) => {
        const level = legacyLevel(state, legacy.id);
        // Plus le legs est monté, plus il brille.
        const glow = Math.min(1, level / legacy.max);
        return (
          <Pressable
            key={legacy.id}
            accessibilityLabel={`${legacy.name}, niveau ${level}`}
            onPress={() => onSelect(legacy.id)}
            style={{
              width: 52,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: selected === legacy.id ? C.shard : C.line,
              backgroundColor: level > 0 ? 'rgba(224, 208, 255, 0.08)' : 'transparent',
            }}
          >
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <G
                fill="none"
                stroke={C.shard}
                strokeWidth={1.4}
                strokeLinejoin="round"
                opacity={level > 0 ? 0.55 + glow * 0.45 : 0.4}
              >
                {GLYPHS[legacy.id]}
              </G>
            </Svg>
          </Pressable>
        );
      })}
    </View>
  );
}
