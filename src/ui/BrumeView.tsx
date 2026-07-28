import { useState } from "react";
import {
  MISSION_REWARD,
  MISSION_WAVE_INTERVAL,
  PURITIES,
  SLOTS,
  STATS,
  nextMissionWave,
  purity,
} from "../game/content";
import {
  claimContract,
  collectDistillation,
  dissolve,
  dissolveAll,
  equip,
  formatDuration,
  formatNum,
  setAutoDistill,
  skipLabUpgrade,
  startRandomDistillation,
  upgradeLab,
} from "../game/engine";
import {
  distillCost,
  skipCost,
  powerScore,
  heroStats,
  itemScore,
  itemStats,
  labUpgradeCost,
  labUpgradeDuration,
  purityWeights,
} from "../game/formulas";
import { mods as allMods, type Mods } from "../game/modifiers";
import { DEFAULT_CHARACTER } from "../game/characters";
import { store, useGame } from "../game/store";
import type { Item, PurityId, SlotId, StatKey } from "../game/types";
import { Arena, FighterBar } from "./Arena";
import { Cauldron } from "./Cauldron";
import { ItemCard, SlotIcon } from "./ItemCard";
import { Sprite } from "./Sprite";
import { Dropdown } from "./Filters";
import { ResIcon } from "./ResIcon";
import { SLOT_OPTIONS, SUB_OPTIONS, TIER_OPTIONS } from "../game/filter-options";

const SHOWN: StatKey[] = [
  "power",
  "health",
  "volatility",
  "chain",
  "osmosis",
  "condensation",
  "clairvoyance",
  "rupture",
];

export function BrumeView() {
  const state = useGame();
  const c = state.combat;
  const s = heroStats(state);
  const dead = c.reviving > 0;
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div className="view">
      {/* La scène s'assombrit quand la lanterne tombe (§2). */}
      <div className={`card scene ${dead ? "lantern-out" : ""}`}>
        {/* Une seule scène : les deux combattants s'y déplacent vraiment. */}
        <Arena />

        <div className="bars">
          <FighterBar
            side="hero"
            name="Toi"
            hp={c.hero.hp}
            max={s.health}
          />
          <FighterBar
            side="foe"
            name={
              c.enemies.length > 1
                ? `${c.enemies.filter((e) => e.hp > 0).length} / ${c.enemies.length} ennemis`
                : c.enemies[0].name
            }
            hp={c.enemies.reduce((sum, e) => sum + Math.max(0, e.hp), 0)}
            max={c.enemies.reduce((sum, e) => sum + e.maxHp, 0)}
          />
        </div>
      </div>

      <LabCard state={state} />
      <GearCard state={state} />

      {/* Journal réduit : la dernière ligne, le reste dans une popup. */}
      <div className="card">
        <button className="ghost row between" onClick={() => setLogOpen(true)}>
          <span className="label">Journal</span>
          <span className="muted small">voir plus ▾</span>
        </button>
        <div className="log">
          {state.log.slice(0, 1).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>

      {logOpen && <LogPopup log={state.log} onClose={() => setLogOpen(false)} />}
    </div>
  );
}

