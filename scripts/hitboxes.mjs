/**
 * Mesure les boîtes de collision **dans les images**, pour chaque créature.
 *
 * Pourquoi : les planches n'ont pas la même marge. Une chauve-souris de 64 px de
 * large est presque pleine, un squelette dessiné dans 96 px flotte au milieu, et
 * les icônes 96 × 96 des slimes n'occupent qu'un quart de leur case. Un unique
 * pourcentage de resserrement donnait donc des combattants qui se traversaient
 * pour certains et se frappaient à distance pour d'autres.
 *
 * La mesure lit les pixels : on décode le PNG (zlib, pas de dépendance), on
 * cherche les colonnes réellement opaques de la case animée, et on en déduit la
 * part de vide à gauche et à droite. Le résultat est recopié dans
 * `src/game/sprites.ts` (table HITBOXES).
 *
 * Usage : `node scripts/hitboxes.mjs`
 */
import { readFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/** Décode un PNG en { width, height, alpha: Uint8Array } (un octet par pixel). */
function decodePng(file) {
  const buf = readFileSync(file);
  let pos = 8; // saute la signature
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += len + 12;
  }
  if (depth !== 8 || (colorType !== 6 && colorType !== 4)) {
    throw new Error(`${file} : format non géré (bits ${depth}, type ${colorType})`);
  }
  const channels = colorType === 6 ? 4 : 2;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const alpha = new Uint8Array(width * height);
  const line = Buffer.alloc(stride);
  const previous = Buffer.alloc(stride);
  let read = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[read++];
    raw.copy(line, 0, read, read + stride);
    read += stride;
    // Défiltrage PNG : cinq modes, tous relatifs au pixel de gauche (a) et à la
    // ligne du dessus (b).
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = previous[i];
      const c = i >= channels ? previous[i - channels] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 0xff;
      else if (filter === 2) line[i] = (line[i] + b) & 0xff;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
    }
    line.copy(previous);
    for (let x = 0; x < width; x++) alpha[y * width + x] = line[x * channels + channels - 1];
  }
  return { width, height, alpha };
}

/**
 * Part de vide à gauche et à droite d'une case, en fraction de sa largeur.
 * Le seuil ignore les pixels quasi transparents : une ombre portée ne fait pas
 * partie du corps.
 */
function insets(png, cell, col, line, threshold = 24) {
  const [cw, ch] = cell;
  const x0 = col * cw;
  const y0 = line * ch;
  let left = cw;
  let right = -1;
  for (let x = 0; x < cw; x++) {
    for (let y = 0; y < ch; y++) {
      const px = x0 + x;
      const py = y0 + y;
      if (px >= png.width || py >= png.height) continue;
      if (png.alpha[py * png.width + px] > threshold) {
        if (x < left) left = x;
        if (x > right) right = x;
        break;
      }
    }
  }
  if (right < 0) return null;
  return [left / cw, (cw - 1 - right) / cw];
}

// Les cases à mesurer, décrites comme dans sprites.ts. On prend la pose de repos :
// c'est celle où l'on se tient au contact.
const TARGETS = [
  ...['fighter', 'barbarian', 'knight-a', 'knight-b'].map((id) => ({
    id,
    file: `public/sprites/chars/${id}.png`,
    cell: [32, 32],
    col: 0,
    line: 0,
  })),
  { id: 'chauve-souris', file: 'public/sprites/foes/bat/idle.png', cell: [64, 64], col: 0, line: 0 },
  { id: 'champignon', file: 'public/sprites/foes/mushroom/idle.png', cell: [80, 64], col: 0, line: 0 },
  { id: 'golem', file: 'public/sprites/foes/golem/idle.png', cell: [90, 64], col: 0, line: 0 },
  { id: 'squelette', file: 'public/sprites/foes/skeleton/idle.png', cell: [96, 64], col: 0, line: 0 },
  ...Array.from({ length: 10 }, (_, i) => ({
    id: ['vert', 'ambre', 'rouge', 'rouille', 'rose', 'violet', 'bleu', 'blanc', 'gris', 'brun'][i],
    file: 'public/sprites/foes/slimes.png',
    cell: [96, 96],
    col: 1 + (i % 5),
    line: 1 + Math.floor(i / 5),
    prefix: 'slime-',
  })),
  ...['araignee', 'coccinelle', 'abeille', 'papillon', 'escargot', 'ver'].map((id, i) => ({
    id,
    file: 'public/sprites/foes/critters.png',
    cell: [96, 96],
    col: 1 + i,
    line: 1,
  })),
  ...['grenouille', 'rat', 'chat', 'hibou', 'lapin'].map((id, i) => ({
    id,
    file: 'public/sprites/foes/critters.png',
    cell: [96, 96],
    col: 1 + i,
    line: 2,
  })),
];

const cache = new Map();
const rows = [];
for (const t of TARGETS) {
  if (!existsSync(t.file)) {
    console.log(`  (absent) ${t.file}`);
    continue;
  }
  if (!cache.has(t.file)) cache.set(t.file, decodePng(t.file));
  const box = insets(cache.get(t.file), t.cell, t.col, t.line);
  const name = `${t.prefix ?? ''}${t.id}`;
  if (!box) {
    console.log(`  (case vide) ${name}`);
    continue;
  }
  rows.push([name, box[0], box[1]]);
}

console.log('\nÀ recopier dans src/game/sprites.ts :\n');
for (const [name, l, r] of rows) {
  console.log(`  '${name}': [${l.toFixed(2)}, ${r.toFixed(2)}],`);
}
