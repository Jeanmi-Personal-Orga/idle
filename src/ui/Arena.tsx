import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { DEFAULT_CHARACTER, spriteStyle } from '../game/characters';
import { districtLabel, WAVES_PER_DISTRICT, cycleOf } from '../game/content';
import {
  STEP_TIME,
  WAVE_PAUSE,
  closingTime,
  engagedEnemies,
  formatNum,
  type FightScope,
} from '../game/engine';
import { BACKGROUND_LAYERS, spriteSize } from '../game/sprites';
import { image } from '../game/images';
import { store, useGame } from '../game/store';
import type { Enemy, Hero } from '../game/types';
import { Sprite } from './Sprite';
import { C, S } from './theme';
import { toggleHitboxes, useHitboxes } from './debug';
import { CONTACT_GAP, EDGE, FOE_BOX, HERO_BOX, arenaLayout, fileSpacing } from './arena-geometry';

/**
 * L'arène : une seule scène, où la distance se joue vraiment.
 *
 * Déroulé d'une vague :
 * 1. le héros tient sa marque, à gauche ; l'ennemi entre par la droite ;
 * 2. ils marchent l'un vers l'autre à la même vitesse — qui couvre quelle part du
 *    chemin dépend des armes (voir `heroShare`) ;
 * 3. arrivés au contact, boîtes à quelques pixels l'une de l'autre, ils échangent
 *    les coups jusqu'à la mort ;
 * 4. un rang tombe : le héros franchit un pas jusqu'au suivant, et ne frappe pas
 *    pendant ce pas ;
 * 5. vague nettoyée — ou héros tombé — l'écran passe au noir, la scène se remet en
 *    ordre, et la suivante entre par la droite.
 *
 * Toute la géométrie est **calculée** (`arena-geometry.ts`), jamais mesurée : seule
 * la largeur de la scène est lue. Les déplacements passent par `Animated`, qui
 * remplace les transitions et `@keyframes` de la version web.
 */
