import { MISSION_REWARD, MISSION_WAVE_INTERVAL, SLOTS, purity, WAVES_PER_DISTRICT, districtAt, districtLabel, enemySprite, purityIndex, slotDef } from './content';
import {
  attackInterval,
  GOLD_OFFERS,
  goldOfferCost,
  skipCost,
  chainChance,
  critChance,
  distillCost,
  distillDuration,
  dps,
  enemyCount,
  enemyDamage,
  enemyHp,
  enemyInterval,
  enemyName,
  heroStats,
  labUpgradeCost,
  labUpgradeDuration,
  makeItem,
  waveReward,
} from './formulas';
import { ascMods, canAscend, shardGain } from './ascension';
import { mods as allMods } from './modifiers';
import { NEUTRAL_MODS, advanceResearch, insightReward } from './tech';
import {
  KEYS_PER_DAY,
  campaignDef,
  campaignDepth,
  campaignRewards,
  type Campaign,
} from './campaigns';
import { spriteStyle } from './characters';
import type { CharacterId } from './characters';
import type { Enemy, GameState, Item, SlotId } from './types';

export const SAVE_VERSION = 14;

/**
 * Temps qu'il faut pour traverser toute l'arène, en secondes. Les deux camps
 * marchent à la **même vitesse** : celui qui doit couvrir la moitié du chemin
 * met donc deux fois moins de temps.
 */
export const CLOSING_TIME = 1.4;

/** Vrai si l'arme équipée frappe sans avoir besoin d'approcher. */
export const heroIsRanged = (state: GameState) => Boolean(state.equipped.arme?.ranged);

/**
 * Durée d'approche de la vague : proportionnelle à la distance que le marcheur
 * doit réellement couvrir, à vitesse égale.
 *
 * - deux combattants au contact se rejoignent au milieu → moitié du temps ;
 * - un seul avance → il fait tout le chemin, temps plein ;
 * - deux combattants à distance ne bougent pas → on frappe tout de suite.
 */
export function closingTime(state: GameState, enemies = state.combat.enemies): number {
  const heroRanged = heroIsRanged(state);
  const foeRanged = enemies.every((e) => spriteStyle(e.sprite) === 'ranged');
  // Personne à déplacer : le combat commence immédiatement.
  if (heroRanged && foeRanged) return 0;
  // Le héros reste en arrière : l'ennemi traverse toute l'arène.
  if (heroRanged) return CLOSING_TIME;
  // Le héros au corps à corps face à un ennemi qui ne bouge pas — une bestiole
  // volante — doit aller le chercher jusqu'au bout : tout le chemin est pour lui.
  if (foeRanged) return CLOSING_TIME;
  // Les deux avancent : ils se rejoignent au milieu, donc moitié du temps.
  return CLOSING_TIME / 2;
}

