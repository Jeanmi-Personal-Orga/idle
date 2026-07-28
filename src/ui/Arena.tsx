import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_CHARACTER, spriteStyle } from '../game/characters';
import {
  districtLabel, WAVES_PER_DISTRICT, cycleOf } from '../game/content';
import { WAVE_PAUSE, closingTime, engagedEnemies, formatNum } from '../game/engine';
import { BACKGROUND_LAYERS } from '../game/sprites';
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

/**
 * Écart laissé entre les deux rectangles quand on est au contact : quelques
 * pixels, pour qu'ils se touchent presque sans se chevaucher.
 *
 * La boîte de collision est **le rectangle du sprite**, ni plus ni moins. C'est
 * la même règle pour tout le monde, donc prévisible ; en échange, l'écart visible
 * entre les corps dépend de la marge transparente de chaque planche.
 */
const CONTACT_GAP = 4;


/** Écart entre deux rangs de la file : assez serré pour que la vague reste groupée. */
const FILE_SPACING = 30;


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
  };
  /** Entre deux vagues : le héros marche vers la sortie, personne ne se bat. */
  const between = c.interlude > 0;

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

  const guardian = c.wave === c.waves;
  // C'est l'arme équipée qui décide : de mêlée, il faut traverser.
  const heroStyle = state.equipped.arme?.ranged ? 'ranged' : 'melee';
  const foeStyle = spriteStyle(foe);
  const dead = c.reviving > 0;

  const arenaRef = useRef<HTMLDivElement>(null);
  // Boîtes de collision réelles, mesurées à l'écran.
  const heroBoxRef = useRef<HTMLDivElement>(null);
  const foeBoxRef = useRef<HTMLDivElement>(null);
  // On mesure les **sprites** eux-mêmes, pas leurs emplacements : ceux des
  // ennemis n'ont aucune largeur (leurs rangs sont en position absolue).
  const gap = useGap(arenaRef, heroBoxRef, foeBoxRef, [c.district, c.wave, hero, foe]);

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
  // Plus de bonus par mort : les ennemis viennent maintenant au contact les uns
  // après les autres, le héros n'a plus besoin d'avancer pour les chercher.
  const heroTravel = gap * heroShare;
  const foeTravel = foeStyle === 'melee' ? gap - gap * heroShare : 0;
  // La marche dure exactement l'approche accordée par le moteur, et se joue
  // pendant son décompte : à l'arrivée, les coups partent.
  const walkMs = between ? WAVE_PAUSE * 1000 : Math.max(120, closingTime(state) * 1000);

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
  const heroAt = dead ? 0 : between ? gap : heroTravel;
  // Le noir couvre la coupure : il tombe pendant que le héros finit sa sortie,
  // et se lève sur la scène remise à zéro. C'est lui qui autorise le
  // repositionnement instantané des deux camps.
  const resuming = useFalling(between, 500);
  // Contact réel : c'est lui qui autorise les coups au corps à corps, côté
  // moteur comme à l'écran. Il tombe à faux dès qu'une nouvelle vague se lève,
  // et repasse à vrai à l'instant où les deux boîtes se touchent.
  const touching = useContact(heroBoxRef, foeBoxRef, scope, {
    active: !between && !dead && Boolean(front),
    // Filet de sécurité : la marche accordée par le moteur est écoulée. Si les
    // boîtes ne se rejoignent pas — mesure impossible, mise en page inattendue —
    // on ne bloque pas le combat pour autant.
    walkDone: (c.closing ?? 0) <= 0,
  });
  // On marche tant que les boîtes ne se touchent pas : l'animation de marche
  // s'arrête donc à l'instant du contact, pas à la fin d'un chrono.
  const heroWalking = (walking && !touching && heroTravel > 0) || between;
  const foeWalking = walking && !touching && foeTravel > 0;

  // Les à-coups de combat vivent sur leur propre couche : ils ne touchent plus à
  // la position de marche.
  const heroJolt = (heroStrike ? 7 : 0) - (heroHit ? 5 : 0);

  return (
    <div className={`arena ${heroHit ? 'shaken' : ''}`} ref={arenaRef}>
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

      {/* Le fondu au noir de l'entre-deux-vagues : il descend quand le héros
          atteint la sortie, et se lève sur la vague suivante déjà en place. */}
      {(between || resuming) && (
        <div
          className={`blackout ${between ? 'falling' : 'rising'}`}
          aria-hidden="true"
          style={between ? { animationDuration: `${walkMs}ms` } : undefined}
        />
      )}

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

      <div className="fighter-slot hero">
        {/*
          Deux couches, comme pour l'ennemi : `mover` porte la marche — longue et
          linéaire —, `lunge` porte les à-coups de frappe et de recul, courts et
          secs. Les mettre sur le même élément faisait qu'un coup réinterprétait
          la transition de marche en cours : le héros traversait alors l'arène en
          110 ms, ce qui donnait un dash vers l'ennemi.
        */}
        <div
          key={between ? 'exit' : `${c.district}-${c.wave}`}
          className={`mover ${heroAt > 0 ? 'approaching' : ''}`}
          style={{
            // La sortie part d'où il se trouve, pas de sa marque : sinon on le
            // voyait revenir à gauche d'un coup avant de repartir à droite.
            ['--from' as string]: `${between ? heroTravel : 0}px`,
            ['--to' as string]: `${heroAt}px`,
            animationDuration: `${walkMs}ms`,
            transform: heroAt > 0 ? undefined : 'translateX(0)',
          }}
        >
          <div
            ref={heroBoxRef}
            className="lunge"
            style={{ transform: `translateX(${heroJolt}px)` }}
          >
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
      <div className={`fighter-slot foe ${between || !front ? 'gone' : ''}`}>
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
              walkMs={walkMs}
              walking={foeWalking}
              engaged={engaged.has(index)}
              // La mesure du contact se fait sur le premier encore debout.
              boxRef={index === frontIndex ? foeBoxRef : undefined}
            />
          ),
        )}
      </div>

      {/* Un ennemi à distance projette, puisqu'il ne s'approche jamais. */}
      {foeStyle === 'ranged' && (
        <Projectiles distance={gap} swings={store.foeSwings[scope]} color="#9ad6c0" />
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
  boxRef,
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
  /** Fourni pour celui qui sert de référence à la mesure du contact. */
  boxRef?: React.RefObject<HTMLDivElement | null>;
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
    <div className="foe-unit" style={{ transform: `translateX(${rank * FILE_SPACING}px)` }}>
      <div
        key={wave}
        className={`mover ${travel > 0 ? 'approaching' : ''}`}
        style={{
          ['--to' as string]: `${-travel}px`,
          animationDuration: `${walkMs}ms`,
          transform: travel > 0 ? undefined : 'translateX(0)',
        }}
      >
        <div ref={boxRef} className="lunge" style={{ transform: `translateX(${jolt}px)` }}>
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
 * Vrai quand les deux rectangles sont côte à côte, à `CONTACT_GAP` près : le
 * bord droit du héros a rejoint le bord gauche de l'ennemi.
 */
function withinReach(hero: HTMLElement, foe: HTMLElement): boolean {
  return hero.getBoundingClientRect().right + CONTACT_GAP >= foe.getBoundingClientRect().left;
}

/**
 * Contact entre deux boîtes de collision, mesuré à chaque image. Tant qu'elles
 * ne se chevauchent pas, le moteur n'autorise aucune attaque de mêlée : ce que
 * l'on voit et ce que la simulation applique ne peuvent plus diverger.
 *
 * Le résultat est poussé dans le moteur (`store.setContact`) et rendu au
 * composant. Au démontage on rend le contact : un combat ne doit pas se figer
 * parce qu'on a changé d'onglet.
 */
function useContact(
  a: React.RefObject<HTMLElement | null>,
  b: React.RefObject<HTMLElement | null>,
  scope: FightScope,
  { active, walkDone }: { active: boolean; walkDone: boolean },
): boolean {
  const [touching, setTouching] = useState(false);
  // Ces deux valeurs changent à chaque tick : on les lit dans la boucle par
  // référence, sinon elle se relancerait dix fois par seconde.
  const flags = useRef({ active, walkDone });
  flags.current = { active, walkDone };

  useEffect(() => {
    let raf = 0;
    let last: boolean | null = null;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const ea = a.current;
      const eb = b.current;
      let value: boolean;
      if (!flags.current.active) value = false;
      else if (!ea || !eb) value = true;
      else value = withinReach(ea, eb) || flags.current.walkDone;
      if (value === last) return;
      last = value;
      store.setContact(scope, value);
      setTouching(value);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      store.setContact(scope, true);
    };
  }, [a, b, scope]);

  return touching;
}

/**
 * Vrai pendant `ms` après que `flag` soit repassé à faux. Sert au fondu qui se
 * lève : le temps mort est fini côté moteur, mais l'écran doit encore
 * s'éclaircir.
 */
function useFalling(flag: boolean, ms: number): boolean {
  const [on, setOn] = useState(false);
  const previous = useRef(flag);

  useEffect(() => {
    const fell = previous.current && !flag;
    previous.current = flag;
    if (!fell) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(t);
  }, [flag, ms]);

  return on;
}

/**
 * Abscisse de mise en page d'un élément dans un ancêtre, en remontant la chaîne
 * des `offsetParent`. On additionne des `offsetLeft`, qui **ignorent les
 * transforms** : la mesure ne dépend donc pas des déplacements en cours.
 *
 * C'est indispensable ici : les rangs ennemis sont positionnés en absolu dans un
 * emplacement de largeur nulle, donc mesurer l'emplacement plutôt que le sprite
 * donnait un écart faux d'une largeur de sprite entière — les combattants se
 * marchaient dessus.
 */
function layoutLeft(el: HTMLElement, ancestor: HTMLElement | null): number {
  let x = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return x;
}

/**
 * Distance qu'il reste à couvrir pour amener les deux rectangles côte à côte.
 * C'est le même calcul que `withinReach`, appliqué aux positions de repos : la
 * marche s'arrête donc exactement là où les coups deviennent possibles, sans
 * jamais dépasser.
 */
function useGap(
  arena: React.RefObject<HTMLDivElement | null>,
  a: React.RefObject<HTMLDivElement | null>,
  b: React.RefObject<HTMLDivElement | null>,
  deps: unknown[],
): number {
  const [gap, setGap] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const ea = a.current;
      const eb = b.current;
      const scene = arena.current;
      if (!ea || !eb || !scene) return;
      // Bord droit du sprite du héros contre bord gauche du sprite de l'ennemi.
      const heroRight = layoutLeft(ea, scene) + ea.offsetWidth;
      const foeLeft = layoutLeft(eb, scene);
      setGap(Math.max(0, foeLeft - heroRight - CONTACT_GAP));
    };
    measure();
    const el = arena.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return gap;
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
