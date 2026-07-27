import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_CHARACTER, spriteStyle } from '../game/characters';
import { WAVES_PER_DISTRICT, cycleOf } from '../game/content';
import { closingTime, formatNum } from '../game/engine';
import { BACKGROUND_LAYERS } from '../game/sprites';
import { store, useGame } from '../game/store';
import { Sprite } from './Sprite';

/**
 * L'arène : une seule scène, où la distance se joue vraiment.
 *
 * Déroulé d'une vague :
 * 1. le héros **tient sa place** au milieu de la scène ; il ne recule jamais et
 *    n'est jamais replacé d'un coup ;
 * 2. l'ennemi sort de la brume à droite et **marche jusqu'à lui** — le héros fait
 *    quelques pas à sa rencontre s'il se bat au contact ;
 * 3. arrivés au contact ils y restent, et échangent les coups jusqu'à la mort.
 *
 * L'approche est comptée par le **moteur** (`combat.closing`) : tant qu'elle
 * dure, aucun coup ne part, d'aucun des deux camps. L'affichage et la simulation
 * racontent donc la même chose, et on ne voit plus un coup porter depuis l'autre
 * bout de l'arène.
 *
 * Tout ceci est de la mise en scène : la simulation ne connaît que des cadences
 * de frappe, le déplacement les suit sans changer aucun résultat.
 */

/** Marge laissée entre deux corps au contact. */
const CONTACT_GAP = 6;