let idCounter = 0;
const nextId = () => `i${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** Un seul ennemi, à l'échelle demandée (voir `makeEnemies`). */
function buildEnemy(
  district: number,
  wave: number,
  damageMult: number,
  scale: number,
  name: string,
  sprite: string,
): Enemy {
  const maxHp = (enemyHp(district, wave) * scale) || 1;
  return {
    hp: maxHp,
    maxHp,
    damage: enemyDamage(district, wave) * damageMult * scale,
    interval: enemyInterval(),
    cooldown: enemyInterval(),
    name,
    sprite,
  };
}

/**
 * Construit tous les ennemis d'une vague. Sur une vague à plusieurs ennemis,
 * chacun est affaibli par `1/√n` : la difficulté totale grandit avec le
 * nombre d'ennemis, sans que chacun devienne trivial ni que le total explose
 * (une division à plat aurait rendu les vagues à 3 ennemis presque plus
 * faciles que les vagues normales, une fois la Double frappe en jeu).
 */
export function makeEnemies(district: number, wave: number, damageMult = 1): Enemy[] {
  const count = enemyCount(district, wave);
  const scale = 1 / Math.sqrt(count);
  const d = districtAt(district);
  const baseSprite = enemySprite(district, wave);
  const out: Enemy[] = [];
  for (let i = 0; i < count; i++) {
    const name = count === 1 ? enemyName(district, wave) : `${d.enemies[i % 2]} (${i + 1})`;
    const sprite = count === 1 ? baseSprite : d.sprites[i % 2];
    out.push(buildEnemy(district, wave, damageMult, scale, name, sprite));
  }
  return out;
}

/**
 * Ennemis d'une vague de campagne. On réutilise les courbes de la profondeur
 * annoncée par la campagne, avec ses propres noms et sprites : la difficulté
 * reste comparable à celle d'un chapitre connu.
 */
export function makeCampaignEnemies(
  campaign: Campaign,
  wave: number,
  deepest: number,
  damageMult = 1,
): Enemy[] {
  const last = wave >= campaign.waves;
  const scale = last ? 2.2 : 1;
  const name = last ? `${campaign.enemies[2]} (gardien)` : campaign.enemies[wave % 2];
  const sprite = last ? campaign.sprites[2] : campaign.sprites[wave % 2];
  return [buildEnemy(campaignDepth(campaign, deepest), wave, damageMult, scale, name, sprite)];
}

/** Date locale, au format court : sert de repère pour la recharge des clés. */
export function today(): string {
  return new Date().toLocaleDateString('fr-CA');
}

/**
 * Remet les clés à neuf si le jour a changé. Appelé au chargement et avant toute
 * dépense, pour qu'une partie laissée ouverte la nuit voie ses clés revenir.
 */
export function refreshKeys(state: GameState) {
  const day = today();
  if (!state.keys || state.keys.day !== day) {
    state.keys = { left: KEYS_PER_DAY, day };
  }
}

/**
 * Lance une mission. Elle se déroule **à côté** du chapitre : le combat de brume
 * continue pendant ce temps, les deux fronts avancent en parallèle.
 */
export function startCampaign(state: GameState, id: string): boolean {
  const campaign = campaignDef(id);
  if (!campaign || state.mission) return false;
  // Une clé par tentative, trois par jour : c'est ce qui empêche de farmer une
  // mission en boucle et donne du poids au choix de laquelle faire.
  refreshKeys(state);
  if (state.keys.left < 1) return false;
  state.keys.left -= 1;
  state.mission = {
    id,
    wave: 1,
    hero: { hp: heroStats(state).health, cooldown: 0 },
    enemies: makeCampaignEnemies(campaign, 1, state.ascension.deepest, allMods(state).enemyDamageMult),
    closing: 0,
    reviving: 0,
  };
  state.mission.closing = closingTime(state, state.mission.enemies);
  pushLog(state, `Mission : ${campaign.name}. ${campaign.waves} vagues, tout ou rien.`);
  return true;
}

/** Termine la mission en cours, avec ou sans récompense. */
export function leaveCampaign(state: GameState, reason: string) {
  state.mission = null;
  pushLog(state, reason);
}

export function newGame(): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    // null : le sélecteur de personnage s'affiche au premier lancement.
    character: null,
    // On démarre avec 20 sacs d'or et rien d'autre : de quoi dépanner une
    // première fabrication au comptoir, sans avance d'essence ni de matière.
    // Les matériaux tombent dès le premier ennemi tué, donc rien ne bloque.
    resources: { essence: 0, reagent: 0, insight: 0, shard: 0, catalyst: 0, goldCoin: 20 },
    labLevel: 1,
    tech: {},
    ascension: { count: 0, legacies: {}, deepest: 0 },
    pendingContract: null,
    keys: { left: KEYS_PER_DAY, day: today() },
    mission: null,
    equipped: {},
    stash: [],
    distilling: null,
    autoDistill: false,
    loopFilters: { tiers: [], subs: [] },
    labUpgrading: null,
    researching: null,
    combat: {
      district: 0,
      wave: 1,
      best: 1,
      hero: { hp: 100, cooldown: 0 },
      enemies: makeEnemies(0, 1),
      reviving: 0,
      closing: CLOSING_TIME / 2,
    },
    lastSeen: Date.now(),
    essenceRate: 0,
    log: ["La brume s'épaissit. Le laboratoire est froid."],
  };
  // Un flacon de départ, sinon le héros ne peut rien tuer.
  const starter = makeItem('arme', 1, () => 0.5, nextId());
  state.equipped.arme = starter;
  return state;
}

export function pushLog(state: GameState, msg: string) {
  state.log.unshift(msg);
  if (state.log.length > 40) state.log.length = 40;
}

/**
 * Événements de combat consommés par l'interface (chiffres de dégâts, secousses).
 * Ils ne sont jamais sauvegardés : purement visuels, et la simulation
 * d'équilibrage tourne sans écouteur.
 */
/** Sur quel front un événement se produit : la brume, ou la mission. */
export type FightScope = 'chapter' | 'mission';

export type CombatEvent =
  /** Le héros lance une attaque : une seule par cycle, avant ses coups. */
  | { type: 'swing' }
  | { type: 'hit'; damage: number; crit: boolean; targetIndex: number }
  | { type: 'taken'; damage: number }
  | { type: 'kill' };

export type EventSink = (event: CombatEvent & { scope?: FightScope }) => void;

/**
 * Les deux fronts avancent en même temps : chaque événement est étiqueté, pour
 * que l'arène de la brume n'affiche pas les coups de la mission et l'inverse.
 */
const chapterSink = (sink: EventSink): EventSink => (e) => sink({ ...e, scope: 'chapter' });
const missionSink = (sink: EventSink): EventSink => (e) => sink({ ...e, scope: 'mission' });

const NO_SINK: EventSink = () => {};

/**
 * Avance la simulation de `dt` secondes. Mute `state` en place — l'appelant
 * (le store) se charge de notifier l'interface.
 */
export function step(
  state: GameState,
  dt: number,
  rng: () => number = Math.random,
  sink: EventSink = NO_SINK,
) {
  advanceDistillation(state, dt, rng);
  advanceCombat(state, dt, rng, chapterSink(sink));
  advanceMission(state, dt, rng, missionSink(sink));
  advanceLabUpgrade(state, dt);
  advanceResearch(state, dt);
}

function advanceDistillation(state: GameState, dt: number, rng: () => number) {
  const d = state.distilling;
  if (!d) return;
  d.remaining = Math.max(0, d.remaining - dt);
  // Terminer une distillation est une règle du jeu, pas un effet de rendu : si la
  // récolte dépendait de la boucle d'animation, un onglet en arrière-plan
  // laisserait la fiole pleine et le chaudron bloqué.
  if (d.remaining <= 0) collectDistillation(state, rng);
}

function advanceCombat(state: GameState, dt: number, rng: () => number, sink: EventSink) {
  const c = state.combat;
  const s = heroStats(state);
  const mods = allMods(state);

  // Régénération et réanimation.
  if (c.reviving > 0) {
    c.reviving -= dt;
    c.hero.hp = Math.min(s.health, c.hero.hp + s.health * 0.4 * dt);
    if (c.reviving <= 0) {
      c.hero.hp = s.health;
      c.wave = 1;
      c.enemies = makeEnemies(c.district, c.wave, allMods(state).enemyDamageMult);
      c.closing = closingTime(state);
    }
    return;
  }

  // Garde-fou : ne devrait jamais arriver, mais un tableau vide bloquerait
  // le héros pour toujours plutôt que de planter.
  if (c.enemies.length === 0) {
    c.enemies = makeEnemies(c.district, c.wave, allMods(state).enemyDamageMult);
  }

  c.hero.hp = Math.min(s.health, c.hero.hp + (s.health * s.condensation) / 100 * dt);

  // Marche d'approche : personne ne frappe avant d'être arrivé.
  if ((c.closing ?? 0) > 0) {
    c.closing = Math.max(0, (c.closing ?? 0) - dt);
    if (c.closing > 0) return;
    // On arrive au contact prêt à frapper, pas avec un temps de recharge entamé.
    c.hero.cooldown = 0;
    for (const e of c.enemies) e.cooldown = e.interval;
  }

  // Frappes du héros : toujours sur le premier ennemi encore vivant.
  c.hero.cooldown -= dt;
  const interval = attackInterval(s);
  let guard = 0;
  while (c.hero.cooldown <= 0 && guard++ < 20) {
    const targetIndex = c.enemies.findIndex((e) => e.hp > 0);
    if (targetIndex < 0) break;
    const target = c.enemies[targetIndex];
    c.hero.cooldown += interval;
    sink({ type: 'swing' });
    const hits = 1 + (rng() < chainChance(s) ? 1 : 0);
    for (let i = 0; i < hits; i++) {
      if (target.hp <= 0) break;
      const crit = rng() < critChance(s);
      const dmg = s.power * (crit ? 1 + s.rupture / 100 : 1);
      target.hp -= dmg;
      sink({ type: 'hit', damage: dmg, crit, targetIndex });
      if (s.osmosis > 0) {
        c.hero.hp = Math.min(s.health, c.hero.hp + (dmg * s.osmosis) / 100);
      }
    }
    if (target.hp <= 0) {
      sink({ type: 'kill' });
      // Un réactif garanti par ennemi tué : le vrai moteur de l'économie de réactifs
      // depuis que les vagues à plusieurs ennemis existent (voir enemyCount).
      state.resources.reagent += 1 * mods.reagentMult;
      // Aucun sac d'or au combat : c'est la seule monnaie qui ne se gagne pas en
      // jouant. On part avec vingt, et on en rachète au comptoir — décision
      // assumée, voir la note du README sur ce que cela implique.
    }
    if (c.enemies.every((e) => e.hp <= 0)) {
      onWaveCleared(state, rng);
      return;
    }
  }

  // Riposte : chaque ennemi encore en vie attaque à sa propre cadence.
  for (const enemy of c.enemies) {
    if (enemy.hp <= 0) continue;
    enemy.cooldown -= dt;
    while (enemy.cooldown <= 0) {
      enemy.cooldown += enemy.interval;
      c.hero.hp -= enemy.damage;
      sink({ type: 'taken', damage: enemy.damage });
      if (c.hero.hp <= 0) {
        c.hero.hp = 0;
        c.reviving = 3;
        pushLog(state, `Dissous par ${enemy.name}. Retour à l'entrée du district.`);
        return;
      }
    }
  }
}

