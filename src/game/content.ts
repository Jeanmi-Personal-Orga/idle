import type { PurityId, SlotId, StatKey } from "./types";

export const STATS: Record<
  StatKey,
  { name: string; suffix: string; short: string }
> = {
  power: { name: "Dégâts", suffix: "", short: "DGT" },
  health: { name: "Points de vie", suffix: "", short: "PV" },
  volatility: { name: "Vitesse de frappe", suffix: "%", short: "VIT" },
  chain: { name: "Double frappe", suffix: "%", short: "DBL" },
  osmosis: { name: "Vol de vie", suffix: "%", short: "VDV" },
  condensation: { name: "Régénération", suffix: "%/s", short: "REG" },
  clairvoyance: { name: "Chance critique", suffix: "%", short: "CRI" },
  rupture: { name: "Dégâts critiques", suffix: "%", short: "DGC" },
};

/**
 * Paliers de pureté : multiplicateur de stats, poids de tirage, et signes
 * visuels. Couleur *et* cadre, jamais la couleur seule — lisibilité daltonienne
 * et en plein soleil (direction-artistique.md §5).
 */
export const PURITIES: {
  id: PurityId;
  name: string;
  mult: number;
  color: string;
  /** Classe CSS du cadre et de son effet. */
  frame: string;
}[] = [
  {
    id: "trouble",
    name: "Trouble",
    mult: 1,
    color: "#6e737d",
    frame: "f-trouble",
  },
  { id: "clair", name: "Clair", mult: 2.4, color: "#cdd6dd", frame: "f-clair" },
  {
    id: "prismatique",
    name: "Prismatique",
    mult: 6,
    color: "#4fd6a0",
    frame: "f-prismatique",
  },
  {
    id: "ethere",
    name: "Éthéré",
    mult: 15,
    color: "#9b7fe0",
    frame: "f-ethere",
  },
  {
    id: "quintessence",
    name: "Quintessence",
    mult: 38,
    color: "#e8a33d",
    frame: "f-quintessence",
  },
  {
    id: "absolu",
    name: "Absolu",
    mult: 95,
    color: "#f2eee2",
    frame: "f-absolu",
  },
];

export const purityIndex = (id: PurityId) =>
  PURITIES.findIndex((p) => p.id === id);
export const purity = (id: PurityId) => PURITIES[purityIndex(id)];

/**
 * Les huit emplacements d'équipement. Quatre offensifs (dégâts), quatre
 * défensifs (points de vie) ; les secondaires sont tirées au hasard dans un
 * fonds commun, quel que soit l'emplacement.
 */
export const SLOTS: {
  id: SlotId;
  name: string;
  /** Article défini, pour écrire des phrases correctes dans l'interface. */
  article: "le" | "la" | "les";
  flavor: string;
  main: StatKey;
  mainBase: number;
}[] = [
  {
    id: "arme",
    name: "Arme",
    article: "la",
    flavor: "Ce avec quoi tu frappes.",
    main: "power",
    mainBase: 8,
  },
  {
    id: "gants",
    name: "Gants",
    article: "les",
    flavor: "Une meilleure prise, des coups plus secs.",
    main: "power",
    mainBase: 4,
  },
  {
    id: "bottes",
    name: "Bottes",
    article: "les",
    flavor: "Le poids du pas dans le coup.",
    main: "power",
    mainBase: 3.5,
  },
  {
    id: "objet",
    name: "Objet",
    article: "le",
    flavor: "Montre, bague, amulette — ça compte quand même.",
    main: "power",
    mainBase: 5,
  },
  {
    id: "veste",
    name: "Veste",
    article: "la",
    flavor: "Ce qui reçoit les coups à ta place.",
    main: "health",
    mainBase: 55,
  },
  {
    id: "casque",
    name: "Casque",
    article: "le",
    flavor: "La tête est le morceau qu'on préfère garder.",
    main: "health",
    mainBase: 40,
  },
  {
    id: "pantalon",
    name: "Pantalon",
    article: "le",
    flavor: "Renforcé aux genoux, comme il se doit.",
    main: "health",
    mainBase: 35,
  },
  {
    id: "protection",
    name: "Protection",
    article: "la",
    flavor: "Plastron, bouclier, ce qui traîne de solide.",
    main: "health",
    mainBase: 50,
  },
];

/**
 * Fonds commun de statistiques secondaires. Elles sont tirées au hasard, donc
 * deux pièces du même emplacement ne se ressemblent jamais.
 */
export const SUB_POOL: StatKey[] = [
  "volatility",
  "chain",
  "osmosis",
  "condensation",
  "clairvoyance",
  "rupture",
  "power",
  "health",
];

