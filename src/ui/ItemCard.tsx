import { PURITIES, STATS, purity, slotDef } from '../game/content';
import { formatNum } from '../game/engine';
import { itemPower, itemStats } from '../game/formulas';
import type { Item, SlotId } from '../game/types';

/**
 * Silhouette de l'emplacement : la forme se lit avant la couleur (§5). Huit
 * emplacements, huit silhouettes distinctes même en tout petit.
 */
const SLOT_PATHS: Record<SlotId, string> = {
  // Épée : lame, garde, poignée.
  arme: 'M12 2 L15 6 L13 15 H11 L9 6 Z M7 15 H17 M12 15 V21',
  // Gant : quatre doigts et le poignet.
  gants: 'M8 11 V6 a1.5 1.5 0 0 1 3 0 v4 M11 10 V5 a1.5 1.5 0 0 1 3 0 v5 M14 10 V7 a1.5 1.5 0 0 1 3 0 v7 l-1 7 H8 l-1-5 Z',
  // Botte : tige et semelle.
  bottes: 'M9 3 h5 v10 l4 3 v5 H8 V3 Z M8 18 H18',
  // Objet : un pendentif.
  objet: 'M7 4 a7 5 0 0 0 10 0 M12 9 v3 M12 12 a4 4 0 1 0 0 8 a4 4 0 1 0 0-8 Z',
  // Veste : col et pans.
  veste: 'M9 3 L12 6 L15 3 L19 5 L18 21 H6 L5 5 Z M12 6 V21',
  // Casque : calotte et visière.
  casque: 'M5 13 a7 7 0 0 1 14 0 v4 H5 Z M5 17 h14 M12 6 V3',
  // Pantalon : deux jambes.
  pantalon: 'M7 3 h10 l1 18 h-4 l-2-9 l-2 9 H6 Z',
  // Protection : un écu.
  protection: 'M12 3 L20 6 v6 c0 5-4 8-8 9 c-4-1-8-4-8-9 V6 Z',
};

export function SlotIcon({ slot, color }: { slot: SlotId; color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="slot-icon" aria-hidden="true">
      <path
        d={SLOT_PATHS[slot]}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ItemCard({ item, actions }: { item: Item; actions?: React.ReactNode }) {
  const p = purity(item.purity);
  const stats = itemStats(item);
  const main = slotDef(item.slot).main;
  // La puissance de la pièce, telle que la définit le jeu :
  // (niveau du laboratoire × 10) × rareté × étoiles. C'est le seul nombre qui
  // permette de comparer deux pièces d'emplacements différents.
  const power = itemPower(item.level, item.purity, item.stars ?? 0);
  const stars = item.stars ?? 0;

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
            {p.name} · labo {item.level}
            {stars > 0 && <span className="stars"> {'★'.repeat(stars)}</span>}
          </div>
          <div className="small">
            Puissance <b>{formatNum(power)}</b>
          </div>
        </div>
        <div className="item-main">
          {formatNum(stats[main] ?? 0)}
          {STATS[main].suffix}
          <span className="muted small"> {STATS[main].name}</span>
        </div>
      </div>

      <div className="subs">
        {item.subs.map((s, i) => (
          <span key={i} className="pill">
            {STATS[s.key].name} +
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