function onWaveCleared(state: GameState, rng: () => number) {
  const c = state.combat;
  const mods = allMods(state);

  const r = waveReward(c.district, c.wave);
  const guardian = c.wave >= WAVES_PER_DISTRICT;
  const isNewBest = c.wave > c.best;
  state.resources.essence += r.essence * mods.essenceMult;
  if (rng() < r.reagentChance) {
    state.resources.reagent += Math.ceil(r.reagent * mods.reagentMult);
  }
  state.resources.insight += Math.floor(
    insightReward(c.district, guardian, isNewBest) * mods.insightMult,
  );

  // Contrat rempli : toutes les MISSION_WAVE_INTERVAL vagues d'un chapitre, une
  // nouvelle meilleure vague rapporte des catalyseurs — la vraie récompense « on
  // skip l'attente ».
  if (isNewBest && c.wave % MISSION_WAVE_INTERVAL === 0 && c.wave < WAVES_PER_DISTRICT) {
    // Le contrat paie en essences, proportionnellement à la profondeur.
    const scale = 1 + c.district;
    // Le gain s'empile en attente : c'est le joueur qui vient le chercher.
    const previous = state.pendingContract ?? { essence: 0, reagent: 0, insight: 0 };
    state.pendingContract = {
      essence: previous.essence + MISSION_REWARD.essence * scale,
      reagent: previous.reagent + MISSION_REWARD.reagent * scale,
      insight: previous.insight + MISSION_REWARD.insight * scale,
    };
    pushLog(state, `Contrat rempli, vague ${c.wave} : récompense à récupérer.`);
  }

  c.best = Math.max(c.best, c.wave);
  state.ascension.deepest = Math.max(state.ascension.deepest, c.district);

  if (c.wave >= WAVES_PER_DISTRICT) {
    // La profondeur n'a pas de fin : la ville se rejoue en cycles plus hostiles.
    c.district += 1;
    c.wave = 1;
    c.best = 1;
    pushLog(state, `Le gardien tombe. Tu descends vers ${districtLabel(c.district)}.`);
  } else {
    c.wave += 1;
  }
  c.enemies = makeEnemies(c.district, c.wave, mods.enemyDamageMult);
  c.hero.cooldown = 0;
  // La vague suivante commence par la marche, pas par un coup.
  c.closing = closingTime(state);
}

