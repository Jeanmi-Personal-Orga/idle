import { PURITIES, STATS, purity, slotDef } from '../game/content';
import { formatNum } from '../game/engine';
import { itemStats } from '../game/formulas';
import type { Item } from '../game/types';

export function StatLine({ k, v }: { k: keyof typeof STATS; v: number }) {
  const def = STATS[k];
  return (
    <div className="statline">
      <span>{def.name}</span>
      <b>
        {formatNum(v)}
        {def.suffix}
      </b>
    </div>
  );
}

export function ItemCard({
  item,
  actions,
}: {
  item: Item;
  actions?: React.ReactNode;
}) {
  const p = purity(item.purity);
  const stats = itemStats(item);
  const main = slotDef(item.slot).main;
  return (
    <div className="card item" style={{ borderColor: p.color + '66' }}>
      <div className="item-head">
        <div>
          <div className="item-name" style={{ color: p.color }}>
            {slotDef(item.slot).name}
          </div>
          <div className="muted small">
            {p.name} · niv. {item.level}
          </div>
        </div>
        <div className="item-main">
          {formatNum(stats[main] ?? 0)}
          {STATS[main].suffix}
          <span className="muted small"> {STATS[main].short}</span>
        </div>
      </div>
      <div className="subs">
        {item.subs.map((s, i) => (
          <span key={i} className="pill">
            {STATS[s.key].short} +{formatNum((stats[s.key] ?? 0) - (s.key === main ? item.main.value : 0))}
            {STATS[s.key].suffix}
          </span>
        ))}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function PurityLegend() {
  return (
    <div className="subs">
      {PURITIES.map((p) => (
        <span key={p.id} className="pill" style={{ color: p.color }}>
          {p.name}
        </span>
      ))}
    </div>
  );
}
