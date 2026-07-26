import { PURITIES, STATS, purity, slotDef } from '../game/content';
import { formatNum } from '../game/engine';
import { itemStats } from '../game/formulas';
import type { Item, SlotId } from '../game/types';

/** Silhouette de l'emplacement : la forme se lit avant la couleur (§5). */
function SlotIcon({ slot, color }: { slot: SlotId; color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="slot-icon" aria-hidden="true">
      {slot === 'flacon' && (
        <>
          <path d="M10 3 h4 v4 l3 6 v6 a2 2 0 0 1-2 2 H9 a2 2 0 0 1-2-2 v-6 l3-6 Z" fill="none" stroke="#a8c4cc" strokeWidth="1.4" />
          <path d="M8 14 h8 v5 a2 2 0 0 1-2 2 H10 a2 2 0 0 1-2-2 Z" fill={color} />
        </>
      )}
      {slot === 'manteau' && (
        <path d="M12 3 l5 3 2 15 H5 L7 6 Z M12 3 v18" fill="none" stroke={color} strokeWidth="1.4" />
      )}
      {slot === 'lentille' && (
        <>
          <circle cx="12" cy="12" r="6.5" fill="none" stroke={color} strokeWidth="1.6" />
          <circle cx="12" cy="12" r="3" fill={color} opacity="0.5" />
          <path d="M18 6 l3-2" stroke={color} strokeWidth="1.4" />
        </>
      )}
      {slot === 'gantelet' && (
        <path
          d="M7 10 v-4 a1.6 1.6 0 0 1 3 0 v3 M10 9 V5 a1.6 1.6 0 0 1 3 0 v4 M13 9 V6 a1.6 1.6 0 0 1 3 0 v6 l1 3 v4 a2 2 0 0 1-2 2 H9 a2 2 0 0 1-2-2 v-3"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
        />
      )}
    </svg>
  );
}

export function ItemCard({ item, actions }: { item: Item; actions?: React.ReactNode }) {
  const p = purity(item.purity);
  const stats = itemStats(item);
  const main = slotDef(item.slot).main;
  // Une encoche par 5 niveaux d'affinage, lisible d'un coup d'œil (§5).
  const notches = Math.min(8, Math.floor((item.level - 1) / 5));

  return (
    <div
      className={`card item ${p.frame}`}
      style={{ ['--purity' as string]: p.color }}
    >
      <div className="item-head">
        <SlotIcon slot={item.slot} color={p.color} />
        <div className="item-id">
          <div className="item-name" style={{ color: p.color }}>
            {slotDef(item.slot).name}
          </div>
          <div className="muted small">
            {p.name} · niv. {item.level}
          </div>
          {notches > 0 && (
            <div className="notches" aria-hidden="true">
              {Array.from({ length: notches }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          )}
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
            {STATS[s.key].short} +
            {formatNum((stats[s.key] ?? 0) - (s.key === main ? item.main.value : 0))}
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
        <span key={p.id} className={`pill ${p.frame}`} style={{ ['--purity' as string]: p.color, color: p.color }}>
          {p.name}
        </span>
      ))}
    </div>
  );
}
