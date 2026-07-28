import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  MISSION_REWARD,
  MISSION_WAVE_INTERVAL,
  PURITIES,
  SLOTS,
  STATS,
  nextMissionWave,
  purity,
} from '../game/content';
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
} from '../game/engine';
import {
  LAB_MAX,
  distillCost,
  skipCost,
  powerScore,
  heroStats,
  itemScore,
  itemStats,
  labUpgradeCost,
  labUpgradeDuration,
  purityWeights,
} from '../game/formulas';
import { mods as allMods, type Mods } from '../game/modifiers';
import { DEFAULT_CHARACTER } from '../game/characters';
import { store, useGame } from '../game/store';
import type { GameState, Item, PurityId, SlotId, StatKey } from '../game/types';
import { Arena, FighterBar } from './Arena';
import { Cauldron } from './Cauldron';
import { ItemCard, SlotIcon } from './ItemCard';
import { Sprite } from './Sprite';
import { Dropdown } from './Filters';
import { ResIcon } from './ResIcon';
import { SLOT_OPTIONS, SUB_OPTIONS, TIER_OPTIONS } from '../game/filter-options';
import { Bar, Button, Card, Label, Muted, Popup, Row } from './kit';
import { C, S } from './theme';

/** Statistiques montrées dans la fiche de composition. */
const SHOWN: StatKey[] = [
  'power',
  'health',
  'volatility',
  'chain',
  'osmosis',
  'condensation',
  'clairvoyance',
  'rupture',
];

/** L'écran principal : le combat, le laboratoire, l'équipement, le journal. */
export function BrumeView() {
  const state = useGame();
  const c = state.combat;
  const s = heroStats(state);
  const [logOpen, setLogOpen] = useState(false);

  return (
    <ScrollView contentContainerStyle={S.view}>
      <Card>
        {/* Une seule scène : les deux combattants s'y déplacent vraiment. */}
        <Arena />

        <Row style={{ alignItems: 'flex-start', gap: 12 }}>
          <FighterBar side="hero" name="Toi" hp={c.hero.hp} max={s.health} />
          {/* Pendant le temps mort entre deux vagues, la liste d'ennemis est vide :
              la barre annonce l'attente au lieu de lire un ennemi qui n'existe pas. */}
          <FighterBar
            side="foe"
            name={
              c.enemies.length === 0
                ? 'Vague suivante…'
                : c.enemies.length > 1
                  ? `${c.enemies.filter((e) => e.hp > 0).length} / ${c.enemies.length} ennemis`
                  : c.enemies[0].name
            }
            hp={c.enemies.reduce((sum, e) => sum + Math.max(0, e.hp), 0)}
            max={Math.max(1, c.enemies.reduce((sum, e) => sum + e.maxHp, 0))}
          />
        </Row>
      </Card>

      <LabCard state={state} />
      <GearCard state={state} />

      {/* Journal réduit : la dernière ligne, le reste dans une popup. */}
      <Card>
        <Pressable onPress={() => setLogOpen(true)} style={[S.row, S.between]}>
          <Label>Journal</Label>
          <Muted>voir plus ▾</Muted>
        </Pressable>
        {state.log.slice(0, 1).map((line, i) => (
          <Text key={i} style={[S.muted, S.small]}>
            {line}
          </Text>
        ))}
      </Card>

      {logOpen && <LogPopup log={state.log} onClose={() => setLogOpen(false)} />}
      <View style={{ height: 8 }} />
    </ScrollView>
  );
}

