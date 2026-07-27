import { useEffect, useRef, useState } from 'react';

/**
 * Filtres partagés par la réserve et la fabrication en boucle.
 *
 * Chaque filtre est un menu déroulant à cases : on en cochent autant qu'on veut,
 * et une liste vide ne filtre rien — un filtre qu'on n'a pas réglé ne doit
 * jamais rien cacher ni rien jeter.
 */

import type { Option } from '../game/filter-options';

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
  const box = useRef<HTMLDivElement>(null);

  // Un clic ailleurs referme le menu : sans ça, deux menus restent ouverts en
  // même temps et se recouvrent.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div className="dropdown" ref={box}>
      <button className={`chip ${selected.length ? 'on' : ''}`} onClick={() => setOpen(!open)}>
        {label}
        {selected.length > 0 && ` · ${selected.length}`}
        <span className="caret">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="dropdown-panel">
          <button className="ghost small" onClick={() => onChange([])}>
            Tout décocher
          </button>
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <label key={o.value} className={`check ${on ? 'on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(o.value)} />
                <span style={o.color ? { color: o.color } : undefined}>{o.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