/** Chaudron, en compact : même moteur que l'ancien onglet Laboratoire. */
function LabCard({ state }: { state: ReturnType<typeof useGame> }) {
  const cost = distillCost(state.labLevel);
  const labCost = labUpgradeCost(state.labLevel, state.ascension.count);
  const mods = allMods(state);
  const d = state.distilling;
  /** Fiole pleine d'une sauvegarde antérieure au ramassage automatique. */
  const finished = !!d && d.remaining <= 0;
  const ready = !d && state.resources.reagent >= cost;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showLoop, setShowLoop] = useState(false);

  return (
    <div className="card compact lab-card">
      <Cauldron
        state={state}
        mods={mods}
        onClick={
          finished
            ? () => store.act((s) => collectDistillation(s))
            : ready
              ? () => store.act((s) => startRandomDistillation(s))
              : undefined
        }
      />
      <div className="row between">
        <div>
          <div className="label">
            ⚗ Laboratoire
            {state.ascension.count > 0 && (
              <span className="stars" title={`${state.ascension.count} dissolution(s)`}>
                {' '}
                {'✦'.repeat(Math.min(5, state.ascension.count))}
                {state.ascension.count > 5 && `×${state.ascension.count}`}
              </span>
            )}
          </div>
          <div className="row">
            <button
              className={`ghost ${state.autoDistill ? "active" : ""}`}
              title="Fabriquer en boucle, et choisir ce qui est gardé"
              onClick={() => setShowLoop(true)}
            >
              🔁 {state.autoDistill ? "En boucle" : "Boucle"}
            </button>
          </div>
        </div>
        {/* Le bouton reste en place pendant les travaux : il se remplit et
            affiche le temps restant, au lieu de disparaître. */}
        <button className="upgrade-btn" onClick={() => setShowUpgrade(true)}>
          {state.labUpgrading && (
            <span
              className="upgrade-fill"
              style={{
                width: `${
                  (1 - state.labUpgrading.remaining / state.labUpgrading.total) * 100
                }%`,
              }}
            />
          )}
          <span className="upgrade-label">
            Améliorer
            <span className="muted small">
              {state.labUpgrading
                ? formatDuration(state.labUpgrading.remaining)
                : `niveau ${state.labLevel + 1}`}
            </span>
          </span>
        </button>
      </div>

      {showLoop && <LoopPopup onClose={() => setShowLoop(false)} />}

      {showUpgrade && (
        <div className="modal-overlay" onClick={() => setShowUpgrade(false)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <div className="label">
              {state.labUpgrading ? 'Travaux en cours' : 'Améliorer le laboratoire'}
            </div>
              <button className="ghost" onClick={() => setShowUpgrade(false)}>✕</button>
            </div>
            <div className="muted small">
              Niveau {state.labLevel} → {state.labLevel + 1}
            </div>
            <div className="grid2">
              <div className="statline">
                <span className="muted">Coût</span>
                <b>{formatNum(labCost.essence)} ess</b>
              </div>
              <div className="statline">
                <span className="muted">Durée</span>
                <b>{formatDuration(labUpgradeDuration(state.labLevel, state.ascension.count))}</b>
              </div>
            </div>

            {/* Ce que l'amélioration change vraiment : la pureté de ce qui sort
                du chaudron. Avant / après, pour décider en connaissance. */}
            <div className="label">Puretés obtenues</div>
            <PurityOdds labLevel={state.labLevel} mods={mods} />
            <div className="muted small">Après amélioration</div>
            <PurityOdds labLevel={state.labLevel + 1} mods={mods} />

            {state.labUpgrading ? (
              <div className="row">
                <div className="muted small">
                  {formatDuration(state.labUpgrading.remaining)} restant
                </div>
                <button
                  disabled={
                    state.resources.goldCoin < skipCost(state.labUpgrading.remaining)
                  }
                  onClick={() => store.act((st) => skipLabUpgrade(st))}
                >
                  Finir tout de suite
                  <span className="muted small">
                    {formatNum(skipCost(state.labUpgrading.remaining))}{' '}
                    <ResIcon id="goldCoin" size={14} />
                  </span>
                </button>
              </div>
            ) : (
              <button
                disabled={state.resources.essence < labCost.essence}
                onClick={() => {
                  store.act(upgradeLab);
                  setShowUpgrade(false);
                }}
              >
                Confirmer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Répartition des paliers de pureté à la fabrication, en pourcentage. C'est le
 * seul vrai effet visible d'une amélioration du laboratoire, donc il est chiffré
 * plutôt que suggéré.
 */
function PurityOdds({ labLevel, mods }: { labLevel: number; mods: Mods }) {
  const weights = purityWeights(labLevel, mods);
  const total = weights.reduce((a, b) => a + b, 0);
  return (
    <div className="subs">
      {PURITIES.map((p, i) => {
        const share = (weights[i] / total) * 100;
        if (share < 0.5) return null;
        return (
          <span key={p.id} className={`pill ${p.frame}`} style={{ ['--purity' as string]: p.color, color: p.color }}>
            {p.name} {share.toFixed(0)} %
          </span>
        );
      })}
    </div>
  );
}

/** Équipement, en compact : équipé + réserve, mêmes actions que l'ancien onglet Élixirs. */
function GearCard({ state }: { state: ReturnType<typeof useGame> }) {
  const stash = [...state.stash].sort((a, b) => itemScore(b) - itemScore(a));
  // Une icône par emplacement ; cliquer en déplie les stats, sans occuper de
  // place tant qu'on ne regarde pas.
  const [openSlot, setOpenSlot] = useState<SlotId | null>(null);
  const [showStash, setShowStash] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const openItem = openSlot ? state.equipped[openSlot] : undefined;

  return (
    <div className="card compact">
      <div className="row between">
        <div className="label">Équipé</div>
        {/* Les statistiques complètes se lisent depuis l'équipement, là où on se
            pose la question — plus depuis l'en-tête du combat. */}
        <button
          className="ghost"
          title="Statistiques détaillées"
          onClick={() => setShowInfo(true)}
        >
          ⓘ
        </button>
      </div>
      <div className="grid-icons">
        {SLOTS.map((slot) => {
          const item = state.equipped[slot.id];
          const p = item ? purity(item.purity) : null;
          return (
            <button
              key={slot.id}
              className={`slot-icon-btn ${openSlot === slot.id ? "active" : ""} ${
                item ? "" : "empty"
              }`}
              title={item ? `${slot.name} · niv. ${item.level}` : `${slot.name} — vide`}
              onClick={() => setOpenSlot(openSlot === slot.id ? null : slot.id)}
            >
              <SlotIcon slot={slot.id} color={p?.color ?? "#4a4f5c"} />
            </button>
          );
        })}
      </div>

      {openSlot && (
        <div className="modal-overlay" onClick={() => setOpenSlot(null)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <div className="label">{SLOTS.find((sl) => sl.id === openSlot)!.name}</div>
              <button className="ghost" onClick={() => setOpenSlot(null)}>✕</button>
            </div>
            {openItem ? (
              <ItemCard item={openItem} />
            ) : (
              <div className="muted small">Vide — à distiller.</div>
            )}
          </div>
        </div>
      )}

      {/* La réserve ne prend plus qu'une ligne : le détail vit dans sa popup,
          avec ses filtres — une liste de trente pièces n'a rien à faire ici. */}
      <button className="ghost row between" onClick={() => setShowStash(true)}>
        <span className="label">Réserve · {stash.length}</span>
        <span className="muted small">{stash.length ? 'Voir et filtrer' : 'Vide'}</span>
      </button>

      {showStash && <StashPopup onClose={() => setShowStash(false)} />}
      {showInfo && <InfoPopup onClose={() => setShowInfo(false)} />}
    </div>
  );
}

/**
 * Fabrication en boucle : l'interrupteur, et les filtres qui décident de ce
 * qu'on garde. Ce qui n'est pas coché est dissous en sortant du chaudron — sinon
 * la boucle remplit la réserve de rebut en quelques minutes.
 */
function LoopPopup({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const f = state.loopFilters;
  const set = (next: Partial<typeof f>) =>
    store.act((st) => {
      st.loopFilters = { ...st.loopFilters, ...next };
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div className="label">Fabrication en boucle</div>
          <button className="ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="muted small">
          Ce qui est coché part en réserve. Le reste est dissous en sortant du
          chaudron. Rien de coché : tout est gardé.
        </div>

        <div className="filters">
          <Dropdown
            label="Paliers gardés"
            options={TIER_OPTIONS}
            selected={f.tiers}
            onChange={(tiers) => set({ tiers })}
          />
          <Dropdown
            label="Secondaires gardées"
            options={SUB_OPTIONS}
            selected={f.subs}
            onChange={(subs) => set({ subs })}
          />
        </div>

        <div className="muted small">
          Une pièce suffit d'une seule secondaire cochée pour être gardée.
        </div>

        <button
          className={state.autoDistill ? 'ghost' : 'ascend'}
          onClick={() => store.act((st) => setAutoDistill(st, !st.autoDistill))}
        >
          {state.autoDistill ? 'Arrêter la boucle' : 'Lancer la boucle'}
        </button>
      </div>
    </div>
  );
}

/**
 * La réserve, en grand : filtres par emplacement, par palier et par statistique
 * secondaire. Les filtres se combinent, et un compteur dit toujours combien de
 * pièces répondent.
 */
function StashPopup({ onClose }: { onClose: () => void }) {
  const state = useGame();
  /** Pièce ouverte en comparaison avec celle portée au même emplacement. */
  const [compared, setCompared] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotId[]>([]);
  const [tiers, setTiers] = useState<PurityId[]>([]);
  const [subs, setSubs] = useState<StatKey[]>([]);

  const shown = state.stash
    .filter((i) => !slots.length || slots.includes(i.slot))
    .filter((i) => !tiers.length || tiers.includes(i.purity))
    // Une pièce passe si l'une de ses deux secondaires est cochée : exiger les
    // deux ne laisserait presque rien.
    .filter((i) => !subs.length || i.subs.some((x) => subs.includes(x.key)))
    .sort((a, b) => itemScore(b) - itemScore(a));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div className="label">
            Réserve · {shown.length} / {state.stash.length}
          </div>
          <button className="ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="filters">
          <Dropdown label="Emplacement" options={SLOT_OPTIONS} selected={slots} onChange={setSlots} />
          <Dropdown label="Palier" options={TIER_OPTIONS} selected={tiers} onChange={setTiers} />
          <Dropdown label="Secondaire" options={SUB_OPTIONS} selected={subs} onChange={setSubs} />
        </div>

        <div className="row between">
          {state.stash.length > 0 && (
            <button className="ghost" onClick={() => store.act(dissolveAll)}>
              Tout dissoudre
            </button>
          )}
        </div>

        <div className="stack scroll">
          {shown.length === 0 && <div className="muted small">Aucune pièce ne correspond.</div>}
          {shown.map((item) => (
            <div key={item.id} className="stack">
              <ItemCard
                item={item}
                actions={
                  <>
                    <button onClick={() => setCompared(compared === item.id ? null : item.id)}>
                      {compared === item.id ? 'Masquer' : 'Comparer'}
                    </button>
                    <button onClick={() => store.act((st) => equip(st, item.id))}>Porter</button>
                    <button
                      className="ghost"
                      onClick={() => store.act((st) => dissolve(st, item.id))}
                    >
                      Dissoudre
                    </button>
                  </>
                }
              />
              {compared === item.id && <Comparison candidate={item} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/**
 * Comparaison d'une pièce de la réserve avec celle portée au même emplacement.
 *
 * Une pièce peut être meilleure en dégâts et pire en survie : afficher l'écart
 * statistique par statistique est la seule façon de trancher, et le total de
 * puissance donne le verdict d'ensemble.
 */
function Comparison({ candidate }: { candidate: Item }) {
  const state = useGame();
  const worn = state.equipped[candidate.slot];
  const from = worn ? itemStats(worn) : {};
  const to = itemStats(candidate);
  const keys = [...new Set([...Object.keys(from), ...Object.keys(to)])] as StatKey[];

  // Puissance de l'équipement complet, une fois la pièce portée : le verdict.
  const before = powerScore(heroStats(state));
  const after = powerScore(
    heroStats({ ...state, equipped: { ...state.equipped, [candidate.slot]: candidate } }),
  );
  const delta = after - before;

  return (
    <div className="card compare">
      <div className="row between">
        <div className="label">Comparé à ce que tu portes</div>
        <b className={delta >= 0 ? 'better' : 'worse'}>
          {delta >= 0 ? '+' : '−'}
          {formatNum(Math.abs(delta))} puissance
        </b>
      </div>
      {!worn && <div className="muted small">Emplacement vide : tout est un gain.</div>}
      <div className="grid2">
        {keys.map((k) => {
          const a = from[k] ?? 0;
          const b = to[k] ?? 0;
          const diff = b - a;
          if (Math.abs(diff) < 0.05) return null;
          return (
            <div key={k} className="statline">
              <span className="muted">{STATS[k].name}</span>
              <b className={diff > 0 ? 'better' : 'worse'}>
                {diff > 0 ? '+' : '−'}
                {formatNum(Math.abs(diff))}
                {STATS[k].suffix}
              </b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Popup « ⓘ » : le visuel du héros, ses stats totales, et la pureté attendue. */
function InfoPopup({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const s = heroStats(state);
  const mods = allMods(state);
  const weights = purityWeights(state.labLevel, mods);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const hero = state.character ?? DEFAULT_CHARACTER;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div className="label">Composition</div>
          <button className="ghost" onClick={onClose}>✕</button>
        </div>
        {/* Le personnage au centre : c'est lui que ces chiffres décrivent. */}
        <div className="hero-portrait">
          <Sprite character={hero} anim="idle" fallbackAnim={["idle"]} scale={1.3} />
        </div>
        <div className="grid2">
          {SHOWN.map((k) => {
            // Double frappe et Chance critique plafonnent : on montre le surplus perdu.
            const capped = (k === "chain" || k === "clairvoyance") && s[k] > 100;
            return (
              <div key={k} className="statline">
                <span className="muted">{STATS[k].name}</span>
                <b className={capped ? "capped" : undefined}>
                  {formatNum(capped ? 100 : s[k])}
                  {STATS[k].suffix}
                  {capped && <span className="muted small"> +{formatNum(s[k] - 100)} perdu</span>}
                </b>
              </div>
            );
          })}
        </div>
        {/* Les chances de pureté sont chiffrées ici, palier par palier : c'est
            la seule façon de savoir ce que vaut vraiment un niveau de plus. */}
        <div className="label">Pureté · laboratoire {state.labLevel}</div>
        <div className="purity-bar">
          {PURITIES.map((p, i) => {
            const share = (weights[i] / totalWeight) * 100;
            if (share < 0.4) return null;
            return (
              <div
                key={p.id}
                className="purity-seg"
                style={{ width: `${share}%`, background: p.color }}
                title={`${p.name} ${share.toFixed(1)} %`}
              />
            );
          })}
        </div>
        <div className="grid2">
          {PURITIES.map((p, i) => {
            const share = (weights[i] / totalWeight) * 100;
            return (
              <div key={p.id} className="statline">
                <span style={{ color: p.color }}>{p.name}</span>
                <b className={share > 0 ? undefined : 'muted'}>
                  {share >= 0.05 ? `${share.toFixed(1)} %` : '—'}
                </b>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Contrat du chapitre : la vague à nettoyer et sa récompense. Vit dans l'onglet
 * Campagnes, avec les missions — c'est le même genre d'objectif.
 */
export function MissionPopup({ best, onClose }: { best: number; onClose: () => void }) {
  const state = useGame();
  const target = nextMissionWave(best);
  const progress = target ? Math.min(1, best / target) : 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div className="label">Mission</div>
          <button className="ghost" onClick={onClose}>✕</button>
        </div>
        {state.pendingContract && (
          <button
            className="ascend"
            onClick={() => store.act((st) => claimContract(st))}
          >
            Récupérer la récompense
            <span className="muted small">
              <ResIcon id="essence" size={13} /> {formatNum(state.pendingContract.essence)} ·{' '}
              <ResIcon id="reagent" size={13} /> {formatNum(state.pendingContract.reagent)} ·{' '}
              <ResIcon id="insight" size={13} /> {formatNum(state.pendingContract.insight)}
            </span>
          </button>
        )}

        {target ? (
          <>
            <div className="muted small">
              Nettoyer la vague {target} de ce chapitre (toutes les {MISSION_WAVE_INTERVAL} vagues, un
              contrat tombe).
            </div>
            <div className="bar">
              <div className="fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="muted small">
              Vague {Math.min(best, target)} / {target}
            </div>
            <div className="row">
              <span className="res-catalyst">
                <ResIcon id="essence" size={13} /> +
                {formatNum(MISSION_REWARD.essence * (1 + state.combat.district))} ·{' '}
                <ResIcon id="reagent" size={13} /> +
                {MISSION_REWARD.reagent * (1 + state.combat.district)} ·{' '}
                <ResIcon id="insight" size={13} /> +
                {MISSION_REWARD.insight * (1 + state.combat.district)} à la vague {target}
              </span>
            </div>
          </>
        ) : (
          <div className="muted small">
            Tous les contrats de ce chapitre sont remplis — le prochain tombera au chapitre suivant.
          </div>
        )}
      </div>
    </div>
  );
}

/** Popup du journal : l'historique complet, la dernière action toujours en haut. */
function LogPopup({ log, onClose }: { log: string[]; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div className="label">Journal</div>
          <button className="ghost" onClick={onClose}>✕</button>
        </div>
        <div className="log">
          {log.map((line, i) => (
            <div key={i} className={i === 0 ? "" : "muted"}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
