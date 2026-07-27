/**
 * Les cinq ressources du jeu, avec un nom qui dit à quoi elles servent.
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
    name: 'Matériaux',
    icon: '/sprites/ui/reagent.png',
    color: 'var(--reagent)',
    use: 'Lance une distillation dans le chaudron.',
  },
  {
    id: 'insight',
    name: 'Savoir',
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
    use: 'Termine sur-le-champ une distillation ou une recherche. Gagné en dégageant une vague de contrat (toutes les 10 vagues).',
  },
  {
    id: 'goldCoin',
    name: "Pièces d'or",
    icon: '/sprites/ui/goldCoin.png',
    color: 'var(--gold-coin)',
    use: 'Tombe au combat. Seule monnaie acceptée au comptoir.',
  },
];

export const resourceDef = (id: ResourceId) => RESOURCES.find((r) => r.id === id)!;
