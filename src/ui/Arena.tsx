import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_CHARACTER, spriteStyle } from '../game/characters';
import {
  districtLabel, WAVES_PER_DISTRICT, cycleOf } from '../game/content';
import { STEP_TIME, WAVE_PAUSE, closingTime, engagedEnemies, formatNum } from '../game/engine';
import { BACKGROUND_LAYERS, spriteSize } from '../game/sprites';
import {
  CONTACT_GAP,
  EDGE,
  FOE_BOX,
  HERO_BOX,
  arenaLayout,
  fileSpacing,
} from './arena-geometry';
import { toggleHitboxes, useHitboxes } from './debug';
import { store, useGame } from '../game/store';
import type { Enemy, Hero } from '../game/types';
import type { FightScope } from '../game/engine';
import { Sprite } from './Sprite';

/**
 * L'arène : une seule scène, où la distance se joue vraiment.
 *
 * Déroulé d'une vague :
 * 1. le héros **tient sa place** au milieu de la scène ; il ne recule jamais et
 *    n'est jamais replacé d'un coup ;
 * 2. l'ennemi sort de la brume à droite et **marche jusqu'à lui** — le héros fait
 *    quelques pas à sa rencontre s'il se bat au contact ;
 * 3. arrivés au contact ils y restent, et échangent les coups jusqu'à la mort ;
 * 4. vague nettoyée, le héros marche jusqu'au bout à droite, l'écran passe au
 *    noir, et la vague suivante se lève sur une scène remise à zéro — héros à
 *    gauche, ennemis à droite.
 *
 * Sur une vague à plusieurs, seuls les `CONTACT_SLOTS` premiers tiennent au
 * contact et frappent ensemble ; les suivants attendent leur tour en retrait et
 * n'infligent aucun dégât tant qu'ils n'ont pas de place.
 *
 * L'approche est comptée par le **moteur** (`combat.closing`) : tant qu'elle
 * dure, aucun coup ne part, d'aucun des deux camps. L'affichage et la simulation
 * racontent donc la même chose, et on ne voit plus un coup porter depuis l'autre
 * bout de l'arène.
 *
 * Tout ceci est de la mise en scène : la simulation ne connaît que des cadences
 * de frappe, le déplacement les suit sans changer aucun résultat.
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
  // Sans combat fourni, on affiche celui du chapitre : c'est le cas courant.
  const chapter = state.combat;
  const c = {
    hero: fight?.hero ?? chapter.hero,
    enemies: fight?.enemies ?? chapter.enemies,
    closing: fight?.closing ?? chapter.closing,
    reviving: fight?.reviving ?? chapter.reviving,
    district: district ?? chapter.district,
    wave: fight?.wave ?? chapter.wave,
    // Nombre de vagues du front affiché : une mission a la longueur de son
    // tirage du jour, un chapitre en a toujours dix.
    waves: fight?.waves ?? WAVES_PER_DISTRICT,
    interlude: fight ? (fight.interlude ?? 0) : (chapter.interlude ?? 0),
    // Une mission n'a pas de relève : une chute y met fin.
    interludeFrom: fight ? 'wave' : (chapter.interludeFrom ?? 'wave'),
  };
  /** Entre deux vagues : le héros marche vers la sortie, personne ne se bat. */
  const between = c.interlude > 0;
  /**
   * Temps mort qui suit une chute : même écran noir, même entrée de l'ennemi par
   * la droite, mais le héros ne sort pas — il se relève sur place.
   */
  const afterDeath = between && c.interludeFrom === 'death';

  const hero = state.character ?? DEFAULT_CHARACTER;
  // Un mort quitte la scène : la cible affichée est le **premier ennemi encore
  // vivant**, et lui seul porte la mise en scène complète (marche, contact).
  // Ceux qui restent derrière avancent d'un rang à chaque mort.
  const frontIndex = Math.max(0, c.enemies.findIndex((e) => e.hp > 0));
  const front = c.enemies[frontIndex] ?? c.enemies[0];
  const sprite = front?.sprite ?? 'champignon';
  // « Écho de soi » du Puits Prismatique : l'ennemi est le sprite du joueur.
  const foe = sprite === 'self' ? hero : sprite;
  // Qui est au contact et qui fait la queue : la même règle que le moteur, pour
  // que ceux qu'on voit taper soient exactement ceux qui infligent des dégâts.
  const engaged = engagedEnemies(c.enemies);
  /** Rangs déjà tombés dans cette vague : autant de pas que le héros a franchis. */
  const fallen = c.enemies.filter((e) => e.hp <= 0).length;

  const guardian = c.wave === c.waves;
  // C'est l'arme équipée qui décide : de mêlée, il faut traverser.
  const heroStyle = state.equipped.arme?.ranged ? 'ranged' : 'melee';
  const foeStyle = spriteStyle(foe);
  const dead = c.reviving > 0;

  const arenaRef = useRef<HTMLDivElement>(null);
  const showHitboxes = useHitboxes();
  // Seule chose lue à l'écran : la largeur de la scène. Tout le placement en
  // découle par le calcul (voir arena-geometry.ts).
  const arenaWidth = useArenaWidth(arenaRef);

  // Même vitesse de déplacement pour tout le monde. Une arme de mêlée envoie le
  // héros à sa marque, à mi-distance, et il y reste : les vagues suivantes
  // viennent à lui. Une arme à distance le laisse en arrière, et c'est l'ennemi
  // qui traverse toute l'arène.
  // Qui couvre quelle distance, à vitesse égale :
  //
  // - les deux au contact : ils se rejoignent au milieu ;
  // - héros au contact, ennemi à distance (une bestiole qui vole) : le héros fait
  //   **tout** le chemin, il va la chercher sous le nez ;
  // - héros à distance : il ne bouge pas, l'ennemi traverse.
  const heroShare = heroStyle === 'melee' ? (foeStyle === 'melee' ? 0.5 : 1) : 0;
  // Largeurs des sprites, calculées depuis le catalogue : c'est ce qui rend le
  // placement exact sans rien mesurer.
  const heroWidth = spriteSize(hero).width;
  const foeWidth = spriteSize(foe, guardian && c.enemies.length === 1 ? 1.3 : 1).width;
  const layout = arenaLayout(arenaWidth, heroWidth, foeWidth, heroShare);
  // Les rangs ne reculent pas : quand celui de devant tombe, le héros franchit un
  // pas de plus, depuis là où il se trouve, pour retrouver le contact.
  const step = fileSpacing(foeWidth);
  const heroTravel = layout.heroTravel + fallen * step;
  const foeTravel = foeStyle === 'melee' ? layout.foeTravel : 0;
  // Sortie de scène entre deux vagues : jusqu'au bord droit, derrière l'ennemi.
  const exitTravel = Math.max(0, arenaWidth - EDGE - heroWidth - layout.heroLeft);
  // La marche dure exactement l'approche accordée par le moteur, et se joue
  // pendant son décompte : à l'arrivée, les coups partent. Un pas vers le rang
  // suivant est court (STEP_TIME), l'entrée en scène est longue.
  const walkMs = between
    ? WAVE_PAUSE * 1000
    : fallen > 0
      ? STEP_TIME * 1000
      : Math.max(120, closingTime(state) * 1000);

  const walking = (c.closing ?? 0) > 0 && !dead;


  // Frappes : impulsion vers l'adversaire au moment du coup.
  const heroStrike = usePulse(store.heroSwings[scope], 220) && !dead;
  // Le héros encaisse : éclat blanc et léger recul. Les ennemis, eux, gèrent leur
  // propre éclat dans `FoeUnit`, chacun sur les coups qui le visent.
  const heroHit = usePulse(store.foeSwings[scope], 170) && !dead;

  // Entre deux vagues, le héros continue jusqu'au bout de l'arène : c'est ce
  // déplacement qui raconte qu'on avance, plutôt qu'un décor qui défile.
  //
  // Comme l'ennemi, il part **toujours de sa marque** et s'anime vers sa cible :
  // une transition l'aurait fait reculer en glissant à la fin du temps mort, au
  // lieu de réapparaître à gauche sur la nouvelle scène.
  // Mort, il tombe **là où il se tenait** : rien ne le replace tant que l'écran
  // n'est pas noir. Le retour à sa marque se fait ensuite, sous le noir.
  const heroAt = afterDeath ? 0 : dead ? heroTravel : between ? exitTravel : heroTravel;
  // Le rideau noir couvre toutes les coupures : il tombe pendant que le héros
  // finit sa sortie, ou d'un coup quand il tombe, et se lève sur la scène remise
  // en ordre. C'est lui qui autorise le repositionnement instantané des camps.
  //
  // Entre deux vagues il attend que la marche de sortie soit bien entamée ; à la
  // mort il tombe tout de suite, pour qu'on ne voie pas l'ennemi rester planté là.
  // Le hook est appelé sans condition : un `||` court-circuité l'aurait sauté
  // certains rendus, ce que React interdit.
  const waveCurtain = useDelayed(between && !afterDeath, 1100);
  const curtain = dead || afterDeath || waveCurtain;
  // Plus de détection de collision à l'écran : la marche s'achève **exactement**
  // au contact, puisque sa distance est calculée pour cela. Le décompte du moteur
  // (`closing`) et l'animation partagent la même durée, donc l'instant où les
  // coups partent est aussi celui de l'arrivée.
  const heroWalking = (walking && heroTravel > 0) || (between && !afterDeath);
  const foeWalking = walking && foeTravel > 0;

  // Les à-coups de combat vivent sur leur propre couche : ils ne touchent plus à
  // la position de marche.
  const heroJolt = (heroStrike ? 7 : 0) - (heroHit ? 5 : 0);

  return (
    <div
      className={`arena ${heroHit ? 'shaken' : ''} ${showHitboxes ? 'debug-hitbox' : ''}`}
      ref={arenaRef}
    >
      {/* Décor en cinq couches, de la plus lointaine à la plus proche. */}
      {BACKGROUND_LAYERS.map((src, i) => (
        <div
          key={src}
          className="bg-layer"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${src})`,
            transform: `translateX(${(i - 2) * 4}px) scale(${1 + i * 0.02})`,
          }}
        />
      ))}

      {/* Toujours monté : c'est son opacité qui monte et descend, donc le fondu se
          joue dans les deux sens sans dépendre du montage. */}
      <div className={`blackout ${curtain ? 'on' : ''}`} aria-hidden="true" />

      {/* Chapitre et vague s'affichent sur la scène, pas dans une barre au-dessus :
          c'est là que le joueur regarde. L'annonce se lit en grand pendant le
          temps mort, et reste discrète pendant le combat. */}
      <div className={`wave-banner ${between ? 'announce' : ''}`} aria-live="polite">
        <b>{districtLabel(c.district)}</b>
        <span>
          Vague {c.wave} / {c.waves}
          {c.wave === c.waves && ' · gardien'}
        </span>
      </div>

      {/* Boîtes de collision à la demande : la géométrie étant calculée, pouvoir
          la regarder vaut mieux que la déduire. Le réglage vit hors de la
          sauvegarde (voir debug.ts). */}
      <button
        className="hitbox-toggle"
        title={showHitboxes ? 'Masquer les boîtes de collision' : 'Afficher les boîtes de collision'}
        onClick={toggleHitboxes}
      >
        ▣
      </button>

      {showHitboxes && (
        <div className="hitbox-guides" aria-hidden="true">
          {/* Marques d'arrivée : les bords des **boîtes**, pas des cases. */}
          <i
            className="mark hero-stop"
            style={{ left: layout.heroLeft + heroWidth - layout.heroInset + heroTravel }}
          />
          <i
            className="mark foe-stop"
            style={{ left: layout.foeLeft + layout.foeInset - foeTravel }}
          />
          <span className="hitbox-readout">
            scène {Math.round(arenaWidth)} · boîtes {Math.round(heroWidth * HERO_BOX)} /{' '}
            {Math.round(foeWidth * FOE_BOX)} · marche {Math.round(heroTravel)} /{' '}
            {Math.round(foeTravel)} · écart {CONTACT_GAP} · pas {step}
          </span>
        </div>
      )}

      <div className="fighter-slot hero" style={{ left: layout.heroLeft }}>
        {/*
          Deux couches, comme pour l'ennemi : `mover` porte la marche — longue et
          linéaire —, `lunge` porte les à-coups de frappe et de recul, courts et
          secs. Les mettre sur le même élément faisait qu'un coup réinterprétait
          la transition de marche en cours : le héros traversait alors l'arène en
          110 ms, ce qui donnait un dash vers l'ennemi.
        */}
        <div
          key={between ? 'exit' : `${c.district}-${c.wave}-${fallen}`}
          className={`mover ${heroAt > 0 ? 'approaching' : ''}`}
          style={{
            // La marche part **d'où il se trouve** : de sa marque pour entrer en
            // scène, de sa position actuelle pour un pas vers le rang suivant ou
            // pour la sortie. Sinon on le voyait revenir en arrière d'un coup.
            ['--from' as string]: `${
              between ? heroTravel : fallen > 0 ? heroTravel - step : 0
            }px`,
            ['--to' as string]: `${heroAt}px`,
            animationDuration: `${walkMs}ms`,
            transform: heroAt > 0 ? undefined : 'translateX(0)',
          }}
        >
          <div
            className="lunge"
            style={{ transform: `translateX(${heroJolt}px)` }}
          >
            {/* La boîte telle qu'elle compte vraiment : la case, resserrée. */}
            {showHitboxes && (
              <span
                className="hitbox-box hero"
                aria-hidden="true"
                style={{ left: layout.heroInset, right: layout.heroInset }}
              />
            )}
            <Sprite
              character={hero}
              anim={heroAnim(dead, c.reviving, heroWalking, heroStrike, heroHit)}
              fallbackAnim={['idle']}
              className={heroHit ? 'flash' : ''}
            />
          </div>
          {heroHit && <span className="impact" aria-hidden="true" />}
          {/* Ce que le héros encaisse, en chiffres, au moment où il l'encaisse. */}
          <TakenHits scope={scope} />
        </div>
      </div>

      {/*
        La vague en file indienne. Chaque ennemi garde le rang de son index :
        son écart de départ ne dépend pas de qui est encore en vie, donc quand
        celui de devant tombe, les autres **ne bougent pas** — ils restent où ils
        sont et frappent de là, dès que le moteur leur donne une place au contact.
      */}
      <div
        className={`fighter-slot foe ${between || !front ? 'gone' : ''}`}
        style={{ left: layout.foeLeft }}
      >
        {c.enemies.map((enemy, index) =>
          enemy.hp <= 0 ? null : (
            <FoeUnit
              key={index}
              // La boîte est recréée à chaque vague : l'entrée en scène rejoue.
              wave={`${c.district}-${c.wave}`}
              scope={scope}
              enemy={enemy}
              index={index}
              hero={hero}
              cycled={cycleOf(c.district) > 0}
              guardian={guardian && c.enemies.length === 1}
              // Tout le monde couvre la même distance : la file garde sa
              // formation, le premier rang arrive au contact et les autres
              // restent derrière, à un rang d'écart.
              travel={
                spriteStyle(enemy.sprite === 'self' ? hero : enemy.sprite) === 'melee'
                  ? foeTravel
                  : 0
              }
              rank={index}
              spacing={step}
              showBox={showHitboxes ? layout.foeInset : undefined}
              walkMs={walkMs}
              walking={foeWalking}
              engaged={engaged.has(index)}
            />
          ),
        )}
      </div>

      {/* Un ennemi à distance projette, puisqu'il ne s'approche jamais. */}
      {foeStyle === 'ranged' && (
        <Projectiles
          distance={layout.foeLeft - layout.heroLeft - heroWidth}
          swings={store.foeSwings[scope]}
          color="#9ad6c0"
        />
      )}
    </div>
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
 * même distance, donc la file arrive en formation ; l'écart vient du rang, pas
 * de l'ordre des vivants, si bien qu'une mort ne déplace personne.
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
  wave: string;
  engaged: boolean;
  hero: string;
  cycled: boolean;
  guardian: boolean;
  /** Écart entre deux rangs de la file, en pixels. */
  spacing: number;
  /** Vide de chaque côté, quand on demande à voir les boîtes ; sinon `undefined`. */
  showBox?: number;
}) {
  useGame();
  const sprite = enemy.sprite === 'self' ? hero : enemy.sprite;
  const ranged = spriteStyle(sprite) === 'ranged';
  // Chaque ennemi ne flashe que sur les coups qui le visent.
  const lastHit = [...store.hits[scope]].reverse().find((h) => h.targetIndex === index);
  const hit = usePulse(lastHit?.id ?? 0, 150);
  // Ceux qui sont au contact frappent ensemble : même compteur de salves.
  const striking = usePulse(store.foeSwings[scope], 220) && engaged;
  const jolt = -((striking ? 7 : 0) - (hit ? 5 : 0));

  return (
    <div className="foe-unit" style={{ transform: `translateX(${rank * spacing}px)` }}>
      <div
        key={wave}
        className={`mover ${travel > 0 ? 'approaching' : ''}`}
        style={{
          ['--to' as string]: `${-travel}px`,
          animationDuration: `${walkMs}ms`,
          transform: travel > 0 ? undefined : 'translateX(0)',
        }}
      >
        <div className="lunge" style={{ transform: `translateX(${jolt}px)` }}>
          {showBox !== undefined && (
            <span
              className="hitbox-box foe"
              aria-hidden="true"
              style={{ left: showBox, right: showBox }}
            />
          )}
          <Sprite
            character={sprite}
            anim={foeAnim(walking && travel > 0, striking, hit)}
            fallbackAnim={['idle']}
            scale={guardian ? 1.3 : 1}
            flip
            className={`foe enter ${cycled ? 'cycled' : ''} ${ranged ? 'flyer' : ''} ${
              hit ? 'flash' : ''
            } ${engaged ? '' : 'waiting'}`}
          />
        </div>
        {hit && <span className="impact" aria-hidden="true" />}
        <FloatingHits scope={scope} target={index} />
      </div>
    </div>
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
    const t = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(t);
  }, [counter, ms]);

  return on;
}

/**
 * Vrai `ms` après que `flag` soit passé à vrai, et faux dès qu'il retombe. Sert
 * au rideau noir : il ne doit descendre qu'une fois la sortie de scène entamée,
 * mais se lever sans délai.
 */
function useDelayed(flag: boolean, ms: number): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!flag) {
      setOn(false);
      return;
    }
    const t = window.setTimeout(() => setOn(true), ms);
    return () => window.clearTimeout(t);
  }, [flag, ms]);

  return on;
}

/**
 * Largeur de la scène. C'est la **seule** chose lue dans le DOM : tout le reste du
 * placement en découle par le calcul, ce qui évite de dépendre de quel élément
 * porte quelle boîte — l'erreur qui a fait échouer trois corrections de suite.
 */
function useArenaWidth(arena: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = arena.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [arena]);

  return width;
}

/** Projectiles d'un ennemi à distance, vers le héros. */
function Projectiles({
  distance,
  swings,
  color,
}: {
  distance: number;
  swings: number;
  color: string;
}) {
  const [shots, setShots] = useState<number[]>([]);
  const seen = useRef(swings);

  useEffect(() => {
    if (swings === seen.current) return;
    seen.current = swings;
    setShots((p) => [...p, swings].slice(-4));
    const t = window.setTimeout(() => setShots((p) => p.slice(1)), 420);
    return () => window.clearTimeout(t);
  }, [swings]);

  return (
    <div className="shots foe" aria-hidden="true">
      {shots.map((id) => (
        <i
          key={id}
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}`,
            ['--travel' as string]: `${-distance}px`,
          }}
        />
      ))}
    </div>
  );
}