/** Chaudron, en compact : même moteur que l'ancien onglet Laboratoire. */
function LabCard({ state }: { state: GameState }) {
  const cost = distillCost(state.labLevel);
  const labCost = labUpgradeCost(state.labLevel, state.ascension.count);
  const mods = allMods(state);
  const d = state.distilling;
  /** Fiole pleine d'une sauvegarde antérieure au ramassage automatique. */
  const finished = !!d && d.remaining <= 0;
  const ready = !d && state.resources.reagent >= cost;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showLoop, setShowLoop] = useState(false);
  const maxed = state.labLevel >= LAB_MAX;

  return (
    <Card style={{ borderColor: C.essence }}>
      <Cauldron
        state={state}
        mods={mods}
        onPress={
          finished
            ? () => store.act((s) => collectDistillation(s))
            : ready
              ? () => store.act((s) => startRandomDistillation(s))
              : undefined
        }
      />
      <Row between>
        <View>
          <Row>
            <Label>⚗ Laboratoire</Label>
            {state.ascension.count > 0 && (
              <Text style={{ color: C.shard, fontSize: 12 }}>
                {'✦'.repeat(Math.min(5, state.ascension.count))}
                {state.ascension.count > 5 ? `×${state.ascension.count}` : ''}
              </Text>
            )}
          </Row>
          <Button tone="ghost" onPress={() => setShowLoop(true)}>
            <Text style={[S.buttonText, state.autoDistill && { color: C.essence }]}>
              🔁 {state.autoDistill ? 'En boucle' : 'Boucle'}
            </Text>
          </Button>
        </View>

        {/* Le bouton reste en place pendant les travaux : il se remplit et affiche
            le temps restant, au lieu de disparaître. */}
        <Pressable
          onPress={() => setShowUpgrade(true)}
          style={[S.button, { minWidth: 130, overflow: 'hidden' }]}
        >
          {state.labUpgrading && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${(1 - state.labUpgrading.remaining / state.labUpgrading.total) * 100}%`,
                backgroundColor: 'rgba(79, 214, 160, 0.18)',
              }}
            />
          )}
          <View style={{ alignItems: 'center' }}>
            <Text style={S.buttonText}>Améliorer</Text>
            <Text style={[S.muted, S.small]}>
              {state.labUpgrading
                ? formatDuration(state.labUpgrading.remaining)
                : maxed
                  ? 'niveau maximum'
                  : `niveau ${state.labLevel + 1}`}
            </Text>
          </View>
        </Pressable>
      </Row>

      {showLoop && <LoopPopup onClose={() => setShowLoop(false)} />}

      {showUpgrade && (
        <Popup
          title={state.labUpgrading ? 'Travaux en cours' : 'Améliorer le laboratoire'}
          onClose={() => setShowUpgrade(false)}
        >
          <Muted>
            {maxed
              ? `Niveau ${LAB_MAX} : le laboratoire est au bout de ce qu'il peut devenir. La suite passe par une dissolution.`
              : `Niveau ${state.labLevel} → ${state.labLevel + 1}`}
          </Muted>

          {/* Au niveau maximum, ni coût ni durée : il n'y a plus rien à payer. */}
          {!maxed && (
            <View style={S.grid2}>
              <View style={S.statline}>
                <Muted>Coût</Muted>
                <Text style={S.bold}>{formatNum(labCost.essence)} ess</Text>
              </View>
              <View style={S.statline}>
                <Muted>Durée</Muted>
                <Text style={S.bold}>
                  {formatDuration(labUpgradeDuration(state.labLevel, state.ascension.count))}
                </Text>
              </View>
            </View>
          )}

          {/* Ce que l'amélioration change vraiment : la pureté de ce qui sort du
              chaudron. Avant / après, pour décider en connaissance. */}
          <Label>Puretés obtenues</Label>
          <PurityOdds labLevel={state.labLevel} mods={mods} />
          {/* Pas d'« après » quand il n'y a plus d'après. */}
          {!maxed && (
            <>
              <Muted>Après amélioration</Muted>
              <PurityOdds labLevel={state.labLevel + 1} mods={mods} />
            </>
          )}

          {state.labUpgrading ? (
            <Row between>
              <Muted>{formatDuration(state.labUpgrading.remaining)} restant</Muted>
              <Button
                disabled={state.resources.goldCoin < skipCost(state.labUpgrading.remaining)}
                onPress={() => store.act((st) => skipLabUpgrade(st))}
              >
                <Text style={S.buttonText}>Finir tout de suite</Text>
                <Text style={[S.muted, S.small]}>
                  {formatNum(skipCost(state.labUpgrading.remaining))}
                </Text>
                <ResIcon id="goldCoin" size={14} />
              </Button>
            </Row>
          ) : (
            <Button
              tone="primary"
              disabled={maxed || state.resources.essence < labCost.essence}
              onPress={() => {
                store.act(upgradeLab);
                setShowUpgrade(false);
              }}
            >
              {maxed ? 'Niveau maximum' : 'Confirmer'}
            </Button>
          )}
        </Popup>
      )}
    </Card>
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
    <Row style={{ flexWrap: 'wrap', gap: 6 }}>
      {PURITIES.map((p, i) => {
        const share = (weights[i] / total) * 100;
        if (share < 0.5) return null;
        return (
          <View
            key={p.id}
            style={{
              borderWidth: 1,
              borderColor: p.color,
              borderRadius: 999,
              paddingHorizontal: 7,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: p.color, fontSize: 11.5 }}>
              {p.name} {share.toFixed(0)} %
            </Text>
          </View>
        );
      })}
    </Row>
  );
}

