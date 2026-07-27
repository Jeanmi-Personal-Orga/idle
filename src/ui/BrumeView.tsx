import { useState } from "react";
import {
  MISSION_CATALYST_REWARD,
  MISSION_WAVE_INTERVAL,
  PURITIES,
  SLOTS,
  STATS,
  WAVES_PER_DISTRICT,
  chapterBlurb,
  districtLabel,
  nextMissionWave,
  purity,
} from "../game/content";
import {
  collectDistillation,
  dissolve,
  dissolveAll,
  equip,
  formatDuration,
  formatNum,
  setAutoDistill,
  skipDistillation,
  skipLabUpgrade,
  startRandomDistillation,
  upgrade,
  upgradeLab,
} from "../game/engine";
import {
  attackInterval,
  distillCost,
  distillDuration,
  dps,
  heroStats,
  itemScore,
  labUpgradeCost,
  labUpgradeDuration,
  purityWeights,
  upgradeCost,
} from "../game/formulas";
import { mods as allMods } from "../game/modifiers";
import { DEFAULT_CHARACTER } from "../game/characters";
import { resourceDef } from "../game/resources";
import { store, useGame } from "../game/store";
import type { SlotId, StatKey } from "../game/types";
import { Arena, FighterBar } from "./Arena";
import { Cauldron } from "./Cauldron";
import { ItemCard, PurityLegend, SlotIcon } from "./ItemCard";
import { Sprite } from "./Sprite";

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
  const [showInfo, setShowInfo] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div className="view">
      {/* La scène s'assombrit quand la lanterne tombe (§2). */}
      <div className={`card scene ${dead ? "lantern-out" : ""}`}>
        <div className="row between">
          <div>
            <div className="label">{districtLabel(c.district)}</div>
            <div className="muted small">{chapterBlurb(c.district)}</div>
            <div className="muted small">
              Vague {c.wave} / {WAVES_PER_DISTRICT}
              {c.wave === WAVES_PER_DISTRICT && " · gardien"}
              {c.enemies.length > 1 && ` · ${c.enemies.length} ennemis`}
            </div>
          </div>
          <div className="right">
            <div className="row">
              <button className="ghost" title="Mission" onClick={() => setShowMissions(true)}>
                🎯
              </button>
              <button className="ghost" title="Stats et équipement" onClick={() => setShowInfo(true)}>
                ⓘ
              </button>
            </div>
            <div className="label">{formatNum(dps(s))}</div>
            <div className="muted small">dégâts / s</div>
          </div>
        </div>

        {/* Une seule scène : les deux combattants s'y déplacent vraiment. */}
        <Arena />

        <div className="bars">
          <FighterBar
            side="hero"
            name="Toi"
            hp={c.hero.hp}
            max={s.health}
            note={`${attackInterval(s).toFixed(2)} s / frappe`}
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
            note={`${formatNum(c.enemies.reduce((sum, e) => sum + (e.hp > 0 ? e.damage : 0), 0))} par coup (total)`}
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

      {showMissions && (
        <MissionPopup best={c.best} onClose={() => setShowMissions(false)} />
      )}
      {showInfo && <InfoPopup onClose={() => setShowInfo(false)} />}
      {logOpen && <LogPopup log={state.log} onClose={() => setLogOpen(false)} />}
    </div>
  );
}

