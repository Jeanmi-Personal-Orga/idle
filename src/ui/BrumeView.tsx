import { STATS, WAVES_PER_DISTRICT, districtLabel } from "../game/content";
import { formatNum } from "../game/engine";
import { attackInterval, dps, heroStats } from "../game/formulas";
import { useGame } from "../game/store";
import type { StatKey } from "../game/types";
import { Arena, FighterBar } from "./Arena";

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
            name={c.enemy.name}
            hp={c.enemy.hp}
            max={c.enemy.maxHp}
            note={`${formatNum(c.enemy.damage)} par coup`}
          />
        </div>
      </div>

      <div className="card">
        <div className="label">Composition</div>
        <div className="grid2">
          {SHOWN.map((k) => {
            // Double frappe et Chance critique plafonnent : on montre le surplus perdu.
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

