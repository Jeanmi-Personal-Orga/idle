import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { WAVES_PER_DISTRICT, cycleOf, enemySprite, purity } from '../game/content';
import { DEFAULT_CHARACTER, spriteStyle } from '../game/characters';
import { formatNum } from '../game/engine';
import { attackInterval, heroStats } from '../game/formulas';
import { store, useGame } from '../game/store';
import { Sprite } from './Sprite';

/**
 * L'arène : **une seule scène** où les deux combattants se font face, et où la
 * distance se joue vraiment.
 *
 * - au corps à corps, le combattant traverse l'arène pour frapper puis recule ;
 * - à distance, il reste chez lui et projette une fiole ;
 * - si l'un est au contact et l'autre non, c'est celui au contact qui se
 *   déplace — jusqu'à la position de l'autre, pas jusqu'au milieu.
 *
 * Tout ceci est de la mise en scène : la simulation, elle, ne connaît que des
 * cadences de frappe. Le déplacement suit le rythme réel des attaques mais ne
 * change aucun résultat — l'équilibrage validé sur 72 h reste intact.
 */

/** Échelle commune, appliquée à la taille native de chaque sprite. */
const ARENA_ZOOM = 0.62;
/** Marge laissée entre deux corps qui se touchent. */
const CONTACT_GAP = 10;

type Phase = 'idle' | 'approach' | 'strike' | 'return';

export function Arena() {
  const state = useGame();
  const c = state.combat;
  const s = heroStats(state);

  const hero = state.character ?? DEFAULT_CHARACTER;
  const sprite = enemySprite(c.district, c.wave);
  // « Écho de soi » du Puits Prismatique : l'ennemi est le sprite du joueur.
  const foe = sprite === 'self' ? hero : sprite;

  const heroStyle = spriteStyle(hero);
  const foeStyle = spriteStyle(foe);
  const dead = c.reviving > 0;

  const arenaRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const foeRef = useRef<HTMLDivElement>(null);
  const gap = useGap(arenaRef, heroRef, foeRef, [c.district, c.wave, hero, foe]);

  // Au-delà d'une certaine cadence, faire l'aller-retour à chaque coup devient
  // illisible : le combattant reste alors au contact.
  const heroFast = attackInterval(s) < 0.9;
  const heroPhase = useAttackPhase(store.heroSwings, heroFast, dead);
  const foePhase = useAttackPhase(store.foeSwings, c.enemy.interval < 0.9, dead);
  // Encaisser se voit : brève grimace au moment où le coup adverse porte.
  const heroHurt = usePulse(store.foeSwings, 260) && !dead;
  const foeHurt = usePulse(store.hits.at(-1)?.id ?? 0, 180);

  // Qui se déplace, et de combien. Un combattant à distance ne bouge jamais ;
  // deux combattants au contact se rejoignent à mi-chemin.
  const bothMelee = heroStyle === 'melee' && foeStyle === 'melee';
  const heroTravel = heroStyle === 'melee' ? (bothMelee ? gap / 2 : gap) : 0;
  const foeTravel = foeStyle === 'melee' ? (bothMelee ? gap / 2 : gap) : 0;

  const heroShift = engaged(heroPhase) ? heroTravel : 0;
  const foeShift = engaged(foePhase) ? -foeTravel : 0;

  return (
    <div className="arena" ref={arenaRef}>
      <div className="layer far" aria-hidden="true" />
      <div className="layer near" aria-hidden="true" />

      <div className="fighter-slot hero" ref={heroRef}>
        <div className="mover" style={{ transform: `translateX(${heroShift}px)` }}>
          <Sprite
            character={hero}
            anim={heroAnim(heroPhase, dead, c.reviving, heroHurt, heroStyle, store.heroSwings)}
            fallbackAnim={heroFallback(heroPhase, heroStyle)}
            fps={heroPhase === 'strike' ? 12 : 7}
            loop={!dead}
            zoom={ARENA_ZOOM}
          />
        </div>
      </div>

      <div className="fighter-slot foe" ref={foeRef}>
        <div className="mover" style={{ transform: `translateX(${foeShift}px)` }}>
          <Sprite
            character={foe}
            anim={foePhase === 'strike' ? 'attack' : foeHurt ? 'hurt' : 'idle'}
            fallbackAnim={['idle']}
            fps={foePhase === 'strike' ? 11 : 5}
            zoom={ARENA_ZOOM}
            flip
            className={`foe enter ${cycleOf(c.district) > 0 ? 'cycled' : ''}`}
            style={{ filter: districtTint(c.district) }}
            key={`${c.district}-${c.wave}`}
          />
        </div>
        <FloatingHits />
      </div>

      {/* Projectiles : seule façon pour un combattant à distance de toucher. */}
      {heroStyle === 'ranged' && (
        <Projectiles
          from="hero"
          distance={gap}
          swings={store.heroSwings}
          color={purity(state.equipped.flacon?.purity ?? 'trouble').color}
        />
      )}
      {foeStyle === 'ranged' && (
        <Projectiles from="foe" distance={gap} swings={store.foeSwings} color="#8fb6c4" />
      )}
    </div>
  );
}