export function Arena({
  fight,
  scope = 'chapter',
  district,
}: {
  /** Le combat à afficher : celui du chapitre, ou celui d'une mission. */
  fight?: {
    hero: Hero;
    enemies: Enemy[];
    closing: number;
    reviving: number;
    interlude?: number;
    wave?: number;
    waves?: number;
  };
  scope?: FightScope;
  /** Profondeur, pour la teinte des ennemis et le décor. */
  district?: number;
} = {}) {
  const state = useGame();
  const chapter = state.combat;
  const c = {
    hero: fight?.hero ?? chapter.hero,
    enemies: fight?.enemies ?? chapter.enemies,
    closing: fight?.closing ?? chapter.closing,
    reviving: fight?.reviving ?? chapter.reviving,
    district: district ?? chapter.district,
    wave: fight?.wave ?? chapter.wave,
    waves: fight?.waves ?? WAVES_PER_DISTRICT,
    interlude: fight ? (fight.interlude ?? 0) : (chapter.interlude ?? 0),
    // Une mission n'a pas de relève : une chute y met fin.
    interludeFrom: fight ? 'wave' : (chapter.interludeFrom ?? 'wave'),
  };
  const between = c.interlude > 0;
  /** Temps mort qui suit une chute : le héros ne sort pas, il se relève sur place. */
  const afterDeath = between && c.interludeFrom === 'death';

  const hero = state.character ?? DEFAULT_CHARACTER;
  const frontIndex = Math.max(0, c.enemies.findIndex((e) => e.hp > 0));
  const front = c.enemies[frontIndex] ?? c.enemies[0];
  const sprite = front?.sprite ?? 'champignon';
  // « Écho de soi » du Puits Prismatique : l'ennemi est le sprite du joueur.
  const foe = sprite === 'self' ? hero : sprite;
  const engaged = engagedEnemies(c.enemies);
  /** Rangs déjà tombés dans cette vague : autant de pas que le héros a franchis. */
  const fallen = c.enemies.filter((e) => e.hp <= 0).length;

  const guardian = c.wave === c.waves;
  const heroStyle = state.equipped.arme?.ranged ? 'ranged' : 'melee';
  const foeStyle = spriteStyle(foe);
  const dead = c.reviving > 0;
  const showHitboxes = useHitboxes();

  // La largeur de la scène est la seule mesure : `onLayout` la donne, et tout le
  // placement en découle par le calcul.
  const [arenaWidth, setArenaWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setArenaWidth(e.nativeEvent.layout.width);

  // Qui couvre quelle distance, à vitesse égale : les deux au contact se
  // rejoignent au milieu ; face à une bestiole qui vole, le héros fait tout le
  // chemin ; s'il frappe à distance, il ne bouge pas.
  const heroShare = heroStyle === 'melee' ? (foeStyle === 'melee' ? 0.5 : 1) : 0;
  const heroWidth = spriteSize(hero).width;
  const foeWidth = spriteSize(foe, guardian && c.enemies.length === 1 ? 1.3 : 1).width;
  const layout = arenaLayout(arenaWidth, heroWidth, foeWidth, heroShare);
  const step = fileSpacing(foeWidth);
  const heroTravel = layout.heroTravel + fallen * step;
  const foeTravel = foeStyle === 'melee' ? layout.foeTravel : 0;
  const exitTravel = Math.max(0, arenaWidth - EDGE - heroWidth - layout.heroLeft);

  const walkMs = between
    ? WAVE_PAUSE * 1000
    : fallen > 0
      ? STEP_TIME * 1000
      : Math.max(120, closingTime(state) * 1000);

  const walking = (c.closing ?? 0) > 0 && !dead;
  const heroWalking = (walking && heroTravel > 0) || (between && !afterDeath);
  const foeWalking = walking && foeTravel > 0;

  const heroStrike = usePulse(store.heroSwings[scope], 220) && !dead;
  const heroHit = usePulse(store.foeSwings[scope], 170) && !dead;

  // Position du héros. Mort, il reste là où il est tombé ; après une chute il
  // revient à sa marque sous le noir ; entre deux vagues il sort par la droite.
  const heroAt = afterDeath ? 0 : dead ? heroTravel : between ? exitTravel : heroTravel;
  const heroFrom = between ? heroTravel : fallen > 0 ? heroTravel - step : 0;
  const heroX = useWalk(heroAt, heroFrom, walkMs, `${between}-${c.district}-${c.wave}-${fallen}`);

  // Le rideau noir couvre les coupures : d'un coup à la mort, avec un temps de
  // retard entre deux vagues — celui de la sortie de scène.
  const waveCurtain = useDelayed(between && !afterDeath, 1100);
  const curtain = dead || afterDeath || waveCurtain;
  const curtainOpacity = useFade(curtain ? 1 : 0, 450);
  const hurtFlash = useFade(heroHit ? 0.16 : 0, 120);

  const heroJolt = (heroStrike ? 7 : 0) - (heroHit ? 5 : 0);

  return (
    <View style={styles.arena} onLayout={onLayout}>
      {/* Décor en cinq couches, de la plus lointaine à la plus proche. */}
      {BACKGROUND_LAYERS.map((src, i) => {
        const source = image(src);
        return source ? (
          <Image
            key={src}
            source={source}
            style={[
              styles.bgLayer,
              { transform: [{ translateX: (i - 2) * 4 }, { scale: 1 + i * 0.02 }] },
            ]}
            resizeMode="cover"
          />
        ) : null;
      })}

      {/* Chapitre et vague sur la scène : c'est là que le joueur regarde.
          L'annonce se lit en grand pendant le temps mort. */}
      <View style={[styles.banner, between && styles.bannerAnnounce]} pointerEvents="none">
        <Text style={[styles.bannerTitle, between && { color: C.essence, fontSize: 17 }]}>
          {districtLabel(c.district)}
        </Text>
        <Text style={[styles.bannerLine, between && { fontSize: 13, color: C.fg }]}>
          Vague {c.wave} / {c.waves}
          {c.wave === c.waves ? ' · gardien' : ''}
        </Text>
      </View>

      {/* Le héros : la position vient du calcul, la marche d'`Animated`, et les
          à-coups de frappe d'une couche à part — sinon un coup écraserait la
          marche en cours, ce qui donnait un dash. */}
      <Animated.View
        style={[styles.slot, { left: layout.heroLeft, transform: [{ translateX: heroX }] }]}
      >
        <Animated.View style={{ transform: [{ translateX: heroJolt }] }}>
          {showHitboxes && <Box inset={layout.heroInset} color={C.essence} />}
          <Sprite
            character={hero}
            anim={heroAnim(dead, c.reviving, heroWalking, heroStrike, heroHit)}
            fallbackAnim={['idle']}
            fade={heroHit}
          />
        </Animated.View>
        <TakenHits scope={scope} />
      </Animated.View>

      {/* La vague en file indienne. Chaque ennemi garde le rang de son index :
          quand celui de devant tombe, les autres ne bougent pas. */}
      <View
        style={[styles.slot, { left: layout.foeLeft, opacity: between || !front ? 0 : 1 }]}
        pointerEvents="none"
      >
        {c.enemies.map((enemy, index) =>
          enemy.hp <= 0 ? null : (
            <FoeUnit
              key={index}
              wave={`${c.district}-${c.wave}`}
              scope={scope}
              enemy={enemy}
              index={index}
              hero={hero}
              cycled={cycleOf(c.district) > 0}
              guardian={guardian && c.enemies.length === 1}
              travel={
                spriteStyle(enemy.sprite === 'self' ? hero : enemy.sprite) === 'melee'
                  ? foeTravel
                  : 0
              }
              rank={index}
              spacing={step}
              walkMs={walkMs}
              walking={foeWalking}
              engaged={engaged.has(index)}
              showBox={showHitboxes ? layout.foeInset : undefined}
            />
          ),
        )}
      </View>

      {/* Un ennemi à distance projette, puisqu'il ne s'approche jamais. */}
      {foeStyle === 'ranged' && (
        <Projectiles
          distance={layout.foeLeft - layout.heroLeft - heroWidth}
          swings={store.foeSwings[scope]}
        />
      )}

      {/* Repères de mise au point : marques d'arrivée et relevé des chiffres. */}
      {showHitboxes && (
        <View style={styles.guides} pointerEvents="none">
          <View
            style={[
              styles.mark,
              { left: layout.heroLeft + heroWidth - layout.heroInset + heroTravel },
            ]}
          />
          <View
            style={[
              styles.mark,
              { left: layout.foeLeft + layout.foeInset - foeTravel, backgroundColor: C.reagent },
            ]}
          />
          <Text style={styles.readout}>
            scène {Math.round(arenaWidth)} · boîtes {Math.round(heroWidth * HERO_BOX)} /{' '}
            {Math.round(foeWidth * FOE_BOX)} · marche {Math.round(heroTravel)} /{' '}
            {Math.round(foeTravel)} · écart {CONTACT_GAP} · pas {step}
          </Text>
        </View>
      )}

      {/* Le rideau, toujours monté : c'est son opacité qui monte et descend, donc
          le fondu se joue dans les deux sens. */}
      <Animated.View style={[styles.blackout, { opacity: curtainOpacity }]} pointerEvents="none" />

      {/* Ce qu'on encaisse : un voile rouge très bref, à la place de la secousse. */}
      <Animated.View style={[styles.hurtFlash, { opacity: hurtFlash }]} pointerEvents="none" />

      <Pressable
        onPress={toggleHitboxes}
        style={[styles.toggle, showHitboxes && { borderColor: C.essence }]}
      >
        <Text style={{ color: showHitboxes ? C.essence : C.muted, fontSize: 11 }}>▣</Text>
      </Pressable>
    </View>
  );
}

function heroAnim(
  dead: boolean,
  reviving: number,
  walking: boolean,
  striking: boolean,
  hit: boolean,
): string {
  // La réanimation dure 3 s : il tombe, puis se relève sur la dernière seconde.
  if (dead) return reviving < 1 ? 'hurt' : 'death';
  if (striking) return 'attack';
  if (hit) return 'hurt';
  if (walking) return 'walk';
  return 'idle';
}

function foeAnim(walking: boolean, striking: boolean, hit: boolean): string {
  if (striking) return 'attack';
  if (hit) return 'hurt';
  if (walking) return 'walk';
  return 'idle';
}

/**
 * Un ennemi de la vague, à son rang. Tous entrent par la droite et couvrent la
 * même distance, donc la file arrive en formation ; l'écart vient du rang, pas de
 * l'ordre des vivants, si bien qu'une mort ne déplace personne.
 *
 * Il ne frappe que si le moteur lui accorde une place au contact
 * (`engagedEnemies`) : ceux qui font la queue attendent sans infliger de dégâts.
 */
function FoeUnit({
  scope,
  enemy,
  index,
  rank,
  travel,
  walkMs,
  walking,
  wave,
  engaged,
  hero,
  cycled,
  guardian,
  spacing,
  showBox,
}: {
  scope: FightScope;
  enemy: { hp: number; maxHp: number; sprite: string; name: string };
  index: number;
  /** Place dans la file : décale le point de départ vers la droite. */
  rank: number;
  travel: number;
  walkMs: number;
  walking: boolean;
  /** Change à chaque vague : relance l'animation d'entrée. */
  wave: string;
  engaged: boolean;
  hero: string;
  cycled: boolean;
  guardian: boolean;
  spacing: number;
  /** Vide de chaque côté, quand on demande à voir les boîtes ; sinon `undefined`. */
  showBox?: number;
}) {
  useGame();
  const sprite = enemy.sprite === 'self' ? hero : enemy.sprite;
  const ranged = spriteStyle(sprite) === 'ranged';
  // Chaque ennemi ne réagit qu'aux coups qui le visent.
  const lastHit = [...store.hits[scope]].reverse().find((h) => h.targetIndex === index);
  const hit = usePulse(lastHit?.id ?? 0, 150);
  // Ceux qui sont au contact frappent ensemble : même compteur de salves.
  const striking = usePulse(store.foeSwings[scope], 220) && engaged;
  const jolt = -((striking ? 7 : 0) - (hit ? 5 : 0));
  const x = useWalk(rank * spacing, rank * spacing + travel, walkMs, wave);
  const hover = useHover(ranged);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        transform: [{ translateX: x }, { translateY: hover }],
        // Celui qui attend sa place au contact : présent, mais en retrait.
        opacity: engaged ? 1 : 0.72,
      }}
    >
      <Animated.View style={{ transform: [{ translateX: jolt }] }}>
        {showBox !== undefined && <Box inset={showBox} color={C.reagent} />}
        <Sprite
          character={sprite}
          anim={foeAnim(walking && travel > 0, striking, hit)}
          fallbackAnim={['idle']}
          scale={guardian ? 1.3 : 1}
          flip
          fade={hit}
          style={cycled ? { opacity: 0.92 } : undefined}
        />
      </Animated.View>
      <FloatingHits scope={scope} target={index} />
    </Animated.View>
  );
}

