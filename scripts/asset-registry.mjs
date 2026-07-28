/**
 * Régénère `src/game/images.ts` depuis le contenu de `src/assets/sprites/`.
 *
 * Metro exige des `require` littéraux : aucun chemin ne peut être calculé à
 * l'exécution, contrairement aux URL de la version web. Ce script évite d'écrire
 * la table à la main — à relancer après tout ajout ou renommage de planche.
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/assets/sprites';

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.png')) out.push(full.slice(ROOT.length + 1));
  }
  return out;
}

const files = walk(ROOT).sort();
const entries = files
  .map((f) => `  '${f.slice(0, -4)}': require('../assets/sprites/${f}') as ImageSource,`)
  .join('\n');

writeFileSync(
  'src/game/images.ts',
  `/**
 * Registre des images. Metro n'accepte pas de chemin calculé dans \`require\` : il
 * doit voir chaque fichier littéralement pour l'empaqueter. D'où cette table, qui
 * remplace les URL \`/sprites/...\` de la version web.
 *
 * Généré par \`node scripts/asset-registry.mjs\` — à relancer après tout ajout de
 * planche.
 */
import type { ImageSourcePropType } from 'react-native';

type ImageSource = ImageSourcePropType;

export const IMAGES: Record<string, ImageSource> = {
${entries}
};

/**
 * Image d'une clé de planche (\`chars/fighter\`, \`foes/bat/idle\`…). Une clé absente
 * renvoie \`undefined\` plutôt que de lever : un sprite manquant ne doit pas faire
 * tomber tout l'écran, seulement laisser un trou.
 */
export const image = (key: string): ImageSource | undefined => IMAGES[key];
`,
);
console.log(`${files.length} images enregistrées dans src/game/images.ts`);
