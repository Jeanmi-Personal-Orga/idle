/**
 * Cherche les cycles d'imports dans `src/`.
 *
 * Metro accepte les cycles en avertissant, mais ils laissent un module à moitié
 * initialisé : ce projet a déjà eu un écran blanc parce qu'une constante valait
 * `undefined` au chargement, à cause d'un cycle que `tsc`, le lint et le build
 * voyaient passer sans rien dire.
 *
 * Usage : `npm run cycles`
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = 'src';

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Résout un import relatif vers un fichier du projet, ou `null` si externe. */
function resolveImport(from, spec) {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(from), spec);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      /* pas ce candidat */
    }
  }
  return null;
}

const graph = new Map();
for (const file of files(ROOT)) {
  const source = readFileSync(file, 'utf8');
  const deps = new Set();
  // `import ... from '…'`, `export ... from '…'`, et `require('…')`.
  const patterns = [
    /(?:^|\n)\s*(?:import|export)[^;'"]*from\s*['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      // Un import de **type** seul ne crée pas de dépendance à l'exécution : il
      // disparaît à la compilation, donc il ne peut pas laisser de valeur vide.
      if (/(?:import|export)\s+type\s/.test(match[0])) continue;
      const target = resolveImport(resolve(file), match[1]);
      if (target) deps.add(target);
    }
  }
  graph.set(resolve(file), deps);
}

/** Parcours en profondeur, avec pile, pour nommer chaque cycle trouvé. */
const cycles = [];
const state = new Map();
const stack = [];

function walk(node) {
  state.set(node, 'open');
  stack.push(node);
  for (const dep of graph.get(node) ?? []) {
    if (state.get(dep) === 'open') {
      const from = stack.indexOf(dep);
      cycles.push([...stack.slice(from), dep]);
    } else if (!state.has(dep)) {
      walk(dep);
    }
  }
  stack.pop();
  state.set(node, 'done');
}

for (const node of graph.keys()) if (!state.has(node)) walk(node);

const short = (p) => p.replace(`${resolve('.')}/`, '');
const unique = [...new Map(cycles.map((c) => [c.map(short).sort().join('|'), c])).values()];

if (unique.length) {
  console.log(`✘ ${unique.length} cycle(s) d'imports :\n`);
  for (const cycle of unique) console.log(`  ${cycle.map(short).join('\n    → ')}\n`);
  process.exit(1);
}
console.log(`✔ Aucun cycle d'imports (${graph.size} fichiers).`);
