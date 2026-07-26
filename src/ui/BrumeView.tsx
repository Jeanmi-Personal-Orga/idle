import { STATS, WAVES_PER_DISTRICT, districtLabel } from '../game/content';
import { formatNum } from '../game/engine';
import { attackInterval, dps, heroStats } from '../game/formulas';
import { useGame } from '../game/store';
import type { StatKey } from '../game/types';

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

export function BrumeView() {
  const state = useGame();
  const c = state.combat;
  const s = heroStats(state);
  const district = districtLabel(c.district);
  const heroPct = Math.max(0, (c.hero.hp / s.health) * 100);
  const enemyPct = Math.max(0, (c.enemy.hp / c.enemy.maxHp) * 100);

  return (
    <div className="view">
      <div className="card">
        <div className="row between">
          <div>
            <div className="label">{district}</div>
            <div className="muted small">
              Vague {c.wave} / {WAVES_PER_DISTRICT}
            </div>
          </div>
          <div className="right">
            <div className="label">{formatNum(dps(s))}</div>
            <div className="muted small">dégâts / s</div>
          </div>
        </div>

        <div className="arena">
          <Fighter
            name="Toi"
            hp={c.hero.hp}
            max={s.health}
            pct={heroPct}
            tone="hero"
            note={`${attackInterval(s).toFixed(2)}s / frappe`}
          />
          <div className="versus">{c.reviving > 0 ? 'dissous…' : '⚗'}</div>
          <Fighter
            name={c.enemy.name}
            hp={c.enemy.hp}
            max={c.enemy.maxHp}
            pct={enemyPct}
            tone="foe"
            note={`${formatNum(c.enemy.damage)} dégâts`}
          />
        </div>
      </div>

      <div className="card">
        <div className="label">Composition</div>
        <div className="grid2">
          {SHOWN.map((k) => {
            // Réaction en chaîne et Clairvoyance plafonnent : on montre le surplus perdu.
            const capped = (k === 'chain' || k === 'clairvoyance') && s[k] > 100;
            return (
              <div key={k} className="statline">
                <span className="muted">{STATS[k].name}</span>
                <b className={capped ? 'capped' : undefined}>
                  {formatNum(capped ? 100 : s[k])}
                  {STATS[k].suffix}
                  {capped && (
                    <span className="muted small"> +{formatNum(s[k] - 100)} perdu</span>
                  )}
                </b>
              </div>
            );
          })}
        </div>
        <div className="muted small">
          Réaction en chaîne et Clairvoyance plafonnent à 100 %.
        </div>
      </div>

      <div className="card">
        <div className="label">Journal</div>
        <div className="log">
          {state.log.map((line, i) => (
            <div key={i} className={i === 0 ? '' : 'muted'}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Fighter({
  name,
  hp,
  max,
  pct,
  tone,
  note,
}: {
  name: string;
  hp: number;
  max: number;
  pct: number;
  tone: 'hero' | 'foe';
  note: string;
}) {
  return (
    <div className="fighter">
      <div className="fighter-name">{name}</div>
      <div className="bar">
        <div className={`fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="muted small">
        {formatNum(Math.max(0, hp))} / {formatNum(max)}
      </div>
      <div className="muted small">{note}</div>
    </div>
  );
}
