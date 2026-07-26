import type { PurityId, SlotId, StatKey } from './types';

export const STATS: Record<StatKey, { name: string; suffix: string; short: string }> = {
  power: { name: 'Puissance', suffix: '', short: 'PUI' },
  health: { name: 'Intégrité', suffix: '', short: 'INT' },
  volatility: { name: 'Volatilité', suffix: '%', short: 'VOL' },
  chain: { name: 'Réaction en chaîne', suffix: '%', short: 'RÉA' },
  osmosis: { name: 'Osmose', suffix: '%', short: 'OSM' },
  condensation: { name: 'Condensation', suffix: '%/s', short: 'CON' },
  clairvoyance: { name: 'Clairvoyance', suffix: '%', short: 'CLA' },
  rupture: { name: 'Rupture', suffix: '%', short: 'RUP' },
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
  { id: 'trouble', name: 'Trouble', mult: 1, color: '#6e737d', frame: 'f-trouble' },
  { id: 'clair', name: 'Clair', mult: 2.4, color: '#cdd6dd', frame: 'f-clair' },
  { id: 'prismatique', name: 'Prismatique', mult: 6, color: '#4fd6a0', frame: 'f-prismatique' },
  { id: 'ethere', name: 'Éthéré', mult: 15, color: '#9b7fe0', frame: 'f-ethere' },
  { id: 'quintessence', name: 'Quintessence', mult: 38, color: '#e8a33d', frame: 'f-quintessence' },
  { id: 'absolu', name: 'Absolu', mult: 95, color: '#f2eee2', frame: 'f-absolu' },
];

export const purityIndex = (id: PurityId) => PURITIES.findIndex((p) => p.id === id);
export const purity = (id: PurityId) => PURITIES[purityIndex(id)];

/** Slots : chacun impose sa statistique principale et sa palette de secondaires. */
export const SLOTS: {
  id: SlotId;
  name: string;
  flavor: string;
  main: StatKey;
  mainBase: number;
  subs: StatKey[];
}[] = [
  {
    id: 'flacon',
    name: 'Flacon',
    flavor: "Le réactif projeté sur l'ennemi.",
    main: 'power',
    mainBase: 6,
    subs: ['volatility', 'chain', 'clairvoyance', 'rupture', 'osmosis'],
  },
  {
    id: 'manteau',
    name: 'Manteau',
    flavor: 'Une toile imbibée qui filtre la brume.',
    main: 'health',
    mainBase: 40,
    subs: ['condensation', 'osmosis', 'health', 'chain'],
  },
  {
    id: 'lentille',
    name: 'Lentille',
    flavor: 'Du verre taillé qui lit les failles.',
    main: 'clairvoyance',
    mainBase: 2.5,
    subs: ['rupture', 'volatility', 'clairvoyance', 'power'],
  },
  {
    id: 'gantelet',
    name: 'Gantelet',
    flavor: "Des tubes d'injection le long des doigts.",
    main: 'volatility',
    mainBase: 4,
    subs: ['chain', 'volatility', 'osmosis', 'power'],
  },
];

export const slotDef = (id: SlotId) => SLOTS.find((s) => s.id === id)!;

/** Districts de la ville noyée. Chaque district multiplie la difficulté et les gains. */
export const DISTRICTS: { name: string; enemies: string[] }[] = [
  { name: 'Les Quais Bas', enemies: ['Rôdeur de vase', 'Noyé pâle', 'Nuée de brume'] },
  { name: 'Le Marché Noyé', enemies: ['Marchand creux', 'Verrier fêlé', 'Chien de saumure'] },
  { name: 'La Verrerie', enemies: ['Souffleur brisé', 'Automate de plomb', 'Four hurlant'] },
  { name: 'Les Citernes', enemies: ['Filtreur aveugle', 'Anguille de mercure', 'Gardien calcifié'] },
  { name: "L'Observatoire", enemies: ['Astronome dissous', 'Prisme errant', 'Œil de brume'] },
  { name: 'Le Puits Prismatique', enemies: ['Écho de soi', 'Condensat', 'Le Distillateur'] },
];

export const WAVES_PER_DISTRICT = 20;

/**
 * La profondeur est illimitée : passé le dernier district, la ville se rejoue en
 * cycles de plus en plus hostiles (« Les Quais Bas · Cycle II »). Sans cela, la
 * dissolution plafonnerait dès la fin du contenu et n'aurait plus rien à mordre.
 */
export const districtAt = (depth: number) => DISTRICTS[depth % DISTRICTS.length];
export const cycleOf = (depth: number) => Math.floor(depth / DISTRICTS.length);

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function districtLabel(depth: number): string {
  const cycle = cycleOf(depth);
  const name = districtAt(depth).name;
  if (cycle === 0) return name;
  return `${name} · Cycle ${ROMAN[cycle] ?? cycle + 1}`;
}