/**
 * Fait avancer la mission en cours. Même mécanique que le combat de chapitre —
 * approche, frappes, riposte — mais sans butin par ennemi : tout est payé à la
 * dernière vague, et une chute annule la mission.
 */
function advanceMission(state: GameState, dt: number, rng: () => number, sink: EventSink) {
  const m = state.mission;
  if (!m) return;
  const campaign = campaignDef(m.id);
  if (!campaign) {
    state.mission = null;
    return;
  }
  const s = heroStats(state);

  if (m.reviving > 0) {
    // Une chute en mission n'a pas de seconde chance : on rentre bredouille.
    leaveCampaign(state, `${campaign.name} : tombé en route, rien à rapporter.`);
    return;
  }

  m.hero.hp = Math.min(s.health, m.hero.hp + ((s.health * s.condensation) / 100) * dt);

  if (m.closing > 0) {
    m.closing = Math.max(0, m.closing - dt);
    if (m.closing > 0) return;
    m.hero.cooldown = 0;
    for (const e of m.enemies) e.cooldown = e.interval;
  }

  m.hero.cooldown -= dt;
  const interval = attackInterval(s);
  let guard = 0;
  while (m.hero.cooldown <= 0 && guard++ < 20) {
    const targetIndex = m.enemies.findIndex((e) => e.hp > 0);
    if (targetIndex < 0) break;
    const target = m.enemies[targetIndex];
    m.hero.cooldown += interval;
    sink({ type: 'swing' });
    const hits = 1 + (rng() < chainChance(s) ? 1 : 0);
    for (let i = 0; i < hits; i++) {
      if (target.hp <= 0) break;
      const crit = rng() < critChance(s);
      const dmg = s.power * (crit ? 1 + s.rupture / 100 : 1);
      target.hp -= dmg;
      sink({ type: 'hit', damage: dmg, crit, targetIndex });
      if (s.osmosis > 0) m.hero.hp = Math.min(s.health, m.hero.hp + (dmg * s.osmosis) / 100);
    }
    if (target.hp <= 0) sink({ type: 'kill' });
    if (m.enemies.every((e) => e.hp <= 0)) {
      onMissionWaveCleared(state, campaign);
      return;
    }
  }

  for (const enemy of m.enemies) {
    if (enemy.hp <= 0) continue;
    enemy.cooldown -= dt;
    while (enemy.cooldown <= 0) {
      enemy.cooldown += enemy.interval;
      m.hero.hp -= enemy.damage;
      sink({ type: 'taken', damage: enemy.damage });
      if (m.hero.hp <= 0) {
        m.hero.hp = 0;
        leaveCampaign(state, `${campaign.name} : tombé face à ${enemy.name}.`);
        return;
      }
    }
  }
}

