import { PURITIES, SLOTS, STATS, SUB_POOL } from './content';
import type { PurityId, SlotId, StatKey } from './types';

/** Une entrée de menu déroulant : sa valeur, son libellé, sa couleur éventuelle. */
export interface Option<T> {
  value: T;
  label: string;
  color?: string;
}

export const SLOT_OPTIONS: Option<SlotId>[] = SLOTS.map((s) => ({ value: s.id, label: s.name }));

export const TIER_OPTIONS: Option<PurityId>[] = PURITIES.map((p) => ({
  value: p.id,
  label: p.name,
  color: p.color,
}));

export const SUB_OPTIONS: Option<StatKey>[] = SUB_POOL.map((k) => ({
  value: k,
  label: STATS[k].name,
}));
