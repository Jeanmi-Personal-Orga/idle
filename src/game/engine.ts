import { DISTRICTS, WAVES_PER_DISTRICT, purityIndex, slotDef } from './content';
import {
  attackInterval,
  chainChance,
  critChance,
  distillCost,
  distillDuration,
  dps,
  enemyDamage,
  enemyHp,
  enemyInterval,
  enemyName,
  heroStats,
  itemScore,
  labUpgradeCost,
  makeItem,
  upgradeCost,
  waveReward,
} from './formulas';
import type { GameState, Item, SlotId } from './types';

export const SAVE_VERSION = 1;
/** Plafond de progression hors-ligne, en secondes (8 h). */
const OFFLINE_CAP = 8 * 3600;

let idCounter = 0;
const nextId = () => `i${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export function makeEnemy(district: number, wave: number): GameState['combat']['enemy'] {
  const maxHp = enemyHp(district, wave);
  return {
    hp: maxHp,
    maxHp,
    damage: enemyDamage(district, wave),
    interval: enemyInterval(),
    cooldown: enemyInterval(),
    name: enemyName(district, wave),
  };
}

export function newGame(): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    resources: { essence: 0, reagent: 6, shard: 0 },
    labLevel: 1,
    equipped: {},
    stash: [],
    distilling: null,
    combat: {
      district: 0,
      wave: 1,
      best: 1,
      hero: { hp: 100, cooldown: 0 },
      enemy: makeEnemy(0, 1),
      reviving: 0,
    },
    lastSeen: Date.now(),
    essenceRate: 0,
    log: ["La brume s'épaissit. Le laboratoire est froid."],
  };
  // Un flacon de départ, sinon le héros ne peut rien tuer.
  const starter = makeItem('flacon', 1, () => 0.5, nextId());
  state.equipped.flacon = starter;
  return state;
}

function pushLog(state: GameState, msg: string) {
  state.log.unshift(msg);
  if (state.log.length > 40) state.log.length = 40;
}

/**
 * Avance la simulation de `dt` secondes. Mute `state` en place — l'appelant
 * (le store) se charge de notifier l'interface.
 */
export function step(state: GameState, dt: number, rng: () => number = Math.random) {
  advanceDistillation(state, dt);
  advanceCombat(state, dt, rng);
}

function advanceDistillation(state: GameState, dt: number) {
  const d = state.distilling;
  if (!d) return;
  d.remaining = Math.max(0, d.remaining - dt);
}

function advanceCombat(state: GameState, dt: number, rng: () => number) {
  const c = state.combat;
  const s = heroStats(state);

  // Régénération et réanimation.
  if (c.reviving > 0) {
    c.reviving -= dt;
    c.hero.hp = Math.min(s.health, c.hero.hp + s.health * 0.4 * dt);
    if (c.reviving <= 0) {
      c.hero.hp = s.health;
      c.wave = 1;
      c.enemy = makeEnemy(c.district, c.wave);
    }
    return;
  }

  c.hero.hp = Math.min(s.health, c.hero.hp + (s.health * s.condensation) / 100 * dt);

  // Frappes du héros.
  c.hero.cooldown -= dt;
  const interval = attackInterval(s);
  let guard = 0;
  while (c.hero.cooldown <= 0 && guard++ < 20) {
    c.hero.cooldown += interval;
    const hits = 1 + (rng() < chainChance(s) ? 1 : 0);
    for (let i = 0; i < hits; i++) {
      const crit = rng() < critChance(s);
      const dmg = s.power * (crit ? 1 + s.rupture / 100 : 1);
      c.enemy.hp -= dmg;
      if (s.osmosis > 0) {
        c.hero.hp = Math.min(s.health, c.hero.hp + (dmg * s.osmosis) / 100);
      }
    }
    if (c.enemy.hp <= 0) {
      onWaveCleared(state, rng);
      return;
    }
  }

  // Riposte de l'ennemi.
  c.enemy.cooldown -= dt;
  while (c.enemy.cooldown <= 0) {
    c.enemy.cooldown += c.enemy.interval;
    c.hero.hp -= c.enemy.damage;
    if (c.hero.hp <= 0) {
      c.hero.hp = 0;
      c.reviving = 3;
      pushLog(state, `Dissous par ${c.enemy.name}. Retour à l'entrée du district.`);
      return;
    }
  }
}

function onWaveCleared(state: GameState, rng: () => number) {
  const c = state.combat;
  const r = waveReward(c.district, c.wave);
  state.resources.essence += r.essence;
  if (rng() < r.reagentChance) state.resources.reagent += r.reagent;

  c.best = Math.max(c.best, c.wave);

  if (c.wave >= WAVES_PER_DISTRICT) {
    if (c.district < DISTRICTS.length - 1) {
      c.district += 1;
      c.wave = 1;
      c.best = 1;
      pushLog(state, `Le gardien tombe. Tu descends vers ${DISTRICTS[c.district].name}.`);
    } else {
      pushLog(state, 'Le Distillateur tombe à nouveau. La brume ne recule plus.');
    }
  } else {
    c.wave += 1;
  }
  c.enemy = makeEnemy(c.district, c.wave);
  c.hero.cooldown = 0;
}