/** Vague de mission nettoyée : la suivante, ou le paiement final. */
function onMissionWaveCleared(state: GameState, campaign: Campaign) {
  const m = state.mission;
  if (!m) return;
  if (m.wave >= campaign.waves) {
    // Les trois essences sont payées, avec une part triple pour celle que la
    // mission met en avant. Le montant suit sa difficulté et la progression.
    const reward = campaignRewards(campaign, state.ascension.deepest);
    state.resources.essence += reward.essence;
    state.resources.reagent += reward.reagent;
    state.resources.insight += reward.insight;
    state.mission = null;
    pushLog(
      state,
      `${campaign.name} achevée : +${formatNum(reward.essence)} essence, +${formatNum(
        reward.reagent,
      )} d'équipement, +${formatNum(reward.insight)} de tech.`,
    );
    return;
  }
  m.wave += 1;
  m.enemies = makeCampaignEnemies(
    campaign,
    m.wave,
    state.ascension.deepest,
    allMods(state).enemyDamageMult,
  );
  m.hero.cooldown = 0;
  m.closing = closingTime(state, m.enemies);
}

/** Crédite une partie des gains accumulés hors-ligne. */
export function applyOffline(state: GameState, now = Date.now()): number {
  const mods = allMods(state);
  const seconds = Math.min(
    mods.offlineCapHours * 3600,
    Math.max(0, (now - state.lastSeen) / 1000),
  );
  state.lastSeen = now;
  if (seconds < 60) return 0;

  if (state.distilling) {
    state.distilling.remaining = Math.max(0, state.distilling.remaining - seconds);
    if (state.distilling.remaining <= 0) collectDistillation(state);
  }
  if (state.labUpgrading) {
    state.labUpgrading.remaining = Math.max(0, state.labUpgrading.remaining - seconds);
    if (state.labUpgrading.remaining <= 0) completeLabUpgrade(state);
  }
  if (state.researching) {
    advanceResearch(state, seconds);
  }

  // On estime le rythme de nettoyage à la vague courante, à efficacité réduite.
  const s = heroStats(state);
  const c = state.combat;
  const timeToKill = enemyHp(c.district, c.wave) / Math.max(1, dps(s));
  const kills = (seconds / Math.max(1, timeToKill)) * mods.offlineEfficiency;
  const r = waveReward(c.district, c.wave);
  const essence = kills * r.essence * mods.essenceMult;
  // Chaque ennemi tué lâche ~1 réactif garanti (voir advanceCombat) : l'estimation
  // hors-ligne suit désormais ce modèle plutôt que l'ancienne chance par vague.
  const reagent = Math.floor(kills * mods.reagentMult);
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
  const total = distillDuration(state.labLevel, allMods(state));
  state.distilling = { slot, remaining: total, total };
  return true;
}