/** Tracé d'une boîte de collision, quand on demande à les voir. */
function Box({ inset, color }: { inset: number; color: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: inset,
        right: inset,
        zIndex: 3,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: `${color}22`,
      }}
    />
  );
}

/** Vrai pendant `ms` après chaque incrément du compteur. */
function usePulse(counter: number, ms: number): boolean {
  const [on, setOn] = useState(false);
  const seen = useRef(counter);

  useEffect(() => {
    if (counter === seen.current) return;
    seen.current = counter;
    setOn(true);
    const t = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(t);
  }, [counter, ms]);

  return on;
}

/**
 * Vrai `ms` après que `flag` soit passé à vrai, et faux dès qu'il retombe. Sert au
 * rideau noir : il ne doit descendre qu'une fois la sortie de scène entamée, mais
 * se lever sans délai.
 */
function useDelayed(flag: boolean, ms: number): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!flag) {
      setOn(false);
      return;
    }
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [flag, ms]);

  return on;
}

/**
 * Marche animée : part de `from`, rejoint `to` en `ms`, et **rejoue depuis le
 * départ** à chaque changement de `key` — une nouvelle vague, ou un pas vers le
 * rang suivant. C'est l'équivalent des `@keyframes` de la version web, dont la
 * relance dépendait d'un remontage de l'élément.
 */