/** Crédite une partie des gains accumulés hors-ligne. */
export function applyOffline(state: GameState, now = Date.now()): number {
  const seconds = Math.min(OFFLINE_CAP, Math.max(0, (now - state.lastSeen) / 1000));
  state.lastSeen = now;
  if (seconds < 60) return 0;

  if (state.distilling) {
    state.distilling.remaining = Math.max(0, state.distilling.remaining - seconds);
  }

  // On estime le rythme de nettoyage à la vague courante, à 60 % d'efficacité.
  const s = heroStats(state);
  const c = state.combat;
  const timeToKill = enemyHp(c.district, c.wave) / Math.max(1, dps(s));
  const kills = (seconds / Math.max(1, timeToKill)) * 0.6;
  const r = waveReward(c.district, c.wave);
  const essence = kills * r.essence;
  const reagent = Math.floor(kills * r.reagentChance * r.reagent);
  state.resources.essence += essence;
  state.resources.reagent += reagent;
  if (essence > 0) {
    pushLog(
      state,
      `Absence de ${formatDuration(seconds)} : ${formatNum(essence)} essence, ${reagent} réactifs.`,
    );
  }
  return essence;
}

// --- Actions ---------------------------------------------------------------

export function startDistillation(state: GameState, slot: SlotId): boolean {
  if (state.distilling) return false;
  const cost = distillCost(state.labLevel);
  if (state.resources.reagent < cost) return false;
  state.resources.reagent -= cost;
  const total = distillDuration(state.labLevel);
  state.distilling = { slot, remaining: total, total };
  return true;
}

export function collectDistillation(state: GameState, rng: () => number = Math.random): Item | null {
  const d = state.distilling;
  if (!d || d.remaining > 0) return null;
  const item = makeItem(d.slot, state.labLevel, rng, nextId());
  state.distilling = null;
  const current = state.equipped[item.slot];
  // Auto-équipe si le slot est vide ou si l'objet est franchement meilleur.
  if (!current || itemScore(item) > itemScore(current)) {
    if (current) state.stash.push(current);
    state.equipped[item.slot] = item;
    pushLog(state, `${slotDef(item.slot).name} ${purityIndex(item.purity) >= 3 ? '✦ ' : ''}équipé.`);
  } else {
    state.stash.push(item);
  }
  return item;
}

export function equip(state: GameState, itemId: string) {
  const idx = state.stash.findIndex((i) => i.id === itemId);
  if (idx < 0) return;
  const item = state.stash[idx];
  state.stash.splice(idx, 1);
  const current = state.equipped[item.slot];
  if (current) state.stash.push(current);
  state.equipped[item.slot] = item;
}

export function upgrade(state: GameState, itemId: string): boolean {
  const item = findItem(state, itemId);
  if (!item) return false;
  const cost = upgradeCost(item);
  if (state.resources.essence < cost) return false;
  state.resources.essence -= cost;
  item.level += 1;
  return true;
}

/** Dissout un objet de la réserve en réactifs. */
export function dissolve(state: GameState, itemId: string): boolean {
  const idx = state.stash.findIndex((i) => i.id === itemId);
  if (idx < 0) return false;
  const item = state.stash[idx];
  state.stash.splice(idx, 1);
  state.resources.reagent += 2 + purityIndex(item.purity) * 4 + (item.level - 1);
  return true;
}

export function dissolveAll(state: GameState) {
  for (const item of [...state.stash]) dissolve(state, item.id);
}

export function upgradeLab(state: GameState): boolean {
  const cost = labUpgradeCost(state.labLevel);
  if (state.resources.essence < cost.essence || state.resources.reagent < cost.reagent) {
    return false;
  }
  state.resources.essence -= cost.essence;
  state.resources.reagent -= cost.reagent;
  state.labLevel += 1;
  pushLog(state, `Laboratoire porté au niveau ${state.labLevel}.`);
  return true;
}

function findItem(state: GameState, id: string): Item | undefined {
  for (const item of Object.values(state.equipped)) if (item?.id === id) return item;
  return state.stash.find((i) => i.id === id);
}

// --- Formatage -------------------------------------------------------------

const UNITS = ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad', 'ae'];

export function formatNum(v: number): string {
  if (!isFinite(v)) return '∞';
  if (v < 1000) return v < 10 ? v.toFixed(1).replace(/\.0$/, '') : Math.floor(v).toString();
  const tier = Math.min(UNITS.length - 1, Math.floor(Math.log10(v) / 3));
  const scaled = v / Math.pow(1000, tier);
  return `${scaled.toFixed(scaled < 10 ? 2 : 1)}${UNITS[tier]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
