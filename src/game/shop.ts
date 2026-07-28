/**
 * Le comptoir : des sacs d'or en argent réel, et des clés de mission payées en
 * sacs d'or. L'argent réel n'achète donc jamais de ressource directement — il
 * achète du temps et des tentatives, que le joueur transforme lui-même en butin.
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
];

/**
 * Lots de clés de mission, payés en sacs d'or. Une clé mène à une mission, donc
 * aux trois essences : c'est la façon d'acheter des ressources sans jamais les
 * vendre directement, et sans court-circuiter le combat — il faut encore gagner.
 *
 * Prix croissant par lot dégressif : acheter en gros coûte moins par clé.
 */
export interface KeyPack {
  id: string;
  keys: number;
  gold: number;
}

export const KEY_PACKS: KeyPack[] = [
  { id: 'cle', keys: 1, gold: 40 },
  { id: 'trousseau', keys: 3, gold: 105 },
  { id: 'anneau', keys: 10, gold: 300 },
];