/** Dégâts reçus par le héros : mêmes chiffres flottants, mais en rouge. */
function TakenHits({ scope }: { scope: FightScope }) {
  useGame();
  return (
    <div className="hits" aria-hidden="true">
      {store.taken[scope].map((h) => (
        <span
          key={h.id}
          className="hit taken"
          style={{ left: `calc(50% + ${h.dx}px)`, top: `${h.dy}px` }}
        >
          −{formatNum(h.damage)}
        </span>
      ))}
    </div>
  );
}

/** Chiffres de dégâts : montée + fondu, critiques 1,4× et en jaune (§3). */
function FloatingHits({ scope, target }: { scope: FightScope; target?: number }) {
  useGame();
  return (
    <div className="hits" aria-hidden="true">
      {store.hits[scope]
        .filter((h) => target === undefined || h.targetIndex === target)
        .map((h) => (
        <span
          key={h.id}
          className={`hit ${h.crit ? 'crit' : ''}`}
          style={{ left: `calc(50% + ${h.dx}px)`, top: `${h.dy}px` }}
        >
          {formatNum(h.damage)}
        </span>
      ))}
    </div>
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
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className={`fighter-bar ${side}`}>
      <div className="bar">
        <div className={`fill ${side}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="fighter-name">{name}</div>
      <div className="muted small">
        {formatNum(Math.max(0, hp))} / {formatNum(max)}
      </div>
      {note ? <div className="muted small">{note}</div> : null}
    </div>
  );
}
