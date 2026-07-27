import { PURITIES } from '../game/content';
import { purityWeights } from '../game/formulas';
import type { GameState } from '../game/types';
import type { Mods } from '../game/modifiers';

let propUid = 0;

/**
 * Une case d'une planche de décor (96 × 96, famille `Cauldron and Powder`,
 * `Jars`, `Candles`, etc.), croppée via un `<clipPath>` : c'est le moyen le
 * plus simple de n'afficher qu'une case sans découper les images au préalable.
 */
function PropIcon({
  sheet,
  cols,
  rows,
  x,
  y,
  px,
  py,
  size = 12,
  opacity = 1,
}: {
  /** Chemin de la planche complète. */
  sheet: string;
  /** Dimensions de la planche, en cases. */
  cols: number;
  rows: number;
  /** Case voulue, colonne puis ligne (0-indexé). */
  x: number;
  y: number;
  /** Position dans la scène, en unités du viewBox. */
  px: number;
  py: number;
  /** Côté de la case affichée, en unités du viewBox. */
  size?: number;
  opacity?: number;
}) {
  const id = `prop-${++propUid}`;
  return (
    <g transform={`translate(${px}, ${py})`} opacity={opacity}>
      <clipPath id={id}>
        <rect x="0" y="0" width={size} height={size} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <image
          href={sheet}
          x={-x * size}
          y={-y * size}
          width={cols * size}
          height={rows * size}
          preserveAspectRatio="none"
        />
      </g>
    </g>
  );
}

/**
 * Le laboratoire en coupe (direction-artistique.md §4). Le chaudron raconte
 * l'état du jeu sans un seul chiffre :
 *
 * - progression de la distillation → le niveau du liquide monte dans la fiole ;
 * - palier probable du résultat → couleur de la vapeur en sortie de serpentin ;
 * - réactifs à zéro → le foyer s'éteint, le chaudron devient froid et gris.
 *
 * Le mobilier apparaît par paliers de niveau : la pièce grandit avec le joueur.
 */