/** Équipement : les huit emplacements portés, et la réserve derrière un bouton. */
function GearCard({ state }: { state: GameState }) {
  const stash = [...state.stash].sort((a, b) => itemScore(b) - itemScore(a));
  // Une icône par emplacement ; toucher en déplie les stats, sans occuper de place
  // tant qu'on ne regarde pas.
  const [openSlot, setOpenSlot] = useState<SlotId | null>(null);
  const [showStash, setShowStash] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const openItem = openSlot ? state.equipped[openSlot] : undefined;

  return (
    <Card>
      <Row between>
        <Label>Équipé</Label>
        {/* Les statistiques complètes se lisent depuis l'équipement, là où on se
            pose la question — plus depuis l'en-tête du combat. */}
        <Button tone="ghost" onPress={() => setShowInfo(true)}>
          ⓘ
        </Button>
      </Row>

      <Row style={{ flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' }}>
        {SLOTS.map((slot) => {
          const item = state.equipped[slot.id];
          const p = item ? purity(item.purity) : null;
          return (
            <Pressable
              key={slot.id}
              onPress={() => setOpenSlot(openSlot === slot.id ? null : slot.id)}
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: p?.color ?? C.line,
                opacity: item ? 1 : 0.5,
              }}
            >
              <SlotIcon slot={slot.id} color={p?.color ?? '#4a4f5c'} size={24} />
            </Pressable>
          );
        })}
      </Row>

      {openSlot && (
        <Popup
          title={SLOTS.find((sl) => sl.id === openSlot)?.name ?? ''}
          onClose={() => setOpenSlot(null)}
        >
          {openItem ? <ItemCard item={openItem} /> : <Muted>Vide — à distiller.</Muted>}
        </Popup>
      )}

      {/* La réserve ne prend plus qu'une ligne : le détail vit dans sa popup, avec
          ses filtres — une liste de trente pièces n'a rien à faire ici. */}
      <Pressable onPress={() => setShowStash(true)} style={[S.row, S.between]}>
        <Label>Réserve · {stash.length}</Label>
        <Muted>{stash.length ? 'Voir et filtrer' : 'Vide'}</Muted>
      </Pressable>

      {showStash && <StashPopup onClose={() => setShowStash(false)} />}
      {showInfo && <InfoPopup onClose={() => setShowInfo(false)} />}
    </Card>
  );
}

/**
 * Fabrication en boucle : l'interrupteur, et les filtres qui décident de ce qu'on
 * garde. Ce qui n'est pas coché est dissous en sortant du chaudron — sinon la
 * boucle remplit la réserve de rebut en quelques minutes.
 */