function useWalk(from: number, to: number, ms: number, key: string): Animated.Value {
  const value = useRef(new Animated.Value(from)).current;
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (seen.current !== key) {
      seen.current = key;
      value.setValue(from);
    }
    const animation = Animated.timing(value, {
      toValue: to,
      duration: Math.max(1, ms),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
    // `from` seul ne relance rien : c'est la clé qui décide d'un nouveau départ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, ms, key, value]);

  return value;
}

/** Fondu générique, pour tout ce qui apparaît et disparaît. */
function useFade(to: number, ms: number): Animated.Value {
  const value = useRef(new Animated.Value(to)).current;

  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: to,
      duration: ms,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [to, ms, value]);

  return value;
}

/** Flottement continu des créatures volantes : elles ne posent pas les pieds. */
function useHover(active: boolean): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: -16,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: -8,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, value]);

  return value;
}

/** Projectiles d'un ennemi à distance, vers le héros. */
function Projectiles({ distance, swings }: { distance: number; swings: number }) {
  const [shots, setShots] = useState<number[]>([]);
  const seen = useRef(swings);

  useEffect(() => {
    if (swings === seen.current) return;
    seen.current = swings;
    setShots((p) => [...p, swings].slice(-4));
    const t = setTimeout(() => setShots((p) => p.slice(1)), 420);
    return () => clearTimeout(t);
  }, [swings]);

  return (
    <View style={styles.shots} pointerEvents="none">
      {shots.map((id) => (
        <Shot key={id} distance={distance} />
      ))}
    </View>
  );
}

