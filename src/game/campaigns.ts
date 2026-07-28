import type { ResourceId } from './resources';

/**
 * Campagnes : trois séries de combats dédiées, chacune payée dans **une seule**
 * monnaie. Elles répondent à un manque de la boucle principale — le combat de
 * chapitre donne un peu de tout, sans jamais permettre de viser ce qui manque.
 *
 * Une campagne fournit le décor, les ennemis et la monnaie mise en avant ; c'est
 * le **tirage du jour** (`rollDailyMissions`) qui fixe le chapitre et le nombre
 * de vagues. Rien n'est payé avant la dernière vague, et abandonner compte comme
 * une défaite.
 */
export interface Campaign {
  id: string;
  name: string;
  blurb: string;
  /**
   * Monnaie mise en avant : celle dont la mission donne le plus. Les trois sont
   * toujours payées — une mission ne doit pas être inutile parce qu'on manque
   * d'autre chose.
   */
  reward: ResourceId;
  /**
   * Écart de difficulté par rapport au chapitre le plus profond atteint. Une
   * campagne à −1 se joue un cran en dessous de ce que le joueur encaisse
   * couramment, une campagne à +1 est un défi. La difficulté suit donc le joueur
   * au lieu d'être figée au début du jeu.
   */
  depthOffset: number;
  /** Sprites des ennemis : deux archétypes, puis le gardien final. */
  sprites: [string, string, string];
  enemies: [string, string, string];
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'mine',
    name: 'La Mine Noyée',
    blurb: "On y descend pour l'essence, et pour rien d'autre.",
    reward: 'essence',
    depthOffset: -1,
    sprites: ['champignon', 'slime-vert', 'golem'],
    enemies: ['Porteur voûté', 'Coulée verte', 'Golem de fond'],
  },
  {
    id: 'forge',
    name: 'La Forge Éteinte',
    blurb: "Ce qui reste des ateliers donne de quoi fabriquer.",
    reward: 'reagent',
    depthOffset: 0,
    sprites: ['squelette', 'slime-gris', 'golem'],
    enemies: ['Apprenti calciné', 'Scorie vive', 'Maître de forge'],
  },
  {
    id: 'archives',
    name: 'Les Archives Basses',
    blurb: 'Le savoir ne se ramasse qu\'ici, et il se défend.',
    reward: 'insight',
    depthOffset: 1,
    sprites: ['chauve-souris', 'squelette', 'golem'],
    enemies: ['Liseur aveugle', 'Copiste sec', 'Gardien des Archives'],
  },
];

export const campaignDef = (id: string) => CAMPAIGNS.find((c) => c.id === id);

/**
 * Clés offertes chaque jour — donc de missions à remporter sans rien payer. On
 * peut en détenir davantage : le comptoir en vend (voir `KEY_PACKS`), et une
 * mission déjà remportée se rejoue pour sa récompense.
 */
export const KEYS_PER_DAY = 3;

/**
 * Une mission du jour. Son chapitre et son nombre de vagues **changent chaque
 * jour** : ce n'est plus une campagne figée qu'on refait à l'identique, mais un
 * tirage quotidien, calé sur la progression du joueur.
 */
export interface DailyMission {
  id: string;
  /** Campagne dont elle emprunte le décor, les ennemis et la monnaie mise en avant. */
  campaign: string;
  /** Chapitre où elle se joue (index interne, l'affichage ajoute 1). */
  district: number;
  waves: number;
  /** `todo` tant qu'elle n'est pas remportée ; une défaite reste rejouable. */
  status: 'todo' | 'won' | 'lost';
}

/** Le tableau du jour : trois missions, et la prime des trois. */
export interface DailyBoard {
  /** Date de Paris (voir `today`) : au changement, tout est retiré au sort. */
  day: string;
  missions: DailyMission[];
  /** Prime des trois missions, payée une seule fois. */
  bonusPaid: boolean;
}

/**
 * Générateur déterministe : le même jour donne le même tableau à tout le monde,
 * sans rien stocker côté serveur, et rouvrir le jeu ne retire pas au sort.
 */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/**
 * Tire les trois missions du jour. Une par monnaie — aucune journée ne doit
 * fermer l'accès à une ressource — mais chapitre et longueur varient : un jour
 * on descend plus bas sur des séries courtes, un autre on tient neuf vagues un
 * cran au-dessus.
 */
export function rollDailyMissions(day: string, deepest: number): DailyMission[] {
  const rng = seeded(`${day}|${deepest}`);
  return CAMPAIGNS.map((campaign, i) => {
    // −1, 0 ou +1 chapitre autour du plus profond atteint, plus la pente propre
    // à la campagne : la difficulté suit le joueur sans jamais devenir absurde.
    const offset = Math.floor(rng() * 3) - 1;
    const district = Math.max(0, deepest + campaign.depthOffset + offset);
    // De 4 à 10 vagues, par pas de deux : la longueur se lit d'un coup d'œil.
    const waves = 4 + Math.floor(rng() * 4) * 2;
    return { id: `${day}-${i}`, campaign: campaign.id, district, waves, status: 'todo' as const };
  });
}

/**
 * Récompense d'une mission du jour : les trois essences, part triple pour celle
 * de sa campagne. Elle suit le chapitre **et** la longueur, donc une mission
 * plus dure paie plus, y compris quand le tirage la rend plus dure que d'habitude.
 */
export function missionRewards(mission: DailyMission): {
  essence: number;
  reagent: number;
  insight: number;
} {
  const campaign = campaignDef(mission.campaign);
  const scale = (1 + mission.district) * (mission.waves / 5);
  const base = { essence: 150, reagent: 12, insight: 4 };
  const boost = (id: ResourceId) => (campaign && id === campaign.reward ? 3 : 1);
  return {
    essence: Math.ceil(base.essence * scale * boost('essence')),
    reagent: Math.ceil(base.reagent * scale * boost('reagent')),
    insight: Math.ceil(base.insight * scale * boost('insight')),
  };
}

/**
 * Prime des trois missions : de quoi refaire la journée entière, plus un
 * catalyseur. C'est ce qui donne envie de prendre aussi la mission qui fait peur
 * au lieu de se contenter de la plus facile.
 */
export function dailyBonus(missions: DailyMission[]): {
  essence: number;
  reagent: number;
  insight: number;
  catalyst: number;
} {
  const total = missions.reduce(
    (sum, m) => {
      const r = missionRewards(m);
      return {
        essence: sum.essence + r.essence,
        reagent: sum.reagent + r.reagent,
        insight: sum.insight + r.insight,
      };
    },
    { essence: 0, reagent: 0, insight: 0 },
  );
  return { ...total, catalyst: 1 };
}
