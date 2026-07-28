import { Pressable } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { PURITIES } from '../game/content';
import { purityWeights } from '../game/formulas';
import type { GameState } from '../game/types';
import type { Mods } from '../game/modifiers';

/**
 * Le laboratoire en coupe (direction-artistique.md §4). Le chaudron raconte
 * l'état du jeu sans un seul chiffre :
 *
 * - progression de la distillation → le niveau du liquide monte dans la fiole ;
 * - palier probable du résultat → couleur de la vapeur en sortie de serpentin ;
 * - réactifs à zéro → le foyer s'éteint, le chaudron devient froid et gris.
 *
 * Le mobilier apparaît par paliers de niveau : la pièce grandit avec le joueur.
 *
 * Depuis le passage à React Native, le dessin est rendu par `react-native-svg`. Les
 * animations qui venaient du CSS — bulles qui remontent, vapeur qui ondule, braises
 * qui palpitent — ont été remplacées par des états fixes : le chaudron reste
 * lisible, mais il ne frémit plus. C'est le seul recul assumé de la migration.
 */
export function Cauldron({
  state,
  mods,
  onPress,
}: {
  state: GameState;
  mods: Mods;
  onPress?: () => void;
}) {
  const d = state.distilling;
  const progress = d ? 1 - d.remaining / d.total : 0;
  const lit = state.resources.reagent > 0 || !!d;
  const brewing = !!d;

  // La vapeur prend la couleur du palier le plus probable.
  const weights = purityWeights(state.labLevel, mods);
  const likely = weights.indexOf(Math.max(...weights));
  const vapour = PURITIES[Math.max(0, likely)].color;

  const lvl = state.labLevel;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="image"
      accessibilityLabel={
        brewing
          ? `Distillation en cours, ${Math.round(progress * 100)} %`
          : lit
            ? 'Chaudron prêt'
            : 'Chaudron froid, plus de réactifs'
      }
      // Le chaudron froid est grisé : c'est le signal « plus de réactifs ».
      style={{ opacity: lit ? 1 : 0.55, alignItems: 'center' }}
    >
      <Svg width="100%" height={170} viewBox="0 0 200 130">
      {/* Pas de mur ni de sol peints : la scène est transparente et s'assoit sur
          le fond de la carte, pour que tout appartienne au même laboratoire.
          Seule une ombre au sol pose les objets. */}
      <Ellipse cx="100" cy="106" rx="92" ry="7" fill="rgba(0,0,0,0.35)" />

      {/* Le mur du fond s'ouvre sur la brume passé le niveau 100 (§4). */}
      {lvl >= 100 && <Rect x="120" y="14" width="66" height="60" fill="#3d4557" opacity="0.5" />}

      {/* Étagères et fioles rangées : à partir du niveau 11. */}
      {lvl >= 11 && (
        <G>
          <Rect x="14" y="34" width="46" height="2.5" fill="#4a3324" />
          {[0, 1, 2, 3].map((i) => (
            <Rect
              key={i}
              x={17 + i * 11}
              y={26}
              width="5"
              height="8"
              rx="1"
              fill={['#4fd6a0', '#d68b3f', '#7f9dff', '#a8c4cc'][i]}
              opacity="0.85"
            />
          ))}
        </G>
      )}

      {/* Mur d'alambics secondaires et table de notes : niveau 26. */}
      {lvl >= 26 && (
        <G opacity="0.9">
          <Rect x="150" y="60" width="16" height="20" rx="3" fill="#3d4557" stroke="#545d72" />
          <Rect x="170" y="66" width="12" height="14" rx="3" fill="#3d4557" stroke="#545d72" />
          <Rect x="146" y="86" width="42" height="3" fill="#4a3324" />
        </G>
      )}

      {/* Tuyauterie de cuivre au plafond : niveau 51. */}
      {lvl >= 51 && (
        <Path d="M4 10 H196" stroke="#8a6544" strokeWidth="4" strokeLinecap="round" />
      )}

      {/* Une caisse : tout ce qu'il y a dans une cave nue. */}
      <G opacity="0.9">
        <Rect x="16" y="86" width="20" height="18" fill="#4a3324" stroke="#2f2016" />
        <Path d="M16 95 H36 M26 86 V104" stroke="#2f2016" strokeWidth="1" />
      </G>

      {/* Le chaudron, cuivré et cabossé, sur son foyer. */}
      <Path
        d="M50 58 H104 L98 96 H56 Z"
        fill={lit ? '#8a6544' : '#4a4f5c'}
        stroke="#4a3324"
        strokeWidth="2"
      />
      <Ellipse cx="77" cy="58" rx="27" ry="5.5" fill={lit ? '#6b4b34' : '#3d4557'} />
      {/* Le liquide bouillonne pendant la distillation. */}
      {brewing && (
        <>
          <Ellipse cx="77" cy="58" rx="23" ry="4" fill={vapour} opacity="0.85" />
          <G opacity={brewing ? 0.9 : 0.5}>
            <Circle cx="68" cy="56" r="2" fill={vapour} />
            <Circle cx="80" cy="55" r="1.6" fill={vapour} />
            <Circle cx="87" cy="57" r="1.2" fill={vapour} />
          </G>
        </>
      )}

      {/* Chapiteau et col de cygne : le liquide s'évapore et part vers la droite. */}
      <Path
        d="M62 56 C64 44, 90 44, 92 56"
        fill={lit ? '#6b4b34' : '#3d4557'}
        stroke="#4a3324"
        strokeWidth="2"
      />
      <Path
        d="M77 44 C77 34, 112 32, 116 42"
        fill="none"
        stroke="#8a6544"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Serpentin : trois boucles qui descendent vers le bec verseur. */}
      <Path
        d="M116 42 c10 0 10 9 0 9 c-10 0 -10 9 0 9 c10 0 10 9 0 9 L150 69 L150 78"
        fill="none"
        stroke="#8a6544"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Vapeur en sortie de chapiteau : sa couleur annonce le palier. */}
      {brewing && (
        <G opacity={0.75}>
          {[0, 1, 2].map((i) => (
            <Circle key={i} cx={92 + i * 7} cy={36 - i * 4} r={2.5 + i} fill={vapour} opacity="0.55" />
          ))}
        </G>
      )}

      {/* Foyer : braises vives s'il reste des réactifs, éteint sinon. */}
      <G opacity={lit ? 1 : 0.5}>
        <Path d="M58 96 H96 L92 104 H62 Z" fill={lit ? '#3a2a1e' : '#22252e'} />
        {lit &&
          [0, 1, 2, 3].map((i) => (
            <Circle key={i} cx={66 + i * 8} cy={100} r={2.2} fill="#ff9d4a" opacity={0.9} />
          ))}
      </G>

      {/* Fiole de collecte sur son support : le liquide qui monte EST la barre. */}
      <G>
        <Rect x="140" y="102" width="20" height="2.5" fill="#4a3324" />
        <Path
          d="M147 80 h6 v5 l4 8 v7 a2 2 0 0 1-2 2 h-10 a2 2 0 0 1-2-2 v-7 l4-8 Z"
          fill="rgba(168,196,204,0.10)"
          stroke="#a8c4cc"
          strokeWidth="1.4"
        />
        {/* Le niveau du liquide : la progression de la distillation, sans barre UI. */}
        <Rect
          x="143.5"
          y={101 - 14 * progress}
          width="13"
          height={14 * progress}
          rx="1.5"
          fill={vapour}
          opacity="0.9"
        />
      </G>
      {/* La goutte qui tombe : seul mouvement quand tout est calme. */}
      {brewing && <Circle cx="150" cy="79" r="1.6" fill={vapour} />}

      {/* Un chat, à partir du niveau 26. Il dort. */}
      {lvl >= 26 && (
        <G opacity="0.85">
          <Ellipse cx="36" cy="99" rx="11" ry="5" fill="#3d4557" />
          <Circle cx="27" cy="96" r="4" fill="#3d4557" />
          <Path d="M24 93 L25 90 L27 92 Z" fill="#3d4557" />
        </G>
      )}
      </Svg>
    </Pressable>
  );
}