/** Le chaudron ne choisit pas la pièce : au clic, il en tire une au hasard. */
export function startRandomDistillation(state: GameState): boolean {
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)].id;
  return startDistillation(state, slot);
}

/**
 * Aucune façon de sauter une fabrication : les deux ou trois secondes de
 * chaudron sont le geste lui-même, pas une attente à racheter. Seuls les longs
 * chantiers — travaux du laboratoire, recherches — s'achètent en sacs d'or.
 */

export function collectDistillation(state: GameState, rng: () => number = Math.random): Item | null {
  const d = state.distilling;
  if (!d || d.remaining > 0) return null;
  const item = makeItem(d.slot, state.labLevel, rng, nextId(), allMods(state));
  state.distilling = null;

  // En boucle, les pièces qui ne passent pas les filtres sont dissoutes tout de
  // suite : sans ça, quelques minutes de fabrication noient la réserve.
  if (state.autoDistill && !passesLoopFilters(state, item)) {
    state.resources.essence += dissolveValue(item);
    return item;
  }

  // Une pièce gardée ne s'équipe jamais toute seule, même meilleure : le joueur
  // décide, après avoir vu son palier, son niveau et ses secondaires.
  state.stash.push(item);
  pushLog(
    state,
    `${slotDef(item.slot).name} ${purity(item.purity).name} niveau ${item.level} en réserve.`,
  );
  return item;
}

/**
 * Une pièce passe les filtres de boucle si son palier est coché **et** si l'une
 * de ses deux secondaires est cochée. Une liste vide ne filtre rien.
 */