const engaged = (p: Phase) => p === 'approach' || p === 'strike';

/**
 * Toutes les animations livrées finissent par servir : la mort puis le
 * relèvement pendant la réanimation, la grimace quand un coup porte, la marche
 * uniquement quand il y a une distance à parcourir, et un versement de réactif
 * une frappe sur quatre pour que l'attaque ne soit pas une boucle unique.
 */
function heroAnim(
  phase: Phase,
  dead: boolean,
  reviving: number,
  hurt: boolean,
  style: string,
  swings: number,
): string {
  // La réanimation dure 3 s : il tombe, puis se relève sur la dernière seconde.
  if (dead) return reviving < 1 ? 'revive' : 'death';
  if (phase === 'strike') {
    if (style === 'ranged') return swings % 4 === 3 ? 'pour' : 'throw';
    return 'attack';
  }
  if (hurt) return 'hurt';
  // Un combattant à distance ne se déplace pas : pas de marche sur place.
  if (style === 'melee' && (phase === 'approach' || phase === 'return')) return 'walk';
  return 'idle';
}

/** Tous les personnages n'ont pas les sept animations de l'alchimiste. */
function heroFallback(phase: Phase, style: string): string[] {
  if (phase === 'strike') return style === 'ranged' ? ['attack', 'pour'] : ['throw'];
  if (phase === 'approach' || phase === 'return') return ['idle'];
  return ['idle'];
}

/** Chaque district repeint les mêmes habitants : la ville change sans asset neuf. */
function districtTint(district: number): string {
  if (district === 0) return 'none';
  return `hue-rotate(${(district * 47) % 360}deg) saturate(1.15)`;
}

/**
 * Distance libre entre les deux combattants, mesurée dans le DOM : les gabarits
 * de sprites diffèrent, un pourcentage fixe placerait mal le point de contact.
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
      const ra = a.current?.getBoundingClientRect();
      const rb = b.current?.getBoundingClientRect();
      if (!ra || !rb) return;
      setGap(Math.max(0, rb.left - ra.right - CONTACT_GAP));
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

/** Durées de la chorégraphie, en millisecondes. */
const APPROACH = 190;
const STRIKE = 200;
const RETURN = 220;

/**
 * Traduit un compteur d'attaques en phases d'animation. `stayEngaged` garde le
 * combattant au contact entre deux coups quand la cadence est trop rapide pour
 * un aller-retour.
 */
function useAttackPhase(swings: number, stayEngaged: boolean, dead: boolean): Phase {
  const [phase, setPhase] = useState<Phase>('idle');
  const seen = useRef(swings);

  useEffect(() => {
    if (dead) {
      setPhase('idle');
      return;
    }
    if (swings === seen.current) return;
    seen.current = swings;

    const timers: number[] = [];
    setPhase('approach');
    timers.push(window.setTimeout(() => setPhase('strike'), APPROACH));
    if (!stayEngaged) {
      timers.push(window.setTimeout(() => setPhase('return'), APPROACH + STRIKE));
      timers.push(window.setTimeout(() => setPhase('idle'), APPROACH + STRIKE + RETURN));
    }
    return () => timers.forEach(window.clearTimeout);
  }, [swings, stayEngaged, dead]);

  return dead ? 'idle' : phase;
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

/** Fioles en vol, du lanceur vers sa cible. */
function Projectiles({
  from,
  distance,
  swings,
  color,
}: {
  from: 'hero' | 'foe';
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
    <div className={`shots ${from}`} aria-hidden="true">
      {shots.map((id) => (
        <i
          key={id}
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}`,
            ['--travel' as string]: `${from === 'hero' ? distance : -distance}px`,
          }}
        />
      ))}
    </div>
  );
}

/** Chiffres de dégâts : montée + fondu, critiques 1,4× et en jaune (§3). */
function FloatingHits() {
  useGame();
  return (
    <div className="hits" aria-hidden="true">
      {store.hits.map((h) => (
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
  note: string;
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
      <div className="muted small">{note}</div>
    </div>
  );
}

export { WAVES_PER_DISTRICT };