/** Deux secondaires sur chaque pièce, quel que soit son palier. */
export const SUBS_PER_ITEM = 2;

export const slotDef = (id: SlotId) => SLOTS.find((s) => s.id === id)!;

/**
 * Districts de la ville noyée. Chaque district multiplie la difficulté et les gains.
 *
 * `sprites` associe un sprite à chaque ennemi nommé : les deux archétypes de
 * vague, puis le gardien. Les gardiens sont des humanoïdes — les mêmes planches
 * que les personnages jouables —, la piétaille est faite de slimes et de
 * bestioles. `self` est un cas à part : le reflet du joueur, tel que le demande
 * la direction artistique pour Le Puits Prismatique.
 */
export const DISTRICTS: {
  name: string;
  enemies: [string, string, string];
  sprites: [string, string, string];
  /** Une phrase : l'ambiance du chapitre. */
  blurb: string;
}[] = [
  {
    name: 'Les Quais Bas',
    enemies: ['Rôdeur de vase', 'Noyé pâle', 'Nuée de brume'],
    sprites: ['rat', 'slime-vert', 'knight-a'],
    blurb: "L'eau noire lèche des pontons pourris où rien ne reste immobile longtemps.",
  },
  {
    name: 'Le Marché Noyé',
    enemies: ['Marchand creux', 'Verrier fêlé', 'Chien de saumure'],
    sprites: ['grenouille', 'slime-bleu', 'knight-b'],
    blurb: 'Des étals engloutis marchandent encore, pour des clients qui ne viendront plus.',
  },
  {
    name: 'La Verrerie',
    enemies: ['Souffleur brisé', 'Éclat animé', 'Four hurlant'],
    sprites: ['araignee', 'slime-blanc', 'barbarian'],
    blurb: 'La chaleur des fours a fait fondre plus que le verre.',
  },
  {
    name: 'Les Citernes',
    enemies: ['Filtreur aveugle', 'Anguille de mercure', 'Gardien calcifié'],
    sprites: ['ver', 'slime-gris', 'fighter'],
    blurb: "Sous la ville, l'eau qu'on filtrait autrefois a fini par filtrer autre chose.",
  },
  {
    name: "L'Observatoire",
    enemies: ['Astronome dissous', 'Prisme errant', 'Œil de brume'],
    sprites: ['abeille', 'slime-violet', 'knight-a'],
    blurb: 'Des lentilles brisées regardent encore le ciel, et quelque chose regarde à travers.',
  },
  {
    name: 'Le Puits Prismatique',
    enemies: ['Écho de soi', 'Condensat', 'Le Distillateur'],
    sprites: ['self', 'slime-rose', 'barbarian'],
    blurb: "Au fond du puits, la brume renvoie ton reflet — et il n'est pas seul.",
  },
];

export const WAVES_PER_DISTRICT = 20;

/** Une vague de contrat tombe toutes les 10 paliers, et rapporte des catalyseurs. */
export const MISSION_WAVE_INTERVAL = 10;
export const MISSION_CATALYST_REWARD = 2;

/**
 * Prochaine vague de contrat non encore atteinte dans le chapitre courant, ou
 * `null` si toutes celles du chapitre ont déjà été nettoyées.
 */
export function nextMissionWave(best: number): number | null {
  for (let w = MISSION_WAVE_INTERVAL; w < WAVES_PER_DISTRICT; w += MISSION_WAVE_INTERVAL) {
    if (w > best) return w;
  }
  return null;
}

/**
 * La profondeur est illimitée : passé le dernier district, la ville se rejoue en
 * cycles de plus en plus hostiles. Sans cela, la dissolution plafonnerait dès la
 * fin du contenu et n'aurait plus rien à mordre.
 */
export const districtAt = (depth: number) =>
  DISTRICTS[depth % DISTRICTS.length];
export const cycleOf = (depth: number) => Math.floor(depth / DISTRICTS.length);

/** Sprite de l'ennemi courant, dans la même logique que `enemyName`. */
export function enemySprite(depth: number, wave: number): string {
  const d = districtAt(depth);
  return wave === WAVES_PER_DISTRICT ? d.sprites[2] : d.sprites[wave % 2];
}

/**
 * Pas de nom à retenir : juste un numéro qui grimpe sans plafond. Plus le
 * chapitre est élevé, plus les ennemis sont forts (voir `enemyHp`/`enemyDamage`,
 * indexés sur cette même profondeur absolue) — le numéro seul dit déjà tout.
 */
export function districtLabel(depth: number): string {
  return `Chapitre ${depth + 1}`;
}

/** Phrase d'ambiance du chapitre courant (voir `districtLabel`). */
export function chapterBlurb(depth: number): string {
  return districtAt(depth).blurb;
}
