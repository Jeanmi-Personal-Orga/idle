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

/** Slots : chacun impose sa statistique principale et sa palette de secondaires. */
export const SLOTS: {
  id: SlotId;
  name: string;
  /** Article défini, pour écrire des phrases correctes dans l'interface. */
  article: "le" | "la";
  flavor: string;
  main: StatKey;
  mainBase: number;
  subs: StatKey[];
}[] = [
  {
    id: "flacon",
    name: "Flacon",
    article: "le",
    flavor: "Le réactif projeté sur l'ennemi.",
    main: "power",
    mainBase: 6,
    subs: ["volatility", "chain", "clairvoyance", "rupture", "osmosis"],
  },
  {
    id: "manteau",
    name: "Manteau",
    article: "le",
    flavor: "Une toile imbibée qui filtre la brume.",
    main: "health",
    mainBase: 40,
    subs: ["condensation", "osmosis", "health", "chain"],
  },
  {
    id: "lentille",
    name: "Lentille",
    article: "la",
    flavor: "Du verre taillé qui lit les failles.",
    main: "clairvoyance",
    mainBase: 2.5,
    subs: ["rupture", "volatility", "clairvoyance", "power"],
  },
  {
    id: "gantelet",
    name: "Gantelet",
    article: "le",
    flavor: "Des tubes d'injection le long des doigts.",
    main: "volatility",
    mainBase: 4,
    subs: ["chain", "volatility", "osmosis", "power"],
  },
];

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
}[] = [
  {
    name: 'Les Quais Bas',
    enemies: ['Rôdeur de vase', 'Noyé pâle', 'Nuée de brume'],
    sprites: ['rat', 'slime-vert', 'knight-a'],
  },
  {
    name: 'Le Marché Noyé',
    enemies: ['Marchand creux', 'Verrier fêlé', 'Chien de saumure'],
    sprites: ['grenouille', 'slime-bleu', 'knight-b'],
  },
  {
    name: 'La Verrerie',
    enemies: ['Souffleur brisé', 'Éclat animé', 'Four hurlant'],
    sprites: ['araignee', 'slime-blanc', 'barbarian'],
  },
  {
    name: 'Les Citernes',
    enemies: ['Filtreur aveugle', 'Anguille de mercure', 'Gardien calcifié'],
    sprites: ['ver', 'slime-gris', 'fighter'],
  },
  {
    name: "L'Observatoire",
    enemies: ['Astronome dissous', 'Prisme errant', 'Œil de brume'],
    sprites: ['abeille', 'slime-violet', 'knight-a'],
  },
  {
    name: 'Le Puits Prismatique',
    enemies: ['Écho de soi', 'Condensat', 'Le Distillateur'],
    sprites: ['self', 'slime-rose', 'barbarian'],
  },
];

export const WAVES_PER_DISTRICT = 20;

/**
 * La profondeur est illimitée : passé le dernier district, la ville se rejoue en
 * cycles de plus en plus hostiles (« Les Quais Bas · Cycle II »). Sans cela, la
 * dissolution plafonnerait dès la fin du contenu et n'aurait plus rien à mordre.
 */
export const districtAt = (depth: number) =>
  DISTRICTS[depth % DISTRICTS.length];
export const cycleOf = (depth: number) => Math.floor(depth / DISTRICTS.length);

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** Sprite de l'ennemi courant, dans la même logique que `enemyName`. */
export function enemySprite(depth: number, wave: number): string {
  const d = districtAt(depth);
  return wave === WAVES_PER_DISTRICT ? d.sprites[2] : d.sprites[wave % 2];
}

export function districtLabel(depth: number): string {
  const cycle = cycleOf(depth);
  const name = districtAt(depth).name;
  if (cycle === 0) return name;
  return `${name} · Cycle ${ROMAN[cycle] ?? cycle + 1}`;
}
