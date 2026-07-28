/**
 * Le comptoir : deux rayons, tous deux en argent réel — des **sacs d'or**, qui
 * paient le temps des chantiers, et des **clés de mission**, qui ouvrent des
 * tentatives. Aucun des deux ne vend de ressource : une clé n'est qu'un droit
 * d'entrée, il faut encore remporter la mission pour être payé.
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
  { id: 'sac', gold: 3000, bonus: 600, price: '19,99 €' },
  // Les deux gros lots gardent la pente dégressive : 160 puis 170 sacs par euro,
  // contre 60 pour la poignée d'entrée.
  { id: 'malle', gold: 8000, bonus: 1800, price: '49,99 €' },
  { id: 'cale', gold: 17000, bonus: 4500, price: '99,99 €' },
];

/**
 * Lots de clés de mission, vendus en **argent réel** comme les sacs d'or. Une clé
 * mène à une mission, donc aux trois essences — mais il faut la remporter : on
 * n'achète pas de ressource, on achète une tentative.
 *
 * Dégressif : plus le lot est gros, moins la clé coûte.
 */
export interface KeyPack {
  id: string;
  keys: number;
  price: string;
}

export const KEY_PACKS: KeyPack[] = [
  { id: 'cle', keys: 1, price: '0,99 €' },
  { id: 'trousseau', keys: 5, price: '3,99 €' },
  { id: 'anneau', keys: 15, price: '9,99 €' },
];
