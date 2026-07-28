/**
 * Registre des images. Metro n'accepte pas de chemin calculé dans `require` : il
 * doit voir chaque fichier littéralement pour l'empaqueter. D'où cette table, qui
 * remplace les URL `/sprites/...` de la version web.
 *
 * Généré par `node scripts/asset-registry.mjs` — à relancer après tout ajout de
 * planche.
 */
import type { ImageSourcePropType } from 'react-native';

type ImageSource = ImageSourcePropType;

export const IMAGES: Record<string, ImageSource> = {
  'bg/forest-1': require('../assets/sprites/bg/forest-1.png') as ImageSource,
  'bg/forest-2': require('../assets/sprites/bg/forest-2.png') as ImageSource,
  'bg/forest-3': require('../assets/sprites/bg/forest-3.png') as ImageSource,
  'bg/forest-4': require('../assets/sprites/bg/forest-4.png') as ImageSource,
  'bg/forest-5': require('../assets/sprites/bg/forest-5.png') as ImageSource,
  'chars/barbarian': require('../assets/sprites/chars/barbarian.png') as ImageSource,
  'chars/fighter': require('../assets/sprites/chars/fighter.png') as ImageSource,
  'chars/knight-a': require('../assets/sprites/chars/knight-a.png') as ImageSource,
  'chars/knight-b': require('../assets/sprites/chars/knight-b.png') as ImageSource,
  'foes/bat/attack': require('../assets/sprites/foes/bat/attack.png') as ImageSource,
  'foes/bat/death': require('../assets/sprites/foes/bat/death.png') as ImageSource,
  'foes/bat/hurt': require('../assets/sprites/foes/bat/hurt.png') as ImageSource,
  'foes/bat/idle': require('../assets/sprites/foes/bat/idle.png') as ImageSource,
  'foes/bat/walk': require('../assets/sprites/foes/bat/walk.png') as ImageSource,
  'foes/golem-orange/attack': require('../assets/sprites/foes/golem-orange/attack.png') as ImageSource,
  'foes/golem-orange/death': require('../assets/sprites/foes/golem-orange/death.png') as ImageSource,
  'foes/golem-orange/hurt': require('../assets/sprites/foes/golem-orange/hurt.png') as ImageSource,
  'foes/golem-orange/idle': require('../assets/sprites/foes/golem-orange/idle.png') as ImageSource,
  'foes/golem-orange/walk': require('../assets/sprites/foes/golem-orange/walk.png') as ImageSource,
  'foes/golem/attack': require('../assets/sprites/foes/golem/attack.png') as ImageSource,
  'foes/golem/death': require('../assets/sprites/foes/golem/death.png') as ImageSource,
  'foes/golem/hurt': require('../assets/sprites/foes/golem/hurt.png') as ImageSource,
  'foes/golem/idle': require('../assets/sprites/foes/golem/idle.png') as ImageSource,
  'foes/golem/walk': require('../assets/sprites/foes/golem/walk.png') as ImageSource,
  'foes/mushroom/attack': require('../assets/sprites/foes/mushroom/attack.png') as ImageSource,
  'foes/mushroom/death': require('../assets/sprites/foes/mushroom/death.png') as ImageSource,
  'foes/mushroom/hurt': require('../assets/sprites/foes/mushroom/hurt.png') as ImageSource,
  'foes/mushroom/idle': require('../assets/sprites/foes/mushroom/idle.png') as ImageSource,
  'foes/mushroom/walk': require('../assets/sprites/foes/mushroom/walk.png') as ImageSource,
  'foes/skeleton-yellow/attack': require('../assets/sprites/foes/skeleton-yellow/attack.png') as ImageSource,
  'foes/skeleton-yellow/death': require('../assets/sprites/foes/skeleton-yellow/death.png') as ImageSource,
  'foes/skeleton-yellow/hurt': require('../assets/sprites/foes/skeleton-yellow/hurt.png') as ImageSource,
  'foes/skeleton-yellow/idle': require('../assets/sprites/foes/skeleton-yellow/idle.png') as ImageSource,
  'foes/skeleton-yellow/walk': require('../assets/sprites/foes/skeleton-yellow/walk.png') as ImageSource,
  'foes/skeleton/attack': require('../assets/sprites/foes/skeleton/attack.png') as ImageSource,
  'foes/skeleton/death': require('../assets/sprites/foes/skeleton/death.png') as ImageSource,
  'foes/skeleton/hurt': require('../assets/sprites/foes/skeleton/hurt.png') as ImageSource,
  'foes/skeleton/idle': require('../assets/sprites/foes/skeleton/idle.png') as ImageSource,
  'foes/skeleton/walk': require('../assets/sprites/foes/skeleton/walk.png') as ImageSource,
  'foes/stalker/attack': require('../assets/sprites/foes/stalker/attack.png') as ImageSource,
  'foes/stalker/death': require('../assets/sprites/foes/stalker/death.png') as ImageSource,
  'foes/stalker/hurt': require('../assets/sprites/foes/stalker/hurt.png') as ImageSource,
  'foes/stalker/idle': require('../assets/sprites/foes/stalker/idle.png') as ImageSource,
  'foes/stalker/walk': require('../assets/sprites/foes/stalker/walk.png') as ImageSource,
  'ui/catalyst': require('../assets/sprites/ui/catalyst.png') as ImageSource,
  'ui/essence-spin16': require('../assets/sprites/ui/essence-spin16.png') as ImageSource,
  'ui/essence': require('../assets/sprites/ui/essence.png') as ImageSource,
  'ui/goldCoin-spin16': require('../assets/sprites/ui/goldCoin-spin16.png') as ImageSource,
  'ui/goldCoin': require('../assets/sprites/ui/goldCoin.png') as ImageSource,
  'ui/insight': require('../assets/sprites/ui/insight.png') as ImageSource,
  'ui/reagent-spin16': require('../assets/sprites/ui/reagent-spin16.png') as ImageSource,
  'ui/reagent': require('../assets/sprites/ui/reagent.png') as ImageSource,
};

/**
 * Image d'une planche. Accepte les chemins du catalogue (`/sprites/foes/bat/idle.png`)
 * comme les clés brutes (`foes/bat/idle`) : le catalogue de sprites est partagé
 * avec les scripts de vérification, donc il garde ses chemins d'origine.
 *
 * Une clé absente renvoie `undefined` plutôt que de lever : un sprite manquant ne
 * doit pas faire tomber tout l'écran, seulement laisser un trou.
 */
export function image(path: string): ImageSource | undefined {
  const key = path.replace(/^\/sprites\//, '').replace(/\.png$/, '');
  return IMAGES[key];
}