export function passesLoopFilters(state: GameState, item: Item): boolean {
  const f = state.loopFilters ?? { tiers: [], subs: [] };
  if (f.tiers.length && !f.tiers.includes(item.purity)) return false;
  if (f.subs.length && !item.subs.some((sub) => f.subs.includes(sub.key))) return false;
  return true;
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


/**
 * Ce que rapporte une pièce dissoute, en essence. Le palier compte plus que le
 * niveau : une pièce rare mal tirée vaut quand même quelque chose.
 */
export function dissolveValue(item: Item): number {
  return Math.ceil(4 + purityIndex(item.purity) * 8 + item.level * 0.8);
}

/** Dissout un objet de la réserve : il rend de l'essence. */
export function dissolve(state: GameState, itemId: string): boolean {
  const idx = state.stash.findIndex((i) => i.id === itemId);
  if (idx < 0) return false;
  const item = state.stash[idx];
  state.stash.splice(idx, 1);
  state.resources.essence += dissolveValue(item);
  return true;
}

export function dissolveAll(state: GameState) {
  for (const item of [...state.stash]) dissolve(state, item.id);
}

/**
 * Dissolution. Le laboratoire retombe à zéro et tout l'équipement est refondu au
 * palier le plus bas — mais chaque pièce gagne **une étoile**, ce qui la rend
 * durablement plus forte, et tout ce qui a été appris ou accumulé reste.
 *
 * | Repart de zéro | Reste intact |
 * | --- | --- |
 * | niveau du laboratoire, palier et niveau des pièces | monnaies, arbre de recherche, legs, chapitre et vague |
 *
 * Le prix : le laboratoire coûte 25 % de plus par étoile (voir `labUpgradeCost`).
 */
export function ascend(state: GameState): number {
  if (!canAscend(state)) return 0;
  const gain = shardGain(state);

  state.ascension.count += 1;
  const stars = state.ascension.count;

  // Le laboratoire seul repart de zéro : les monnaies, elles, sont conservées.
  state.labLevel = ascMods(state).startingLab;
  state.distilling = null;
  state.autoDistill = false;
  state.labUpgrading = null;

  // Tout l'équipement est refondu : palier le plus bas, niveau 1, secondaires
  // retirées au hasard, et une étoile de plus. Les huit emplacements sont
  // fournis — on ne repart jamais les mains vides.
  state.equipped = {};
  state.stash = [];
  for (const slot of SLOTS) {
    state.equipped[slot.id] = makeStarterItem(slot.id, stars);
  }

  // On ne bouge pas de chapitre : la vague repart au début du chapitre courant.
  state.combat.wave = 1;
  state.combat.best = 1;
  state.combat.reviving = 0;
  state.combat.enemies = makeEnemies(
    state.combat.district,
    1,
    allMods(state).enemyDamageMult,
  );
  state.combat.hero.hp = heroStats(state).health;

  state.resources.catalyst += gain;
  pushLog(
    state,
    `Dissolution n°${stars} : +${gain} catalyseurs, équipement refondu à ${stars} étoile(s).`,
  );
  return gain;
}

/**
 * Pièce de sortie de dissolution : palier le plus bas, niveau 1, deux
 * secondaires au hasard, et les étoiles acquises.
 */
function makeStarterItem(slot: SlotId, stars: number): Item {
  // Palier le plus bas et laboratoire 1 : la pièce ne tire sa valeur que de ses
  // étoiles, ce qui rend le gain de la dissolution immédiatement lisible.
  return makeItem(slot, 1, Math.random, nextId(), NEUTRAL_MODS, stars);
}

export function chooseCharacter(state: GameState, id: CharacterId) {
  state.character = id;
}

export function upgradeLab(state: GameState): boolean {
  if (state.labUpgrading) return false;
  const cost = labUpgradeCost(state.labLevel, state.ascension.count);
  if (state.resources.essence < cost.essence) return false;
  state.resources.essence -= cost.essence;
  const total = labUpgradeDuration(state.labLevel, state.ascension.count);
  state.labUpgrading = { remaining: total, total };
  return true;
}

function advanceLabUpgrade(state: GameState, dt: number) {
  const u = state.labUpgrading;
  if (!u) return;
  u.remaining -= dt;
  if (u.remaining <= 0) completeLabUpgrade(state);
}

function completeLabUpgrade(state: GameState) {
  if (!state.labUpgrading) return;
  state.labLevel += 1;
  state.labUpgrading = null;
  pushLog(state, `Laboratoire porté au niveau ${state.labLevel}.`);
}

/** Dépense un catalyseur pour terminer l'amélioration du laboratoire sur-le-champ. */
export function skipLabUpgrade(state: GameState): boolean {
  if (!state.labUpgrading) return false;
  const cost = skipCost(state.labUpgrading.remaining);
  if (state.resources.goldCoin < cost) return false;
  state.resources.goldCoin -= cost;
  completeLabUpgrade(state);
  return true;
}

/** Achat au comptoir : des sacs d'or contre de la matière ou du savoir. */
export function buyWithGold(state: GameState, resource: 'essence' | 'reagent' | 'insight'): boolean {
  const offer = GOLD_OFFERS.find((o) => o.resource === resource);
  if (!offer) return false;
  const cost = goldOfferCost(offer, state.resources[resource]);
  if (state.resources.goldCoin < cost) return false;
  state.resources.goldCoin -= cost;
  state.resources[resource] += offer.amount;
  return true;
}

/** Encaisse la récompense de contrat en attente. */
export function claimContract(state: GameState): boolean {
  const reward = state.pendingContract;
  if (!reward) return false;
  state.resources.essence += reward.essence;
  state.resources.reagent += reward.reagent;
  state.resources.insight += reward.insight;
  state.pendingContract = null;
  pushLog(
    state,
    `Récompense encaissée : +${formatNum(reward.essence)} essence, +${formatNum(
      reward.reagent,
    )} d'équipement, +${formatNum(reward.insight)} de tech.`,
  );
  return true;
}

export function setAutoDistill(state: GameState, on: boolean) {
  state.autoDistill = on;
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
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  // Les derniers niveaux du laboratoire se comptent en jours : « 240h » ne se lit pas.
  return `${Math.floor(h / 24)}j ${h % 24}h`;
}
