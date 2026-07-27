/**
 * Lots de sacs d'or vendus en argent réel. Ce sont les seuls achats payants du
 * jeu : tout le reste — essences, catalyseurs, équipement — se gagne en jouant.
 *
 * Les prix sont indicatifs et non branchés : encaisser demande un prestataire de
 * paiement et une vérification des reçus côté serveur (voir `ShopView`).
 */
export interface GoldPack {
  id: string;
  gold: number;
  /** Part offerte, mise en avant sur les gros lots. */
  bonus: number;
  price: string;
}

export const GOLD_PACKS: GoldPack[] = [
  { id: 'poignee', gold: 120, bonus: 0, price: '1,99 €' },
  { id: 'bourse', gold: 650, bonus: 50, price: '4,99 €' },
  { id: 'coffre', gold: 1400, bonus: 200, price: '9,99 €' },
];
