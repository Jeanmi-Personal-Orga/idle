import { useEffect, useRef, useState } from "react";
import {
  STATS,
  WAVES_PER_DISTRICT,
  cycleOf,
  districtLabel,
  enemySprite,
} from "../game/content";
import { formatNum } from "../game/engine";
import { attackInterval, dps, heroStats } from "../game/formulas";
import { store, useGame } from "../game/store";
import { DEFAULT_CHARACTER } from "../game/characters";
import type { StatKey } from "../game/types";
import { Sprite } from "./Sprite";

/** États du héros exposés par les spritesheets. */
type HeroState = "idle" | "throw" | "hurt" | "death";

/** Échelle commune de l'arène, appliquée à la taille native de chaque sprite. */
const ARENA_ZOOM = 0.62;

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
  const heroPct = Math.max(0, (c.hero.hp / s.health) * 100);
  const enemyPct = Math.max(0, (c.enemy.hp / c.enemy.maxHp) * 100);
  const dead = c.reviving > 0;
  const pulse = useThrowPulse();
  const heroState: HeroState = dead ? "death" : pulse;
  const hero = state.character ?? DEFAULT_CHARACTER;
  // « Écho de soi » du Puits Prismatique : l'ennemi est le sprite du joueur.
  const sprite = enemySprite(c.district, c.wave);
  const foe = sprite === "self" ? hero : sprite;

  return (
    <div className="view">
      {/* La scène s'assombrit quand la lanterne tombe (§2). */}
      <div className={`card scene ${dead ? "lantern-out" : ""}`}>
        <div className="row between">
          <div>
            <div className="label">{districtLabel(c.district)}</div>
            <div className="muted small">
              Vague {c.wave} / {WAVES_PER_DISTRICT}
              {c.wave === WAVES_PER_DISTRICT && " · gardien"}
            </div>
          </div>
          <div className="right">
            <div className="label">{formatNum(dps(s))}</div>
            <div className="muted small">dégâts / s</div>
          </div>
        </div>

        <div className="arena">
          <div className="layer far" aria-hidden="true" />
          <div className="layer near" aria-hidden="true" />

          <Fighter
            side="hero"
            name="Toi"
            hp={c.hero.hp}
            max={s.health}
            pct={heroPct}
            note={`${attackInterval(s).toFixed(2)} s / frappe`}
          >
            <Sprite
              character={hero}
              anim={heroState}
              // Tous les personnages n'ont pas les 7 animations de l'alchimiste.
              fallbackAnim={heroState === "throw" ? ["attack"] : ["idle"]}
              fps={heroState === "throw" ? 14 : 6}
              loop={heroState !== "death"}
              zoom={ARENA_ZOOM}
            />
          </Fighter>

          <Fighter
            side="foe"
            name={c.enemy.name}
            hp={c.enemy.hp}
            max={c.enemy.maxHp}
            pct={enemyPct}
            note={`${formatNum(c.enemy.damage)} par coup`}
            key={`${c.district}-${c.wave}`}
          >
            <Sprite
              character={foe}
              anim="idle"
              fps={5}
              zoom={ARENA_ZOOM}
              flip
              className={`foe enter ${cycleOf(c.district) > 0 ? "cycled" : ""}`}
              style={{ filter: districtTint(c.district) }}
            />
            <FloatingHits />
          </Fighter>
        </div>
      </div>

      <div className="card">
        <div className="label">Composition</div>
        <div className="grid2">
          {SHOWN.map((k) => {
            // Réaction en chaîne et Clairvoyance plafonnent : on montre le surplus perdu.
            const capped =
              (k === "chain" || k === "clairvoyance") && s[k] > 100;
            return (
              <div key={k} className="statline">
                <span className="muted">{STATS[k].name}</span>
                <b className={capped ? "capped" : undefined}>
                  {formatNum(capped ? 100 : s[k])}
                  {STATS[k].suffix}
                  {capped && (
                    <span className="muted small">
                      {" "}
                      +{formatNum(s[k] - 100)} perdu
                    </span>
                  )}
                </b>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="label">Journal</div>
        <div className="log">
          {state.log.map((line, i) => (
            <div key={i} className={i === 0 ? "" : "muted"}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Fighter({
  side,
  name,
  hp,
  max,
  pct,
  note,
  children,
}: {
  side: "hero" | "foe";
  name: string;
  hp: number;
  max: number;
  pct: number;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`fighter ${side}`}>
      <div className="stage">{children}</div>
      {/* Barre fine collée sous les pieds (§3). */}
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

/** Chaque district repeint les mêmes habitants : la ville change sans asset neuf. */
function districtTint(district: number): string {
  if (district === 0) return "none";
  return `hue-rotate(${(district * 47) % 360}deg) saturate(1.15)`;
}

/** Chiffres de dégâts : montée + fondu, critiques 1,4× et en jaune (§3). */
function FloatingHits() {
  useGame();
  return (
    <div className="hits" aria-hidden="true">
      {store.hits.map((h) => (
        <span
          key={h.id}
          className={`hit ${h.crit ? "crit" : ""}`}
          style={{ left: `calc(50% + ${h.dx}px)`, top: `${h.dy}px` }}
        >
          {formatNum(h.damage)}
        </span>
      ))}
    </div>
  );
}

/**
 * Rythme l'animation de jet sur la cadence réelle du héros, sans faire dépendre
 * le rendu du moteur : une impulsion courte à chaque coup encaissé par l'ennemi.
 */
function useThrowPulse(): HeroState {
  const [pulsing, setPulsing] = useState(false);
  const seen = useRef(0);
  const lastHit = store.hits.at(-1)?.id ?? 0;

  useEffect(() => {
    if (lastHit === seen.current) return;
    seen.current = lastHit;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 180);
    return () => clearTimeout(t);
  }, [lastHit]);

  return pulsing ? "throw" : "idle";
}
