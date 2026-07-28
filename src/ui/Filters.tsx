import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Option } from '../game/filter-options';
import { C, S } from './theme';

/**
 * Filtres partagés par la réserve et la fabrication en boucle.
 *
 * Chaque filtre est une liste de cases : on en coche autant qu'on veut, et une
 * liste vide ne filtre rien — un filtre qu'on n'a pas réglé ne doit jamais rien
 * cacher ni rien jeter.
 *
 * Il n'y a plus de menu flottant comme en web : sur un écran de téléphone, un
 * panneau qui se déplie sous le bouton évite tout recouvrement, et se ferme d'un
 * second appui.
 */
export function Dropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        style={[
          S.button,
          { paddingVertical: 6, paddingHorizontal: 10 },
          selected.length > 0 && { borderColor: C.essence },
        ]}
      >
        <Text style={[S.buttonText, S.small, selected.length > 0 && { color: C.essence }]}>
          {label}
          {selected.length > 0 ? ` · ${selected.length}` : ''} {open ? '▴' : '▾'}
        </Text>
      </Pressable>

      {open && (
        <View style={{ gap: 4, paddingLeft: 4 }}>
          <Pressable onPress={() => onChange([])}>
            <Text style={[S.muted, S.small]}>Tout décocher</Text>
          </Pressable>
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <Pressable
                key={o.value}
                onPress={() => toggle(o.value)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={{ color: on ? C.essence : C.muted, fontSize: 13 }}>
                  {on ? '☑' : '☐'}
                </Text>
                <Text style={{ color: o.color ?? C.fg, fontSize: 13 }}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