export function Cauldron({
  state,
  mods,
  onClick,
}: {
  state: GameState;
  mods: Mods;
  onClick?: () => void;
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
    <svg
      className={`lab-scene ${lit ? 'lit' : 'cold'} ${brewing ? 'brewing' : ''} ${
        onClick ? 'clickable' : ''
      }`}
      viewBox="0 0 200 130"
      role="img"
      aria-label={
        brewing
          ? `Distillation en cours, ${Math.round(progress * 100)} %`
          : lit
            ? 'Chaudron prêt'
            : 'Chaudron froid, plus de réactifs'
      }
      onClick={onClick}
    >
      {/* Mur et sol de pierre noyée. */}
      <rect x="0" y="0" width="200" height="130" fill="#1a1d26" />
      <rect x="0" y="104" width="200" height="26" fill="#262b36" />

      {/* Le mur du fond s'ouvre sur la brume passé le niveau 100 (§4). */}
      {lvl >= 100 && <rect x="120" y="14" width="66" height="60" fill="#3d4557" opacity="0.5" />}
      {/* Un regard dans la brume — clin d'œil discret pour qui reste assez longtemps. */}
      {lvl >= 100 && (
        <PropIcon sheet="/sprites/props/eyes.png" cols={8} rows={4} x={2} y={1} px={150} py={30} size={10} opacity={0.75} />
      )}

      {/* Étagères et fioles rangées : à partir du niveau 11. */}
      {lvl >= 11 && (
        <g>
          <rect x="14" y="34" width="46" height="2.5" fill="#4a3324" />
          {[0, 1, 2, 3].map((i) => (
            <rect
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
          {/* Deux vrais bocaux de la planche `Jars`, au bout de l'étagère. */}
          <PropIcon sheet="/sprites/props/jars.png" cols={10} rows={6} x={0} y={0} px={6} py={20} size={9} />
          <PropIcon sheet="/sprites/props/jars.png" cols={10} rows={6} x={1} y={0} px={14} py={20} size={9} />
        </g>
      )}

      {/* Mur d'alambics secondaires et table de notes : niveau 26. */}
      {lvl >= 26 && (
        <g opacity="0.9">
          <rect x="150" y="60" width="16" height="20" rx="3" fill="#3d4557" stroke="#545d72" />
          <rect x="170" y="66" width="12" height="14" rx="3" fill="#3d4557" stroke="#545d72" />
          <rect x="146" y="86" width="42" height="3" fill="#4a3324" />
          {/* Une paire de bougies pour la lumière d'ambiance, près du chat. */}
          <PropIcon sheet="/sprites/props/candles.png" cols={16} rows={10} x={0} y={0} px={42} py={90} size={8} />
          <PropIcon sheet="/sprites/props/candles.png" cols={16} rows={10} x={2} y={0} px={50} py={90} size={8} />
          {/* Un outil accroché au mur des alambics secondaires. */}
          <PropIcon sheet="/sprites/props/equipment.png" cols={8} rows={8} x={1} y={2} px={172} py={64} size={9} />
        </g>
      )}

      {/* Tuyauterie de cuivre au plafond : niveau 51. */}
      {lvl >= 51 && (
        <path d="M4 10 H196" stroke="#8a6544" strokeWidth="4" strokeLinecap="round" />
      )}

      {/* Une caisse : tout ce qu'il y a dans une cave nue. */}
      <g opacity="0.9">
        <rect x="16" y="86" width="20" height="18" fill="#4a3324" stroke="#2f2016" />
        <path d="M16 95 H36 M26 86 V104" stroke="#2f2016" strokeWidth="1" />
      </g>

      {/* Une plante en pot, au sol contre la caisse : niveau 11, aux côtés des étagères. */}
      {lvl >= 11 && (
        <PropIcon sheet="/sprites/props/plants.png" cols={8} rows={6} x={0} y={0} px={5} py={90} size={9} />
      )}

      {/* Un gemme et une fiole posés sur la caisse : purement décoratif. */}
      <PropIcon sheet="/sprites/props/gems.png" cols={7} rows={6} x={0} y={0} px={17} py={78} size={9} />
      <PropIcon sheet="/sprites/props/potions.png" cols={19} rows={12} x={1} y={0} px={27} py={78} size={8} />

      {/* Poudre et bocal du même sachet que le chaudron, posés devant le foyer. */}
      <PropIcon sheet="/sprites/props/cauldron.png" cols={12} rows={7} x={1} y={1} px={40} py={98} size={10} opacity={0.9} />
      <PropIcon sheet="/sprites/props/cauldron.png" cols={12} rows={7} x={0} y={2} px={108} py={99} size={9} opacity={0.85} />

      {/* Le chaudron, cuivré et cabossé, sur son foyer. */}
      <path
        d="M50 58 H104 L98 96 H56 Z"
        fill={lit ? '#8a6544' : '#4a4f5c'}
        stroke="#4a3324"
        strokeWidth="2"
      />
      <ellipse cx="77" cy="58" rx="27" ry="5.5" fill={lit ? '#6b4b34' : '#3d4557'} />
      {/* Le liquide bouillonne pendant la distillation. */}
      {brewing && (
        <>
          <ellipse cx="77" cy="58" rx="23" ry="4" fill={vapour} opacity="0.85" />
          <g className="bubbles">
            <circle cx="68" cy="56" r="2" fill={vapour} />
            <circle cx="80" cy="55" r="1.6" fill={vapour} />
            <circle cx="87" cy="57" r="1.2" fill={vapour} />
          </g>
        </>
      )}

      {/* Chapiteau et col de cygne : le liquide s'évapore et part vers la droite. */}
      <path
        d="M62 56 C64 44, 90 44, 92 56"
        fill={lit ? '#6b4b34' : '#3d4557'}
        stroke="#4a3324"
        strokeWidth="2"
      />
      <path
        d="M77 44 C77 34, 112 32, 116 42"
        fill="none"
        stroke="#8a6544"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Serpentin : trois boucles qui descendent vers le bec verseur. */}
      <path
        d="M116 42 c10 0 10 9 0 9 c-10 0 -10 9 0 9 c10 0 10 9 0 9 L150 69 L150 78"
        fill="none"
        stroke="#8a6544"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Vapeur en sortie de chapiteau : sa couleur annonce le palier. */}
      {brewing && (
        <g className="vapour">
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={92 + i * 7} cy={36 - i * 4} r={2.5 + i} fill={vapour} opacity="0.55" />
          ))}
        </g>
      )}

      {/* Foyer : braises vives s'il reste des réactifs, éteint sinon. */}
      <g className="embers">
        <path d="M58 96 H96 L92 104 H62 Z" fill={lit ? '#3a2a1e' : '#22252e'} />
        {lit &&
          [0, 1, 2, 3].map((i) => (
            <circle key={i} cx={66 + i * 8} cy={100} r={2.2} fill="#ff9d4a" opacity={0.9} />
          ))}
      </g>

      {/* Fiole de collecte sur son support : le liquide qui monte EST la barre. */}
      <g>
        <rect x="140" y="102" width="20" height="2.5" fill="#4a3324" />
        <path
          d="M147 80 h6 v5 l4 8 v7 a2 2 0 0 1-2 2 h-10 a2 2 0 0 1-2-2 v-7 l4-8 Z"
          fill="rgba(168,196,204,0.10)"
          stroke="#a8c4cc"
          strokeWidth="1.4"
        />
        {/* Le niveau du liquide : la progression de la distillation, sans barre UI. */}
        <rect
          x="143.5"
          y={101 - 14 * progress}
          width="13"
          height={14 * progress}
          rx="1.5"
          fill={vapour}
          opacity="0.9"
        />
      </g>
      {/* La goutte qui tombe : seul mouvement quand tout est calme. */}
      {brewing && <circle className="drip" cx="150" cy="79" r="1.6" fill={vapour} />}

      {/* Un chat, à partir du niveau 26. Il dort. */}
      {lvl >= 26 && (
        <g opacity="0.85">
          <ellipse cx="36" cy="99" rx="11" ry="5" fill="#3d4557" />
          <circle cx="27" cy="96" r="4" fill="#3d4557" />
          <path d="M24 93 L25 90 L27 92 Z" fill="#3d4557" />
        </g>
      )}
    </svg>
  );
}