export function Arena() {
  const state = useGame();
  const c = state.combat;

  const hero = state.character ?? DEFAULT_CHARACTER;
  // Le premier ennemi du tableau est toujours la cible du héros et porte la
  // mise en scène complète (marche, contact). Les suivants, sur une vague à
  // plusieurs ennemis, se contentent d'un affichage plus simple à côté.
  const sprite = c.enemies[0].sprite;
  // « Écho de soi » du Puits Prismatique : l'ennemi est le sprite du joueur.
  const foe = sprite === 'self' ? hero : sprite;
  const extras = c.enemies.slice(1);

  const guardian = c.wave === WAVES_PER_DISTRICT;
  // C'est l'arme équipée qui décide : de mêlée, il faut traverser.
  const heroStyle = state.equipped.arme?.ranged ? 'ranged' : 'melee';
  const foeStyle = spriteStyle(foe);
  const dead = c.reviving > 0;

  const arenaRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const foeRef = useRef<HTMLDivElement>(null);
  const gap = useGap(arenaRef, heroRef, foeRef, [c.district, c.wave, hero, foe]);

  // Même vitesse de déplacement pour tout le monde. Une arme de mêlée envoie le
  // héros à sa marque, à mi-distance, et il y reste : les vagues suivantes
  // viennent à lui. Une arme à distance le laisse en arrière, et c'est l'ennemi
  // qui traverse toute l'arène.
  const heroTravel = heroStyle === 'melee' ? gap / 2 : 0;
  const foeTravel = foeStyle === 'melee' ? gap - heroTravel : 0;
  // La marche dure exactement l'approche accordée par le moteur, et se joue
  // pendant son décompte : à l'arrivée, les coups partent.
  const walkMs = Math.max(120, closingTime(state) * 1000);

  // L'ennemi marche pendant tout le décompte du moteur : `closed` sert de cible
  // de déplacement, pas de signal d'arrivée — il vaut donc vrai dès le départ.
  const closed = !dead;
  const walking = (c.closing ?? 0) > 0 && !dead;

  const heroWalking = walking && heroTravel > 0;
  const foeWalking = walking && foeTravel > 0;

  // Frappes : impulsion vers l'adversaire au moment du coup.
  const heroStrike = usePulse(store.heroSwings, 220) && !dead;
  const foeStrike = usePulse(store.foeSwings, 220) && !dead;
  // Impacts : la cible encaisse — éclat blanc et léger recul. Sur une vague à
  // plusieurs ennemis, on ne flashe que celui visé (targetIndex), sinon un coup
  // sur le deuxième ennemi ferait sursauter le premier.
  const lastHitOnMain = [...store.hits].reverse().find((h) => h.targetIndex === 0);
  const foeHit = usePulse(lastHitOnMain?.id ?? 0, 150);
  const heroHit = usePulse(store.foeSwings, 170) && !dead;

  // Le héros gagne sa marque et l'occupe : plus de retour au point de départ
  // entre deux vagues, donc plus de saut.
  const heroAt = dead ? 0 : heroTravel;
  const heroX = heroAt + (heroStrike ? 7 : 0) - (heroHit ? 5 : 0);
  // Seuls les à-coups de combat restent dans `foeX` ; l'approche est animée.
  const foeX = -((foeStrike ? 7 : 0) - (foeHit ? 5 : 0));
  // La marche est lente et régulière ; les à-coups de combat sont brefs et secs.
  const heroMoving = heroWalking || (closed && !heroStrike && !heroHit);
  const foeMoving = foeWalking || (closed && !foeStrike && !foeHit);

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

      <div className="fighter-slot hero" ref={heroRef}>
        <div
          className="mover"
          style={{
            transform: `translateX(${heroX}px)`,
            transitionDuration: heroMoving ? `${walkMs}ms` : '110ms',
            transitionTimingFunction: heroMoving ? 'linear' : 'ease-out',
          }}
        >
          <Sprite
            character={hero}
            anim={heroAnim(dead, c.reviving, heroWalking, heroStrike, heroHit)}
            fallbackAnim={['idle']}
            className={heroHit ? 'flash' : ''}
          />
          {heroHit && <span className="impact" aria-hidden="true" />}
        </div>
      </div>

      <div className="fighter-slot foe" ref={foeRef}>
        {/*
          La boîte de déplacement est recréée à chaque vague (`key`) : l'animation
          d'approche repart donc de l'entrée de l'arène. Une simple transition
          n'aurait rien joué, puisque l'élément survivait d'une vague à l'autre
          et se trouvait déjà à destination.
        */}
        <div
          key={`${c.district}-${c.wave}`}
          className={`mover ${foeTravel > 0 ? 'approaching' : ''}`}
          style={{
            ['--to' as string]: `${-foeTravel}px`,
            animationDuration: `${walkMs}ms`,
            // Les à-coups de frappe se jouent par-dessus, une fois arrivé.
            transform: foeTravel > 0 ? undefined : 'translateX(0)',
          }}
        >
          <div
            className="lunge"
            style={{
              transform: `translateX(${foeX}px)`,
              transitionDuration: foeMoving ? `${walkMs}ms` : '110ms',
            }}
          >
          <Sprite
            character={foe}
            anim={foeAnim(foeWalking, foeStrike, foeHit)}
            fallbackAnim={['idle']}
            scale={guardian ? 1.3 : 1}
            flip
            className={`foe enter ${cycleOf(c.district) > 0 ? 'cycled' : ''} ${
              foeStyle === 'ranged' ? 'flyer' : ''
            } ${foeHit ? 'flash' : ''}`}
          />
          </div>
          {/* L'éclat au point d'impact : sans lui, on ne voit pas le coup porter. */}
          {foeHit && <span className="impact" aria-hidden="true" />}
          <FloatingHits />
        </div>
      </div>

      {/* Un ennemi à distance projette, puisqu'il ne s'approche jamais. */}
      {foeStyle === 'ranged' && (
        <Projectiles distance={gap} swings={store.foeSwings} color="#9ad6c0" />
      )}

      {/* Vague de contrat : les ennemis en surnombre restent groupés, sans marche. */}
      {extras.map((enemy, i) => (
        <ExtraFoe key={i} enemy={enemy} index={i + 1} offset={(i + 1) * 26} />
      ))}
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
 * Ennemi en surnombre, sur une vague de contrat : pas de marche ni de mise en
 * scène complète, juste une icône qui encaisse et flashe à son tour — le
 * strict nécessaire pour rester lisible sans reconstruire toute la scène.
 */
function ExtraFoe({
  enemy,
  index,
  offset,
}: {
  enemy: { hp: number; maxHp: number; sprite: string; name: string };
  index: number;
  offset: number;
}) {
  useGame();
  const lastHit = [...store.hits].reverse().find((h) => h.targetIndex === index);
  const hit = usePulse(lastHit?.id ?? 0, 150);
  const dead = enemy.hp <= 0;
  return (
    <div
      className={`fighter-slot foe extra ${dead ? 'fallen' : ''}`}
      style={{ transform: `translateX(-${offset}px)`, opacity: dead ? 0.35 : 1 }}
    >
      <Sprite
        character={enemy.sprite === 'self' ? DEFAULT_CHARACTER : enemy.sprite}
        anim={dead ? 'death' : hit ? 'hurt' : 'idle'}
        fallbackAnim={['idle']}
        flip
        className={hit ? 'flash' : ''}
      />
      {hit && <span className="impact" aria-hidden="true" />}
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
 * Distance libre entre les deux combattants, mesurée dans le DOM : les gabarits
 * diffèrent (un rat n'est pas un chevalier) et un pourcentage fixe placerait mal
 * le point de contact. On mesure les positions de départ, pas les rectangles
 * déjà déplacés.
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
      if (!ea || !eb) return;
      const left = ea.offsetLeft + ea.offsetWidth;
      setGap(Math.max(0, eb.offsetLeft - left - CONTACT_GAP));
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
