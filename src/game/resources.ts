/**
 * Les six ressources du jeu, avec un nom qui dit à quoi elles servent.
 *
 * Les anciens noms — Essence, Réactifs, Lucidité, Éclats — étaient jolis mais
 * demandaient un glossaire : rien ne disait laquelle sert à quoi. Les
 * identifiants internes n'ont pas bougé, seul l'affichage change.
 */
export type ResourceId = 'essence' | 'reagent' | 'insight' | 'shard' | 'catalyst' | 'goldCoin';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  /** Icône découpée dans `assets/coin.png`, servie depuis `public/sprites/ui/`. */
  icon: string;
  color: string;
  /** Une ligne : ce que la ressource permet de faire. */
  use: string;
}

export const RESOURCES: ResourceDef[] = [
  {
    id: 'essence',
    name: 'Essence',
    icon: '/sprites/ui/essence.png',
    color: 'var(--essence)',
    use: "Améliore l'équipement et agrandit le laboratoire.",
  },
  {
    id: 'reagent',
    name: "Essence d'équipement",
    icon: '/sprites/ui/reagent.png',
    color: 'var(--reagent)',
    use: 'Lance une distillation dans le chaudron.',
  },
  {
    id: 'insight',
    name: 'Essence de tech',
    icon: '/sprites/ui/insight.png',
    color: 'var(--insight)',
    use: "Débloque des niveaux dans l'arbre de recherche.",
  },
  {
    id: 'shard',
    name: 'Reliques',
    icon: '/sprites/ui/catalyst.png',
    color: 'var(--shard)',
    use: 'Achète des legs permanents après une dissolution.',
  },
  {
    id: 'catalyst',
    name: 'Catalyseurs',
    icon: '/sprites/ui/catalyst.png',
    color: 'var(--catalyst)',
    use: 'Termine sur-le-champ une fabrication ou des travaux.',
  },
  {
    id: 'goldCoin',
    name: "Pièces d'or",
    icon: '/sprites/ui/goldCoin.png',
    color: 'var(--gold-coin)',
    use: "Ne se gagne pas en jouant : elle s'achète, et paie le temps des chantiers.",
  },
];

/**
 * Définition d'une ressource. Le repli n'est pas décoratif : une monnaie sans
 * entrée ici faisait planter tout l'écran qui l'affichait — c'est ce qui a cassé
 * l'onglet Campagnes quand la prime a commencé à montrer des catalyseurs.
 */
export function resourceDef(id: ResourceId): ResourceDef {
  const def = RESOURCES.find((r) => r.id === id);
  if (def) return def;
  return { id, name: id, icon: '/sprites/ui/catalyst.png', color: 'var(--fg)', use: '' };
}
