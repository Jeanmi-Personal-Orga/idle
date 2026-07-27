import { resourceDef, type ResourceId } from '../game/resources';

/**
 * Icône d'une ressource, découpée dans la planche `coin.png`.
 *
 * Les trois monnaies métalliques ont une vraie animation de rotation dans la
 * planche : six frames alignées, jouées en `steps()` — donc sans une ligne de
 * JavaScript par image. Les gemmes n'en ont pas : elles reçoivent un battement
 * de lumière, pour que rien ne paraisse figé.
 */

/** Ressources dont la planche fournit une rotation complète. */
const SPINNING: ResourceId[] = ['goldCoin', 'essence', 'reagent'];
/**
 * Seize cases, dont douze de face pleine : à 16 px, les frames de tranche font
 * deux pixels de large et la pièce semble disparaître. La rotation ne doit être
 * qu'un bref clin d'œil.
 */
const SPIN_FRAMES = 16;

export function ResIcon({ id, size = 16 }: { id: ResourceId; size?: number }) {
  const def = resourceDef(id);
  const label = `${def.name} — ${def.use}`;

  if (SPINNING.includes(id)) {
    return (
      <span
        className="res-icon spin"
        role="img"
        aria-label={def.name}
        title={label}
        style={{
          width: size,
          height: size,
          backgroundImage: // Le nombre de frames est dans le nom : changer la disposition change l'URL,
          // donc aucun cache ne peut servir une bande à l'ancien découpage.
          `url(/sprites/ui/${id}-spin${SPIN_FRAMES}.png)`,
          backgroundSize: `${size * SPIN_FRAMES}px ${size}px`,
          // L'animation se joue en **pixels**, pas en pourcentage : un
          // pourcentage de background-position se calcule sur (taille de
          // l'élément − taille de l'image), ce qui inverse le sens dès que la
          // bande est plus large que l'icône.
          ['--spin-end' as string]: `-${size * SPIN_FRAMES}px`,
          // Décalage par monnaie : les pièces ne tournent pas au même instant,
          // sinon elles clignotent toutes ensemble.
          animationDelay: `${SPINNING.indexOf(id) * 0.7}s`,
        }}
      />
    );
  }

  return (
    <img
      className="res-icon pulse"
      src={def.icon}
      alt={def.name}
      title={label}
      style={{ height: size }}
    />
  );
}
