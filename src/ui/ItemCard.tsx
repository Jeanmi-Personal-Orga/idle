import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PURITIES, STATS, purity, slotDef } from '../game/content';
import { formatNum } from '../game/engine';
import { itemPower, itemStats } from '../game/formulas';
import type { Item, SlotId } from '../game/types';
import { C, S } from './theme';

/**
 * Silhouette de l'emplacement : la forme se lit avant la couleur (§5). Huit
 * emplacements, huit silhouettes distinctes même en tout petit.
 *
 * Les tracés sont ceux de la version web ; seul le rendu change — `react-native-svg`
 * remplace le SVG du navigateur.
 */
const SLOT_PATHS: Record<SlotId, string> = {
  // Épée : lame, garde, poignée.
  arme: 'M12 2 L15 6 L13 15 H11 L9 6 Z M7 15 H17 M12 15 V21',
  // Gant : quatre doigts et le poignet.
  gants:
    'M8 11 V6 a1.5 1.5 0 0 1 3 0 v4 M11 10 V5 a1.5 1.5 0 0 1 3 0 v5 M14 10 V7 a1.5 1.5 0 0 1 3 0 v7 l-1 7 H8 l-1-5 Z',
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

export function SlotIcon({ slot, color, size = 22 }: { slot: SlotId; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={SLOT_PATHS[slot]}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Pastille d'une statistique secondaire. */
function Pill({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: color ?? C.line,
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: color ?? C.fg, fontSize: 11.5 }}>{children}</Text>
    </View>
  );
}

export function ItemCard({ item, actions }: { item: Item; actions?: ReactNode }) {
  const p = purity(item.purity);
  const stats = itemStats(item);
  const main = slotDef(item.slot).main;
  // La puissance de la pièce, telle que la définit le jeu :
  // (niveau du laboratoire × 10) × rareté × étoiles. C'est le seul nombre qui
  // permette de comparer deux pièces d'emplacements différents.
  const power = itemPower(item.level, item.purity, item.stars ?? 0);
  const stars = item.stars ?? 0;

  return (
    <View style={[S.card, { borderColor: p.color, gap: 8 }]}>
      <View style={[S.row, { alignItems: 'flex-start' }]}>
        <SlotIcon slot={item.slot} color={p.color} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: p.color, fontWeight: '700', fontSize: 14 }}>
            {slotDef(item.slot).name}
          </Text>
          <Text style={[S.muted, S.small]}>
            {p.name} · labo {item.level}
            {stars > 0 ? ` ${'★'.repeat(stars)}` : ''}
          </Text>
          <Text style={[S.text, S.small]}>
            Puissance <Text style={{ fontWeight: '700' }}>{formatNum(power)}</Text>
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[S.bold, { fontSize: 16 }]}>
            {formatNum(stats[main] ?? 0)}
            {STATS[main].suffix}
          </Text>
          <Text style={[S.muted, S.small]}>{STATS[main].name}</Text>
        </View>
      </View>

      <View style={[S.row, { flexWrap: 'wrap', gap: 6 }]}>
        {item.subs.map((s, i) => (
          <Pill key={i}>
            {STATS[s.key].name} +
            {formatNum((stats[s.key] ?? 0) - (s.key === main ? item.main.value : 0))}
            {STATS[s.key].suffix}
          </Pill>
        ))}
      </View>
      {actions ? <View style={[S.row, { gap: 8 }]}>{actions}</View> : null}
    </View>
  );
}

export function PurityLegend() {
  return (
    <View style={[S.row, { flexWrap: 'wrap', gap: 6 }]}>
      {PURITIES.map((p) => (
        <Pill key={p.id} color={p.color}>
          {p.name}
        </Pill>
      ))}
    </View>
  );
}