/** Chaudron, en compact : même moteur que l'ancien onglet Laboratoire. */
function LabCard({ state }: { state: ReturnType<typeof useGame> }) {
  const cost = distillCost(state.labLevel);
  const labCost = labUpgradeCost(state.labLevel);
  const mods = allMods(state);
  const d = state.distilling;
  /** Fiole pleine d'une sauvegarde antérieure au ramassage automatique. */
  const finished = !!d && d.remaining <= 0;
  const ready = !d && state.resources.reagent >= cost;
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div className="card scene compact lab-card">
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
          <div className="label">⚗ Laboratoire · niveau {state.labLevel}</div>
          <div className="muted small">
            {finished
              ? "Fiole pleine — touche le chaudron pour la ramasser"
              : d
                ? `${SLOTS.find((sl) => sl.id === d.slot)!.name} · ${formatDuration(d.remaining)} restant`
                : ready
                  ? `Touche le chaudron pour fabriquer une pièce au hasard — ${formatDuration(distillDuration(state.labLevel, mods))}`
                  : "Foyer éteint — il manque des réactifs"}
          </div>
          <div className="row">
            {d && state.resources.catalyst > 0 && (
              <button className="ghost" onClick={() => store.act((s) => skipDistillation(s))}>
                ⧗ Finir avec un catalyseur
                <span className="muted small">
                  {resourceDef("catalyst").icon} {formatNum(state.resources.catalyst)}
                </span>
              </button>
            )}
            <button
              className={`ghost ${state.autoDistill ? "active" : ""}`}
              title="Fabriquer en boucle, tant qu'il reste des réactifs"
              onClick={() => store.act((s) => setAutoDistill(s, !s.autoDistill))}
            >
              🔁 {state.autoDistill ? "En boucle" : "Boucle"}
            </button>
          </div>
        </div>
        <div>
          {state.labUpgrading ? (
            <div className="right">
              <div className="muted small">
                Amélioration · {formatDuration(state.labUpgrading.remaining)} restant
              </div>
              {state.resources.catalyst > 0 && (
                <button className="ghost" onClick={() => store.act((s) => skipLabUpgrade(s))}>
                  ⧗ Finir avec un catalyseur
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setShowUpgrade(true)}>Agrandir</button>
          )}
        </div>
      </div>

      {showUpgrade && (
        <div className="modal-overlay" onClick={() => setShowUpgrade(false)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <div className="label">Agrandir le laboratoire</div>
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
                <b>{formatDuration(labUpgradeDuration(state.labLevel))}</b>
              </div>
            </div>
            <button
              disabled={state.resources.essence < labCost.essence}
              onClick={() => {
                store.act(upgradeLab);
                setShowUpgrade(false);
              }}
            >
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Équipement, en compact : équipé + réserve, mêmes actions que l'ancien onglet Élixirs. */
function GearCard({ state }: { state: ReturnType<typeof useGame> }) {
  const mods = allMods(state);
  const stash = [...state.stash].sort((a, b) => itemScore(b) - itemScore(a));
  // Une icône par emplacement ; cliquer en déplie les stats, sans occuper de
  // place tant qu'on ne regarde pas.
  const [openSlot, setOpenSlot] = useState<SlotId | null>(null);
  const openItem = openSlot ? state.equipped[openSlot] : undefined;

  return (
    <div className="card compact">
      <div className="label">Équipé</div>
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
              <ItemCard
                item={openItem}
                actions={
                  <button
                    disabled={state.resources.essence < upgradeCost(openItem, mods)}
                    onClick={() => store.act((st) => upgrade(st, openItem.id))}
                  >
                    Affiner{" "}
                    <span className="muted small">{formatNum(upgradeCost(openItem, mods))} ess</span>
                  </button>
                }
              />
            ) : (
              <div className="muted small">Vide — à distiller.</div>
            )}
          </div>
        </div>
      )}

      <div className="row between">
        <div className="label">Réserve · {stash.length}</div>
        {stash.length > 0 && (
          <button className="ghost" onClick={() => store.act(dissolveAll)}>
            Tout dissoudre
          </button>
        )}
      </div>
      {stash.length === 0 && <div className="muted small">Rien en attente.</div>}
      <div className="stack">
        {stash.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            actions={
              <>
                <button onClick={() => store.act((st) => equip(st, item.id))}>Porter</button>
                <button className="ghost" onClick={() => store.act((st) => dissolve(st, item.id))}>
                  Dissoudre
                </button>
              </>
            }
          />
        ))}
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
        <div className="row between">
          <Sprite character={hero} anim="idle" fallbackAnim={["idle"]} />
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
        <div className="label">Pureté attendue</div>
        <div className="purity-bar">
          {PURITIES.map((p, i) => {
            const share = (weights[i] / totalWeight) * 100;
            if (share < 0.4) return null;
            return (
              <div
                key={p.id}
                className="purity-seg"
                style={{ width: `${share}%`, background: p.color }}
                title={`${p.name} ${share.toFixed(0)} %`}
              />
            );
          })}
        </div>
        <PurityLegend />
      </div>
    </div>
  );
}

/** Popup « 🎯 » : la vague de contrat à venir dans ce chapitre, et sa récompense. */
function MissionPopup({ best, onClose }: { best: number; onClose: () => void }) {
  const target = nextMissionWave(best);
  const progress = target ? Math.min(1, best / target) : 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div className="label">Mission</div>
          <button className="ghost" onClick={onClose}>✕</button>
        </div>
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
                {resourceDef("catalyst").icon} +{MISSION_CATALYST_REWARD} à la vague {target}
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