function Shot({ distance }: { distance: number }) {
  const x = useWalk(0, -distance, 420, `${distance}`);
  return <Animated.View style={[styles.shot, { transform: [{ translateX: x }] }]} />;
}

/** Durée de vie d'un chiffre de dégâts ; la même que dans le magasin. */
const HIT_LIFE = 1400;

/**
 * Chiffres de dégâts : montée et fondu. Ils sont calculés depuis l'âge du coup à
 * chaque rendu — le magasin notifie à chaque image, donc c'est assez fluide, et ça
 * évite une animation par chiffre.
 */
function FloatingHits({ scope, target }: { scope: FightScope; target?: number }) {
  useGame();
  const now = performance.now();
  return (
    <View style={styles.hits} pointerEvents="none">
      {store.hits[scope]
        .filter((h) => target === undefined || h.targetIndex === target)
        .map((h) => {
          const age = Math.min(1, (now - h.born) / HIT_LIFE);
          return (
            <Text
              key={h.id}
              style={[
                styles.hit,
                h.crit && styles.hitCrit,
                { left: 20 + h.dx, top: h.dy - age * 26, opacity: 1 - age },
              ]}
            >
              {formatNum(h.damage)}
            </Text>
          );
        })}
    </View>
  );
}

/** Ce que le héros encaisse, en rouge, au moment où il l'encaisse. */
function TakenHits({ scope }: { scope: FightScope }) {
  useGame();
  const now = performance.now();
  return (
    <View style={styles.hits} pointerEvents="none">
      {store.taken[scope].map((h) => {
        const age = Math.min(1, (now - h.born) / HIT_LIFE);
        return (
          <Text
            key={h.id}
            style={[
              styles.hit,
              styles.hitTaken,
              { left: 20 + h.dx, top: h.dy - age * 26, opacity: 1 - age },
            ]}
          >
            −{formatNum(h.damage)}
          </Text>
        );
      })}
    </View>
  );
}

/** Barre et chiffres d'un combattant, sous la scène commune. */
export function FighterBar({
  side,
  name,
  hp,
  max,
  note,
}: {
  side: 'hero' | 'foe';
  name: string;
  hp: number;
  max: number;
  /** Ligne facultative sous la barre ; omise, rien n'est réservé à l'écran. */
  note?: string;
}) {
  const ratio = max > 0 ? hp / max : 0;
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <View style={S.bar}>
        <View
          style={[
            S.barFill,
            {
              width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
              backgroundColor: side === 'hero' ? C.essence : C.reagent,
            },
          ]}
        />
      </View>
      <Text style={[S.text, S.small, { fontWeight: '600' }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[S.muted, S.small]}>
        {formatNum(Math.max(0, hp))} / {formatNum(max)}
      </Text>
      {note ? <Text style={[S.muted, S.small]}>{note}</Text> : null}
    </View>
  );
}

const styles = {
  arena: {
    height: 168,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: C.ink,
    position: 'relative',
  },
  bgLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: undefined,
    height: undefined,
  },
  slot: {
    position: 'absolute',
    bottom: 12,
  },
  banner: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  bannerAnnounce: {
    top: '40%',
    zIndex: 6,
  },
  bannerTitle: {
    color: '#cfd9e4',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerLine: {
    color: C.muted,
    fontSize: 11,
  },
  blackout: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#05070a',
    zIndex: 4,
  },
  hurtFlash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ff6b6b',
    zIndex: 3,
  },
  hits: {
    position: 'absolute',
    left: -20,
    right: -20,
    top: -10,
    bottom: 0,
  },
  hit: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
    color: C.fg,
  },
  hitCrit: {
    color: C.lantern,
    fontSize: 15,
  },
  hitTaken: {
    color: '#ff8f8f',
  },
  shots: {
    position: 'absolute',
    right: '20%',
    bottom: 74,
  },
  shot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9ad6c0',
  },
  guides: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 5,
  },
  mark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: C.essence,
    opacity: 0.55,
  },
  readout: {
    position: 'absolute',
    left: 4,
    bottom: 2,
    fontSize: 9.5,
    color: '#cfd9e4',
    backgroundColor: 'rgba(10, 13, 20, 0.6)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  toggle: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 7,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: 'rgba(10, 13, 20, 0.55)',
  },
} as const;
