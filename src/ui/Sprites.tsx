/**
 * Silhouettes provisoires, en SVG.
 *
 * La direction artistique demande du pixel art 64×64 en atlas PNG
 * (direction-artistique.md §1 et §7) : ces sprites ne sont pas encore produits.
 * En attendant, ces silhouettes vectorielles respectent les règles qui comptent
 * pour la lisibilité — forme avant détail, palette désaturée sauf les liquides,
 * lecture correcte en niveaux de gris — et les composants exposent déjà les
 * mêmes états (`idle`, `throw`, `hurt`, `death`) qu'une spritesheet remplacera
 * sans toucher aux vues.
 */

export type HeroState = "idle" | "throw" | "hurt" | "death";

const VIALS = [
  "#4fd6a0",
  "#d68b3f",
  "#7f9dff",
  "#9b7fe0",
  "#cdd6dd",
  "#e8a33d",
];

export function HeroSprite({ state = "idle" }: { state?: HeroState }) {
  return (
    <svg
      className={`sprite hero ${state}`}
      viewBox="0 0 64 64"
      role="img"
      aria-label="L'alchimiste"
    >
      {/* Halo de la lanterne : la seule lumière chaude du jeu. */}
      <circle
        className="lantern-glow"
        cx="45"
        cy="42"
        r="13"
        fill="url(#lantern)"
      />
      <defs>
        <radialGradient id="lantern">
          <stop offset="0%" stopColor="#ffcf87" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffcf87" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="hero-body">
        {/* Manteau de cuir huilé, ourlet lourd. */}
        <path
          d="M24 26 L40 26 L44 56 L20 56 Z"
          fill="#6b4b34"
          stroke="#4a3324"
          strokeWidth="1.5"
        />
        <path d="M32 26 L32 56" stroke="#4a3324" strokeWidth="1" />
        {/* Tête et masque à filtre : verres ronds, bec court. */}
        <circle
          cx="32"
          cy="19"
          r="8"
          fill="#3d4557"
          stroke="#262b36"
          strokeWidth="1.5"
        />
        <circle cx="29" cy="18" r="2.6" fill="#a8c4cc" />
        <circle cx="35" cy="18" r="2.6" fill="#a8c4cc" />
        <path d="M30 24 L34 24 L33 27 L31 27 Z" fill="#262b36" />
        {/* Bandoulière de fioles : le détail signature. */}
        <path d="M25 28 L41 40" stroke="#8a6544" strokeWidth="3" />
        {VIALS.map((c, i) => (
          <rect
            key={i}
            x={26 + i * 2.6}
            y={29 + i * 1.9}
            width="2"
            height="4"
            rx="0.6"
            fill={c}
          />
        ))}
        {/* Lanterne à la ceinture. */}
        <rect
          className="lantern"
          x="43"
          y="39"
          width="4"
          height="6"
          rx="1"
          fill="#8a6544"
        />
        <rect
          className="lantern-flame"
          x="44"
          y="41"
          width="2"
          height="3"
          fill="#ffcf87"
        />
      </g>

      {/* Fiole lancée : apparaît le temps de l'animation de frappe. */}
      <circle className="thrown" cx="46" cy="34" r="2.4" fill="#4fd6a0" />
    </svg>
  );
}

export type FoeState = "enter" | "idle" | "hurt" | "death";

/**
 * Les ennemis sont des habitants transformés par ce qu'ils ont respiré (§3) :
 * trois archétypes humanoïdes par district, plus un gardien plus grand.
 * L'archétype dérive de la vague, la teinte du cycle.
 */
export function FoeSprite({
  archetype,
  guardian,
  cycle,
  state = "idle",
}: {
  archetype: number;
  guardian: boolean;
  cycle: number;
  state?: FoeState;
}) {
  // Un rai de lumière sur le contour : sans lui la silhouette se noie dans le
  // fond, et la règle « lisible en niveaux de gris » (§7) n'est plus tenue.
  const body = ["#39414f", "#3f3a4e", "#354444"][archetype % 3];
  const rim = "#7d8a9c";
  return (
    <svg
      className={`sprite foe ${state} ${cycle > 0 ? "cycled" : ""} ${guardian ? "guardian" : ""}`}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Habitant transformé"
    >
      {/* L'ennemi regarde vers la gauche : miroir interne au SVG, pour qu'aucune
          animation CSS de transform ne puisse l'annuler. */}
      <g transform="translate(64,0) scale(-1,1)">
        <g className="foe-body">
          {/* Silhouette humanoïde voûtée, épaules lourdes. */}
          <path
            d={
              guardian
                ? "M20 24 L44 24 L48 58 L16 58 Z"
                : "M24 26 L40 26 L43 58 L21 58 Z"
            }
            fill={body}
            stroke={rim}
            strokeWidth="1.4"
          />
          <circle
            cx="32"
            cy={guardian ? 16 : 19}
            r={guardian ? 9 : 7}
            fill={body}
            stroke={rim}
            strokeWidth="1.4"
          />
          {/* Accessoire d'archétype : crochet, sac, ou main de verre. */}
          {archetype % 3 === 0 && (
            <path
              d="M44 30 L52 30 L52 40"
              stroke="#545d72"
              strokeWidth="2.5"
              fill="none"
            />
          )}
          {archetype % 3 === 1 && (
            <rect x="43" y="34" width="9" height="10" rx="2" fill="#4a3324" />
          )}
          {archetype % 3 === 2 && (
            <circle cx="47" cy="38" r="5" fill="#a8c4cc" opacity="0.7" />
          )}
          {/* Yeux : deux points pâles, seul signe de vie. */}
          <circle cx="29" cy={guardian ? 15 : 18} r="1.2" fill="#a8c4cc" />
          <circle cx="35" cy={guardian ? 15 : 18} r="1.2" fill="#a8c4cc" />
        </g>
      </g>
    </svg>
  );
}