function LoopPopup({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const f = state.loopFilters;
  const set = (next: Partial<typeof f>) =>
    store.act((st) => {
      st.loopFilters = { ...st.loopFilters, ...next };
    });

  return (
    <Popup title="Fabrication en boucle" onClose={onClose}>
      <Muted>
        Ce qui est coché part en réserve. Le reste est dissous en sortant du chaudron.
        Rien de coché : tout est gardé.
      </Muted>

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

      <Muted>Une seule secondaire cochée suffit pour qu'une pièce soit gardée.</Muted>

      <Button
        tone={state.autoDistill ? 'ghost' : 'primary'}
        onPress={() => store.act((st) => setAutoDistill(st, !st.autoDistill))}
      >
        {state.autoDistill ? 'Arrêter la boucle' : 'Lancer la boucle'}
      </Button>
    </Popup>
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
    <Popup title={`Réserve · ${shown.length} / ${state.stash.length}`} onClose={onClose}>
      <Dropdown label="Emplacement" options={SLOT_OPTIONS} selected={slots} onChange={setSlots} />
      <Dropdown label="Palier" options={TIER_OPTIONS} selected={tiers} onChange={setTiers} />
      <Dropdown label="Secondaire" options={SUB_OPTIONS} selected={subs} onChange={setSubs} />

      {state.stash.length > 0 && (
        <Button tone="ghost" onPress={() => store.act(dissolveAll)}>
          Tout dissoudre
        </Button>
      )}

      {shown.length === 0 && <Muted>Aucune pièce ne correspond.</Muted>}
      {shown.map((item) => (
        <View key={item.id} style={{ gap: 8 }}>
          <ItemCard
            item={item}
            actions={
              <>
                <Button onPress={() => setCompared(compared === item.id ? null : item.id)}>
                  {compared === item.id ? 'Masquer' : 'Comparer'}
                </Button>
                <Button onPress={() => store.act((st) => equip(st, item.id))}>Porter</Button>
                <Button tone="ghost" onPress={() => store.act((st) => dissolve(st, item.id))}>
                  Dissoudre
                </Button>
              </>
            }
          />
          {compared === item.id && <Comparison candidate={item} />}
        </View>
      ))}
    </Popup>
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
    <Card style={{ backgroundColor: '#141a22' }}>
      <Row between>
        <Label>Comparé à ce que tu portes</Label>
        <Text style={[S.bold, { color: delta >= 0 ? C.better : C.worse }]}>
          {delta >= 0 ? '+' : '−'}
          {formatNum(Math.abs(delta))} puissance
        </Text>
      </Row>
      {!worn && <Muted>Emplacement vide : tout est un gain.</Muted>}
      <View style={S.grid2}>
        {keys.map((k) => {
          const a = from[k] ?? 0;
          const b = to[k] ?? 0;
          const diff = b - a;
          if (Math.abs(diff) < 0.05) return null;
          return (
            <View key={k} style={S.statline}>
              <Muted>{STATS[k].name}</Muted>
              <Text style={[S.bold, S.small, { color: diff > 0 ? C.better : C.worse }]}>
                {diff > 0 ? '+' : '−'}
                {formatNum(Math.abs(diff))}
                {STATS[k].suffix}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/** Popup « ⓘ » : le portrait du héros, ses stats totales, et la pureté attendue. */
function InfoPopup({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const s = heroStats(state);
  const mods = allMods(state);
  const weights = purityWeights(state.labLevel, mods);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const hero = state.character ?? DEFAULT_CHARACTER;

  return (
    <Popup title="Composition" onClose={onClose}>
      {/* Le personnage au centre : c'est lui que ces chiffres décrivent. */}
      <View style={{ alignItems: 'center' }}>
        <Sprite character={hero} anim="idle" fallbackAnim={['idle']} scale={1.3} />
      </View>

      <View style={S.grid2}>
        {SHOWN.map((k) => {
          // Double frappe et Chance critique plafonnent : on montre le surplus perdu.
          const capped = (k === 'chain' || k === 'clairvoyance') && s[k] > 100;
          return (
            <View key={k} style={S.statline}>
              <Muted>{STATS[k].name}</Muted>
              <Text style={[S.bold, S.small, capped && { color: C.worse }]}>
                {formatNum(capped ? 100 : s[k])}
                {STATS[k].suffix}
                {capped ? ` +${formatNum(s[k] - 100)} perdu` : ''}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Les chances de pureté sont chiffrées ici, palier par palier : c'est la
          seule façon de savoir ce que vaut vraiment un niveau de plus. */}
      <Label>Pureté · laboratoire {state.labLevel}</Label>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' }}>
        {PURITIES.map((p, i) => {
          const share = (weights[i] / totalWeight) * 100;
          if (share < 0.4) return null;
          return <View key={p.id} style={{ width: `${share}%`, backgroundColor: p.color }} />;
        })}
      </View>
      <View style={S.grid2}>
        {PURITIES.map((p, i) => {
          const share = (weights[i] / totalWeight) * 100;
          return (
            <View key={p.id} style={S.statline}>
              <Text style={{ color: p.color, fontSize: 12 }}>{p.name}</Text>
              <Text style={[S.small, { color: share > 0 ? C.fg : C.muted }]}>
                {share >= 0.05 ? `${share.toFixed(1)} %` : '—'}
              </Text>
            </View>
          );
        })}
      </View>
    </Popup>
  );
}

/**
 * Contrat du chapitre : la vague à nettoyer et sa récompense. Vit dans l'onglet
 * Campagnes, avec les missions — c'est le même genre d'objectif.
 */
export function ContractPopup({ best, onClose }: { best: number; onClose: () => void }) {
  const state = useGame();
  const target = nextMissionWave(best);
  const progress = target ? Math.min(1, best / target) : 1;

  return (
    <Popup title="Contrat du chapitre" onClose={onClose}>
      {state.pendingContract && (
        <Button tone="primary" onPress={() => store.act((st) => claimContract(st))}>
          <Text style={[S.buttonText, S.buttonTextPrimary]}>Récupérer la récompense</Text>
          <ResIcon id="essence" size={13} />
          <Text style={[S.muted, S.small]}>{formatNum(state.pendingContract.essence)}</Text>
          <ResIcon id="reagent" size={13} />
          <Text style={[S.muted, S.small]}>{formatNum(state.pendingContract.reagent)}</Text>
          <ResIcon id="insight" size={13} />
          <Text style={[S.muted, S.small]}>{formatNum(state.pendingContract.insight)}</Text>
        </Button>
      )}

      {target ? (
        <>
          <Muted>
            Nettoyer la vague {target} de ce chapitre (toutes les {MISSION_WAVE_INTERVAL} vagues,
            un contrat tombe).
          </Muted>
          <Bar ratio={progress} color={C.essence} />
          <Muted>
            Vague {Math.min(best, target)} / {target}
          </Muted>
          <Row style={{ gap: 4, flexWrap: 'wrap' }}>
            <ResIcon id="essence" size={13} />
            <Text style={[S.text, S.small]}>
              +{formatNum(MISSION_REWARD.essence * (1 + state.combat.district))}
            </Text>
            <ResIcon id="reagent" size={13} />
            <Text style={[S.text, S.small]}>
              +{MISSION_REWARD.reagent * (1 + state.combat.district)}
            </Text>
            <ResIcon id="insight" size={13} />
            <Text style={[S.text, S.small]}>
              +{MISSION_REWARD.insight * (1 + state.combat.district)} à la vague {target}
            </Text>
          </Row>
        </>
      ) : (
        <Muted>
          Tous les contrats de ce chapitre sont remplis — le prochain tombera au chapitre
          suivant.
        </Muted>
      )}
    </Popup>
  );
}

/** Popup du journal : l'historique complet, la dernière action toujours en haut. */
function LogPopup({ log, onClose }: { log: string[]; onClose: () => void }) {
  return (
    <Popup title="Journal" onClose={onClose}>
      {log.map((line, i) => (
        <Text key={i} style={[S.small, { color: i === 0 ? C.fg : C.muted }]}>
          {line}
        </Text>
      ))}
    </Popup>
  );
}
